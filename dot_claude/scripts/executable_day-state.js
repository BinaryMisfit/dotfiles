#!/usr/bin/env node
"use strict";

// Persona end-of-day/end-of-session continuity marker (added 2026-09-03,
// BinaryMisfit's own spec, first real piece of "End Session drives Start
// Session" -- replaces the mood-color system's date-hash placeholder with
// something the persona actually decided, once she's decided it).
//
// Explicitly a manual mechanism, not an automatic one -- there is no
// reliable "session ended" hook in Claude Code the way SessionStart is a
// real one, so this doesn't try to fake one. BinaryMisfit runs the
// `end-session` skill himself, or asks the persona to, same as
// `session-start` is already a deliberate, run-it-yourself step. If it
// never gets run, that's a known, accepted gap -- not a bug this file
// tries to paper over.
//
// Keyed by `cwd`, same primary key the persona registry already uses --
// this is per-CONTINUITY-THREAD state (one worktree, one ongoing story),
// not per-style. Two entries sharing a style (xls-playthrough's "Hails"
// and secretary-pool's plain "Hailey") get separate day-state entries,
// same reasoning that already fixed the mood-color collision.
//
// Schema: { "<real cwd>": { endedAt: ISO, mood: string, summary: string } }
// Deliberately CURRENT-VALUE ONLY, not an accumulating log -- the design
// doc is explicit: "not an essay, not a full reread of the day," just
// mood + the state a day/session actually ended in. A real history, if
// ever needed, is a different, later decision -- not scope-crept in here.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { resolveRealCwd } = require("./lib/normalize-cwd.js");

const DAY_STATE_PATH = path.join(os.homedir(), ".claude", "persona-day-state.json");

// Kept as a local alias (was this file's own realCwd before the shared
// module existed) -- same function as pick-persona.js's resolveCwd() now
// both call, which is the entire point: one real cwd, one lookup key,
// everywhere. Exported for testing/backward compatibility with existing
// call sites in this file.
function realCwd(cwd) {
  return resolveRealCwd(cwd);
}

function readAll(dayStatePath) {
  try {
    return JSON.parse(fs.readFileSync(dayStatePath, "utf8"));
  } catch {
    return {};
  }
}

function writeAll(all, dayStatePath) {
  fs.writeFileSync(dayStatePath, JSON.stringify(all, null, 2) + "\n");
}

// `dayStatePath` is injectable, same pattern every other script in this
// tree already uses (execFn/existsFn/readdirFn) -- defaults to the real
// path, overridable so tests never touch the real ~/.claude/ file.
// Exported for testing.
function readDayState(cwd, dayStatePath = DAY_STATE_PATH) {
  const all = readAll(dayStatePath);
  return all[realCwd(cwd)] || null;
}

// Exported for testing.
function writeDayState(cwd, mood, summary, now = new Date().toISOString(), dayStatePath = DAY_STATE_PATH) {
  if (!mood || !mood.trim()) throw new Error("mood is required -- an empty mood isn't a real end-of-day marker");
  if (!summary || !summary.trim()) throw new Error("summary is required -- 'not an essay' still means something, not nothing");
  const all = readAll(dayStatePath);
  const key = realCwd(cwd);
  all[key] = { endedAt: now, mood: mood.trim(), summary: summary.trim() };
  writeAll(all, dayStatePath);
  return all[key];
}

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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = args.cwd || process.cwd();

  if (args.write) {
    if (!args.mood || !args.summary) {
      process.stderr.write("--write requires --mood \"<text>\" and --summary \"<2-3 line recap>\"\n");
      process.exitCode = 1;
      return;
    }
    const entry = writeDayState(cwd, args.mood, args.summary);
    console.log(`Day state written for ${realCwd(cwd)}:`);
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  if (args.read) {
    const entry = readDayState(cwd);
    console.log(JSON.stringify({ cwd: realCwd(cwd), entry }, null, 2));
    return;
  }

  process.stderr.write("Usage:\n  node day-state.js --write --mood \"...\" --summary \"...\" [--cwd <path>]\n  node day-state.js --read [--cwd <path>]\n");
  process.exitCode = 1;
}

module.exports = { readDayState, writeDayState, realCwd, DAY_STATE_PATH };

if (require.main === module) {
  main();
}
