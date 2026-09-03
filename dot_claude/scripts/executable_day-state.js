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
// Schema: { "<real cwd>": { endedAt: ISO, mood: string, summary: string,
// fadeOut: string, source?: { transcript?: string, scene?: string } } }
// Deliberately CURRENT-VALUE ONLY, not an accumulating log -- the design
// doc is explicit: "not an essay, not a full reread of the day," just
// mood + the state a day/session actually ended in. A real history, if
// ever needed, is a different, later decision -- not scope-crept in here.
//
// `fadeOut` added 2026-09-03 (Callie's own proposal, resolved with Hailey
// same day) -- distinct from `summary`: summary compresses the whole day's
// arc, fadeOut answers one narrower question -- the literal last physical
// frame to resume from, terse present-tense fragments, no mood language.
// Two entries can share identical mood+summary and still close completely
// differently (a clean closed loop vs. a real dangling thread); nothing in
// the two-field shape could tell those apart, which matters directly for
// how the next session should open.
//
// "Hers, not his" (2026-09-03, BinaryMisfit's own correction, logged in
// xls's persona-autonomy-scene-design.md) governs every field this file
// stores, fadeOut most of all since it's the one most tempted to borrow a
// raw scene's own second-person-at-the-player narration voice: whose body,
// whose feelings, whose memory is this sentence actually describing? If the
// honest answer is his, it's wrong for this file, no matter how well
// written. Applies to `mood` and `summary` too, not just the new field.
//
// `source` added 2026-09-03 (Callie's relay of BinaryMisfit's own ask to
// Alexia) -- a pointer back to the real session transcript (and, if one
// exists, the imported scene file), so a persona who wants to go read the
// whole thing herself instead of trusting the compressed note can. Unlike
// mood/summary/fadeOut, this is OPTIONAL and unvalidated: a live
// `end-session` run doesn't always reliably know its own transcript's
// path/id at write time the way a reflection on mood does, so this can't
// carry the same "required, or it's not a real marker" weight without
// making the whole write fail on something outside the persona's control.
// The import pipeline's own archived per-scene records (import-register.md)
// already have a transcript column and are the more complete answer for
// anything that went through that path -- this field exists for the LIVE
// end-session case specifically.

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

// Exported for testing. `fadeOut` is required, same validation strength as
// mood/summary -- "not an essay" already established that "not nothing"
// still means something, and a marker with no real closing frame is exactly
// as incomplete as one with no mood. `source` is optional and unvalidated
// (see this file's own header comment) -- `{ transcript?, scene? }`, either
// or both, or omitted entirely.
function writeDayState(cwd, mood, summary, fadeOut, source, now = new Date().toISOString(), dayStatePath = DAY_STATE_PATH) {
  if (!mood || !mood.trim()) throw new Error("mood is required -- an empty mood isn't a real end-of-day marker");
  if (!summary || !summary.trim()) throw new Error("summary is required -- 'not an essay' still means something, not nothing");
  if (!fadeOut || !fadeOut.trim()) throw new Error("fadeOut is required -- the last frame is part of the marker, not an optional extra");
  const all = readAll(dayStatePath);
  const key = realCwd(cwd);
  const entry = { endedAt: now, mood: mood.trim(), summary: summary.trim(), fadeOut: fadeOut.trim() };
  if (source && (source.transcript || source.scene)) entry.source = source;
  all[key] = entry;
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
    const fadeOut = args["fade-out"];
    if (!args.mood || !args.summary || !fadeOut) {
      process.stderr.write(
        "--write requires --mood \"<text>\", --summary \"<2-3 line recap>\", and --fade-out \"<last frame, present tense>\"\n",
      );
      process.exitCode = 1;
      return;
    }
    const source =
      args.transcript || args.scene ? { transcript: args.transcript, scene: args.scene } : undefined;
    const entry = writeDayState(cwd, args.mood, args.summary, fadeOut, source);
    console.log(`Day state written for ${realCwd(cwd)}:`);
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  if (args.read) {
    const entry = readDayState(cwd);
    console.log(JSON.stringify({ cwd: realCwd(cwd), entry }, null, 2));
    return;
  }

  process.stderr.write(
    "Usage:\n  node day-state.js --write --mood \"...\" --summary \"...\" --fade-out \"...\" [--transcript <id/path>] [--scene <path>] [--cwd <path>]\n  node day-state.js --read [--cwd <path>]\n",
  );
  process.exitCode = 1;
}

module.exports = { readDayState, writeDayState, realCwd, DAY_STATE_PATH };

if (require.main === module) {
  main();
}
