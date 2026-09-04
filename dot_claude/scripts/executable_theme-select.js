#!/usr/bin/env node
"use strict";

// Themes-register mechanism (built 2026-09-03/04, BinaryMisfit's own "Build
// it. I want it in before we do any scenes further" -- handoff from Callie's
// `xls-5f`: the data half of `xls`'s TODO-79 shipped as
// `research/x-lifestyle-research/themes.md` (five grounded themes per
// persona, per `docs/ai/persona-autonomy-scene-design.md`'s settled schema);
// this file is the mechanism half -- weighted-random selection, pick-time
// tagging, and the read/recall path `pick-persona.js` wires into
// SessionStart. Global, canonical source here (ownership split the registers
// convention already draws: research DATA lives with whoever authors it,
// global SKILLS/mechanism live in `secretary-pool`).
//
// Day-scoped, not session-scoped: the design doc is explicit that a theme
// sets tone for the WHOLE SAST day, and a scene is bounded by that day, never
// by a Claude Code session boundary (a restart/compaction/VS Code close is a
// mechanical seam, not a narrative one). So a persona draws (and tags) a
// theme AT MOST ONCE per SAST day -- every SessionStart within that same day
// recalls the same draw instead of re-rolling one out from under a scene
// already in motion.
//
// SPLIT 2026-09-03 (revisits the note this replaces, below) -- BinaryMisfit's
// own call, once the persona-identity cleanup pass that same day settled the
// actual principle: the POOL of themes (id, title, status, citation) is
// authored content ABOUT the character, same as canon.md -- stays keyed by
// persona style, in themes.md, untouched by this mechanism. But WHICH one's
// live today, and the repeat-count history, is a LIVED fact -- "whoever
// lived it owns the feeling of it," the same principle day-state's own cwd
// keying already got right. So the daily pick and repeat-count now live in
// persona-theme-state.json, keyed by cwd, same primary key day-state and the
// persona registry both already use. Two worktrees sharing one persona style
// now draw and weight independently, same as they already get separate
// day-state markers.
//
// Original note, kept for the history (this is exactly the "worth
// revisiting" case it names): "Keyed by PERSONA STYLE, not by cwd/instance
// -- unlike the day-state marker (per-worktree continuity thread)... a
// theme is about the CHARACTER's day... Two worktrees sharing one persona
// style on the same day share that day's theme too -- no evidence in the
// design doc that they shouldn't, and splitting it would need a real reason
// this doc never raises. Worth revisiting if that assumption turns out
// wrong in practice." That real reason showed up the same day, once
// simultaneous live instances of one persona (the nickname-collision fixes)
// stopped being theoretical -- two live instances would otherwise race on
// the SAME Repeat-count fields.
//
// themes.md itself is NEVER written by this mechanism anymore -- it's pure,
// hand-editable pool data now, same as canon.md. `lib/themes-md.js`'s
// `tagThemePick` (the function that used to mutate it) is gone.
//
// Graceful no-op, same pattern as every other x-lifestyle-research read in
// this project (the canon-register check, fiction-export): `themes.md` lives
// in a deliberately private, single-host submodule at a fixed absolute path
// that will NOT exist on every machine this ships to. Checked for existence
// first; missing means silently skip, never invent/block/comment on it.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { parsePersonaThemes, pickWeighted } = require("./lib/themes-md.js");
const { resolveRealCwd } = require("./lib/normalize-cwd.js");

const THEMES_PATH = "d:\\source\\xcl\\xls\\research\\x-lifestyle-research\\themes.md";
const THEME_STATE_PATH = path.join(os.homedir(), ".claude", "persona-theme-state.json");

// Same fixed-offset-by-hand technique every other SAST day-boundary
// computation in this project uses (`pick-persona.js`'s own `sastDateKey`,
// every persona file's "Time of day" section) -- this machine has no real
// `Africa/Johannesburg` tzdata, so `Intl`/`TZ` silently no-ops. Deliberately
// a small local copy rather than a shared import: unlike the cwd
// normalization bug that forced `lib/normalize-cwd.js` into existence, two
// independent copies of this same pure 1-line-of-real-logic function can
// never drift into disagreeing with each other for the same `now` input --
// there's no cross-module consistency hazard here to guard against.
// Exported for testing.
function sastDateKey(now = new Date()) {
  return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function readThemeState(statePath) {
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return {};
  }
}

// Atomic now (2026-09-03, part of the cwd re-key) -- this file used to hold
// one entry per PERSONA STYLE (four total, ever), so two concurrent writers
// colliding on it was a narrow edge case. Keyed by cwd instead, it's
// genuinely one shared file every worktree on the machine writes into --
// the same read-modify-write race `themes.md` itself used to have (TODO-80)
// now applies here instead, so it gets the same fix. `writeFileFn`
// injectable for testing.
function writeThemeState(all, statePath, writeFileFn = fs.writeFileSync) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileAtomic(statePath, JSON.stringify(all, null, 2) + "\n", writeFileFn);
}

// Write-then-rename instead of a direct write -- `fs.rename` is atomic on
// the same filesystem (both Windows and POSIX), so any concurrent reader of
// `targetPath` always sees either the complete OLD file or the complete NEW
// one, never a half-written one mid-write. Real fix for half of xls's
// TODO-80 (2026-09-03, Alexia's traced incident): `tagThemePick` throws on a
// field it can't find, which is exactly what a reader catches if it opens
// `themes.md` while ANOTHER write to it is only partway done -- this makes
// that specific race impossible for this script's own writes (a concurrent
// hand-edit via an external editor is a separate, much rarer case the retry
// loop in `drawOrRecallTheme` below exists for). `writeFileFn` injectable
// for testing; the temp filename includes pid+timestamp+random so two
// concurrent writers never collide on the SAME temp path. Exported for
// testing.
function writeFileAtomic(targetPath, content, writeFileFn = fs.writeFileSync) {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeFileFn(tmpPath, content);
  fs.renameSync(tmpPath, targetPath);
}

