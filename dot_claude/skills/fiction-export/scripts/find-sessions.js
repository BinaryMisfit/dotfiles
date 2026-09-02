#!/usr/bin/env node
"use strict";

// Mechanical half of the fiction-export skill -- session discovery, SAST
// day-boundary math, persona resolution, and dedup bookkeeping. Judgment
// (which turns are actually a fiction arc, where it starts/ends) is
// deliberately NOT here -- that's the invoking Claude's own read, done in
// the skill's instructions, not a heuristic this script tries to fake.
//
// Draft build by Aphrodite (binary-dotfiles), 2026-09-02, handed to Hailey
// to own as global claude-global/ content -- reshape freely, this is a
// starting point, not a locked contract.
//
// Usage:
//   node find-sessions.js --date 2026-09-02                 # SAST day, default: today
//   node find-sessions.js --session <uuid> --project <slug>  # one explicit session
//   node find-sessions.js --mark-exported <uuid> --raw-file <path>

const fs = require("fs");
const path = require("path");
const os = require("os");

const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");
const REGISTRY_PATH = path.join(os.homedir(), ".claude", "persona-registry.json");
const DEDUP_LOG_PATH = path.join(os.homedir(), ".claude", "fiction-export-log.json");
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000; // UTC+2, no DST

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

// Reverses the known project-slug transform: "D:\Source\binary-dotfiles"
// -> "d--Source-binary-dotfiles" is ':' -> '-', '\' -> '-', lowercase only
// the drive letter. Forward direction, used to match a registry cwd to its
// project directory.
function cwdToSlug(cwd) {
  if (!cwd) return null;
  const drive = cwd[0].toLowerCase();
  const rest = cwd.slice(1).replace(/:/g, "-").replace(/\\/g, "-").replace(/\//g, "-");
  return drive + rest;
}

function readRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  } catch {
    return [];
  }
}

function readDedupLog() {
  try {
    return JSON.parse(fs.readFileSync(DEDUP_LOG_PATH, "utf8"));
  } catch {
    return { exported: {} };
  }
}

function writeDedupLog(log) {
  fs.writeFileSync(DEDUP_LOG_PATH, JSON.stringify(log, null, 2) + "\n");
}

// SAST-day boundaries expressed back in UTC, since every transcript
// timestamp is UTC. dateStr is "YYYY-MM-DD" in SAST terms.
function sastDayToUtcRange(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const startSastAsUtc = Date.UTC(y, m - 1, d, 0, 0, 0) - SAST_OFFSET_MS;
  const endSastAsUtc = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - SAST_OFFSET_MS;
  return { start: new Date(startSastAsUtc), end: new Date(endSastAsUtc) };
}

function todaySastDateStr() {
  const nowSast = new Date(Date.now() + SAST_OFFSET_MS);
  return nowSast.toISOString().slice(0, 10);
}

// Pulls first/last timestamp from a session .jsonl without loading the
// whole file into memory -- reads line by line, keeps the first valid
// timestamp seen and the last.
function getSessionTimeRange(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(Boolean);
  let first = null;
  let last = null;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.timestamp) {
        if (!first) first = obj.timestamp;
        last = obj.timestamp;
      }
    } catch {
      /* skip malformed/meta lines */
    }
  }
  return { first, last, lineCount: lines.length };
}

// Persona resolution by frequency, not exact-string matching. Tried an
// exact regex for "name: <Name>\ndescription:" (the persona file's own
// frontmatter, injected by the SessionStart hook) and for "<Name> output
// style is active" first -- both are real, present-in-file patterns, but
// their escaping varies (single vs. double-escaped \n depending on how
// many layers of JSON-stringification wrap that turn), which made exact
// matching fragile. Counting raw occurrences of each KNOWN persona name is
// simpler and more robust: the active persona's own name saturates a
// session (frontmatter, opening beat, every persona-flavor line), so
// whichever of the four names appears most is reliably the right one.
const KNOWN_PERSONAS = ["Aphrodite", "Hailey", "Alexia", "Callie"];

function resolvePersonaFromTranscript(filePath, registryPersonaFallback) {
  const content = fs.readFileSync(filePath, "utf8");
  let best = null;
  let bestCount = 0;
  for (const name of KNOWN_PERSONAS) {
    const count = (content.match(new RegExp(name, "g")) || []).length;
    if (count > bestCount) {
      bestCount = count;
      best = name;
    }
  }
  return bestCount > 0 ? best : registryPersonaFallback || null;
}

// A session whose span touches this SAST day AT ALL is included -- this is
// an OVERLAP check, not exclusive attribution. A session crossing SAST
// midnight will show up under BOTH days it touches (confirmed live,
// 2026-09-02) -- that's deliberate over-inclusion, not a bug: the dedup
// log is keyed by session ID, not by date, so exporting it once (on
// whichever day you actually process it) marks it done for good, and
// seeing it twice as a CANDIDATE across two day-queries never means it
// gets exported twice.
function findSessionFilesForDate(dateStr) {
  const { start, end } = sastDayToUtcRange(dateStr);
  const registry = readRegistry();
  const dedup = readDedupLog();
  const results = [];

  if (!fs.existsSync(PROJECTS_DIR)) return results;

  for (const projectSlug of fs.readdirSync(PROJECTS_DIR)) {
    const projectPath = path.join(PROJECTS_DIR, projectSlug);
    if (!fs.statSync(projectPath).isDirectory()) continue;

    const registryEntry = registry.find((e) => cwdToSlug(e.cwd).toLowerCase() === projectSlug.toLowerCase());

    for (const file of fs.readdirSync(projectPath)) {
      if (!file.endsWith(".jsonl")) continue;
      const filePath = path.join(projectPath, file);
      const sessionId = file.replace(/\.jsonl$/, "");
      const { first, last, lineCount } = getSessionTimeRange(filePath);
      if (!first || !last) continue;

      const firstDate = new Date(first);
      const lastDate = new Date(last);
      const overlaps = firstDate <= end && lastDate >= start;
      if (!overlaps) continue;

      results.push({
        sessionId,
        filePath,
        projectSlug,
        cwd: registryEntry ? registryEntry.cwd : null,
        persona: resolvePersonaFromTranscript(filePath, registryEntry ? registryEntry.style : null),
        firstTimestamp: first,
        lastTimestamp: last,
        lineCount,
        alreadyExported: Boolean(dedup.exported[sessionId]),
      });
    }
  }
  return results;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args["mark-exported"]) {
    const log = readDedupLog();
    log.exported[args["mark-exported"]] = {
      exportedAt: new Date().toISOString(),
      rawFile: args["raw-file"] || null,
    };
    writeDedupLog(log);
    console.log(`Marked ${args["mark-exported"]} as exported.`);
    return;
  }

  if (args.session && args.project) {
    const filePath = path.join(PROJECTS_DIR, args.project, `${args.session}.jsonl`);
    if (!fs.existsSync(filePath)) {
      console.error(`No session file found: ${filePath}`);
      process.exitCode = 1;
      return;
    }
    const registry = readRegistry();
    const registryEntry = registry.find((e) => cwdToSlug(e.cwd).toLowerCase() === args.project.toLowerCase());
    const { first, last, lineCount } = getSessionTimeRange(filePath);
    const dedup = readDedupLog();
    console.log(
      JSON.stringify(
        [
          {
            sessionId: args.session,
            filePath,
            projectSlug: args.project,
            cwd: registryEntry ? registryEntry.cwd : null,
            persona: resolvePersonaFromTranscript(filePath, registryEntry ? registryEntry.style : null),
            firstTimestamp: first,
            lastTimestamp: last,
            lineCount,
            alreadyExported: Boolean(dedup.exported[args.session]),
          },
        ],
        null,
        2,
      ),
    );
    return;
  }

  const dateStr = typeof args.date === "string" ? args.date : todaySastDateStr();
  const results = findSessionFilesForDate(dateStr);
  console.log(JSON.stringify({ dateSAST: dateStr, sessions: results }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { cwdToSlug, sastDayToUtcRange, todaySastDateStr, resolvePersonaFromTranscript };