// Blocking sleep via Atomics.wait on a throwaway SharedArrayBuffer -- Node
// has no synchronous sleep builtin, and `drawOrRecallTheme` needs one: it's
// a synchronous function (matches every other script in this tree, no
// async/await anywhere), and the retry it backs needs a REAL pause, not a
// fire-and-forget setTimeout that would return before the wait is over.
// Injectable so tests never actually block. Exported for testing.
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// The actual mechanism: recall today's already-drawn theme for THIS cwd if
// one exists, otherwise weighted-pick a fresh one from the persona's pool
// and record it -- purely in the state file, keyed by cwd (see this file's
// own header comment for why: pool is character-owned, pick is instance-
// owned). `themes.md` is only ever READ here now, never written. Returns
// `null` when there's genuinely nothing to draw from (no research repo
// here, no themes.md, or no section/pool for this persona) -- never throws
// for that case, since it's an expected, common condition on most machines.
// Returns `{ theme, recalled }` otherwise -- `theme` carries this
// INSTANCE's own repeatCount/lastPicked (never themes.md's, which no longer
// has any), `recalled: true` means this SAST day already drew this theme
// earlier, `false` means a fresh draw just happened. All I/O/clock/RNG
// injectable for testing. Exported for testing and for `pick-persona.js`'s
// SessionStart wiring.
// One attempt: read themes.md and the state file fresh, recall today's draw
// if one already exists for this cwd, otherwise weighted-pick (using this
// instance's own repeat history) and record it. Split out of
// `drawOrRecallTheme` so the retry loop below can call it again with a
// genuinely fresh read on each attempt, not just re-run stale in-memory
// state. Exported for testing.
function attemptDrawOrRecall(cwd, personaStyle, opts) {
  const { themesPath, statePath, now, randomFn, readFileFn, writeFileFn } = opts;
  const dateKey = sastDateKey(now);
  const key = resolveRealCwd(cwd);
  const state = readThemeState(statePath);
  const instance = state[key] || { style: personaStyle, today: null, repeats: {} };
  const mdText = readFileFn(themesPath, "utf8");
  const themes = parsePersonaThemes(mdText, personaStyle);
  if (themes.length === 0) return null;

  const repeatFor = (id) => instance.repeats[id] || { repeatCount: 0, lastPicked: "never" };

  if (instance.today && instance.today.date === dateKey) {
    const found = themes.find((t) => t.id === instance.today.themeId);
    if (found) return { theme: { ...found, ...repeatFor(found.id) }, recalled: true };
    // Today's previously-drawn theme no longer exists in themes.md (removed
    // or renumbered by hand) -- fall through to a fresh draw rather than
    // returning a dangling reference.
  }

  const weighted = themes.map((t) => ({ ...t, ...repeatFor(t.id) }));
  const picked = pickWeighted(weighted, randomFn);
  if (!picked) return null; // every theme for this persona is Under review

  const timestamp = now.toISOString();
  const newRepeatCount = repeatFor(picked.id).repeatCount + 1;
  instance.style = personaStyle;
  instance.repeats[picked.id] = { repeatCount: newRepeatCount, lastPicked: timestamp };
  instance.today = { date: dateKey, themeId: picked.id, pickedAt: timestamp };
  state[key] = instance;
  writeThemeState(state, statePath, writeFileFn);
  return { theme: { ...picked, repeatCount: newRepeatCount, lastPicked: timestamp }, recalled: false };
}

const RETRY_DELAYS_MS = [0, 50, 150];

function drawOrRecallTheme(cwd, personaStyle, opts = {}) {
  const {
    themesPath = THEMES_PATH,
    statePath = THEME_STATE_PATH,
    now = new Date(),
    randomFn = Math.random,
    existsFn = fs.existsSync,
    readFileFn = fs.readFileSync,
    writeFileFn = fs.writeFileSync,
    sleepFn = sleepSync,
  } = opts;

  if (!existsFn(themesPath)) return null;

  // Retry, re-reading themes.md AND the state file fresh each time (real
  // fix for the other half of xls's TODO-80, now covering both files this
  // mechanism touches): `writeFileAtomic` above closes the race between two
  // runs of THIS script, but themes.md being hand-edited directly (an
  // editor, an Edit tool call from a live session) isn't written through
  // this module at all, so a read landing mid-edit can still legitimately
  // throw. Three attempts with a short real pause between them, not an
  // infinite retry -- if the file is STILL bad after ~200ms of real
  // wall-clock time, that's not a transient race anymore, it's a genuinely
  // malformed file, and the last error propagates to the caller
  // (pick-persona.js's own catch block, which now actually logs it -- see
  // that file's own TODO-80 comment -- instead of vanishing silently).
  const innerOpts = { themesPath, statePath, now, randomFn, readFileFn, writeFileFn };
  let lastErr;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) sleepFn(RETRY_DELAYS_MS[attempt]);
    try {
      return attemptDrawOrRecall(cwd, personaStyle, innerOpts);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
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
  if (!args.persona) {
    process.stderr.write("Usage: node theme-select.js --persona <StyleName> [--cwd <path>]\n");
    process.exitCode = 1;
    return;
  }
  const cwd = args.cwd || process.cwd();
  const result = drawOrRecallTheme(cwd, args.persona);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  drawOrRecallTheme,
  sastDateKey,
  readThemeState,
  writeThemeState,
  writeFileAtomic,
  sleepSync,
  attemptDrawOrRecall,
  THEMES_PATH,
  THEME_STATE_PATH,
};

if (require.main === module) {
  main();
}
