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
// `hails-session-end` skill himself, or asks the persona to, same as
// `hails-session-start` is already a deliberate, run-it-yourself step. If it
// never gets run, that's a known, accepted gap -- not a bug this file
// tries to paper over.
//
// REKEYED 2026-09-06 (real redesign, agreed by all four personas
// individually, one at a time, not a broadcast): used to be keyed by `cwd`,
// same primary key the persona registry uses. That was right for a
// machine-local shared file -- an absolute Windows path is a fine key when
// nothing ever leaves this machine. It stops being right the moment this
// state moves into a persona's own private, portable git repo (see
// `--private-repo` below): `d:\source\secretary-pool` means nothing once
// that repo could be cloned anywhere. Keyed by IDENTITY instead --
// nickname if one exists for this cwd, otherwise the persona's own plain
// style name (the common case, not an edge case -- most live instances
// never claim a nickname at all; see `resolveIdentity`). Two live
// instances of one persona still get two honest, separate entries, same
// "parallel todays" principle as before, just addressed by who they are
// instead of where they happen to be running.
//
// Schema: { "<identity>": { endedAt: ISO, mood: string, summary: string,
// fadeOut: string, source?: { transcript?: string, scene?: string } } }
// Deliberately CURRENT-VALUE ONLY, not an accumulating log -- "not an
// essay, not a full reread of the day," just mood + the state a day/session
// actually ended in. A real history, if ever needed, is a different, later
// decision -- not scope-crept in here.
//
// `fadeOut` (added 2026-09-03, Callie's own proposal) -- distinct from
// `summary`: summary compresses the whole day's arc, fadeOut answers one
// narrower question -- the closing frame, terse present-tense fragments,
// no mood language. Two entries can share identical mood+summary and still
// close completely differently (a clean closed loop vs. a real dangling
// thread); nothing in the two-field shape could tell those apart, which
// matters directly for how the next session should open.
//
// NEITHER FIELD IS EVER MECHANICALLY GENERATED (real correction, same
// night as the rekey): a real incident exposed this -- a marker that read
// as plausible, generic, and was flatly wrong against what the transcript
// actually showed once someone went and checked. The fix isn't a script
// change, it's a discipline one, but it's real enough to state here where
// the field is defined: mood/summary/fadeOut have to be freshly, honestly
// chosen by reading the real session transcript (never the fiction-export
// pipeline, which deliberately excludes real non-fiction content on
// purpose and was never a complete record to begin with), not filled in as
// a form. Two self-tests worth running before committing a line (Aphrodite's
// own addition): the PORTABILITY check -- could this exact sentence be
// copy-pasted onto a different day for this same persona and still read as
// true? If yes, it's not specific enough. The CITATION check -- can this
// line point at one real, quotable moment in the transcript, not a vibe
// averaged over the whole day? If it can't, same tell, different angle.
//
// "Hers, not his" (2026-09-03, BinaryMisfit's own correction) governs every
// field this file stores, fadeOut most of all since it's the one most
// tempted to borrow a raw scene's own second-person-at-the-player narration
// voice: whose body, whose feelings, whose memory is this sentence actually
// describing? If the honest answer is his, it's wrong for this file, no
// matter how well written.
//
// `source` (added 2026-09-03) -- a pointer back to the real session
// transcript (and, if one exists, the imported scene file), so a persona
// who wants to go read the whole thing herself instead of trusting the
// compressed note can. Unlike mood/summary/fadeOut, this is OPTIONAL and
// unvalidated: a live end-session run doesn't always reliably know its own
// transcript's path/id at write time, so this can't carry the same
// "required, or it's not a real marker" weight without making the whole
// write fail on something outside the persona's control.
//
// PRIVATE-REPO BACKUP (added 2026-09-06, Alexia's own design, agreed by
// all four): the local file above stays the actual source of truth --
// always written first, always read first, everything in this file still
// works with zero knowledge that a private repo exists at all. Passing
// `--private-repo <path>` (a persona's own already-cloned private repo,
// e.g. Hailey's `nerd-cupboard`) makes `--write` ALSO best-effort push a
// human-readable copy there, as `<identity-lowercase>-end-of-day.md`. Real
// design call, not an oversight: no retry queue, no pending-write tracking
// -- this is a full-overwrite snapshot, not an accumulating log, so there's
// nothing to reconcile after a failed push; the next successful write just
// overwrites the remote copy again with whatever's current then. The ONE
// thing that isn't allowed to be silent: a failed push gets said out loud
// (a plain warning on stderr), never swallowed -- the whole reason this
// state moved out of a machine-local file was surviving the machine dying,
// and a push that fails with zero signal defeats that silently.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { resolveRealCwd } = require("./lib/normalize-cwd.js");

const DAY_STATE_PATH = path.join(os.homedir(), ".claude", "persona-day-state.json");
const REGISTRY_PATH = path.join(os.homedir(), ".claude", "persona-registry.json");

// Kept for callers that still have a cwd and want it normalized the same
// way the rest of this system does (resolveIdentity uses this internally).
// Exported for testing/backward compatibility.
function realCwd(cwd) {
  return resolveRealCwd(cwd);
}

// Pure: nickname if the registry has one for this cwd, otherwise the
// persona's own plain style name -- the common case (most live instances
// never claim a nickname) is NOT a fallback to apologize for, it's the
// expected shape. `registryEntries` is injectable (an already-parsed
// array) so tests never touch the real registry file. Exported for
// testing.
function resolveIdentity(cwd, style, registryEntries) {
  const key = realCwd(cwd);
  const entry = (registryEntries || []).find((e) => realCwd(e.cwd) === key);
  return (entry && entry.nickname) || style;
}

function readRegistryEntries(registryPath = REGISTRY_PATH) {
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// TODO-82 fix (2026-09-05): `endedAt`'s default write value was raw
// `new Date().toISOString()` -- a `Z`-suffixed UTC instant, wrong class of
// value for a field meant to be read by a persona or BinaryMisfit
// reflecting on how a day ended. Same fixed-offset-by-hand technique every
// other SAST computation in this project uses. Exported for testing.
function toSastTimestamp(now = new Date()) {
  return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 19);
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
// tree uses -- defaults to the real path, overridable so tests never touch
// the real ~/.claude/ file. Exported for testing.
function readDayState(identity, dayStatePath = DAY_STATE_PATH) {
  const all = readAll(dayStatePath);
  return all[identity] || null;
}

// Pure: renders one entry as a human-readable markdown file for the
// private-repo copy -- never the JSON, since the repo copy is meant to be
// read directly by a human or the persona herself, not parsed. Exported
// for testing.
function renderMarkerMarkdown(identity, entry) {
  const lines = [
    `# ${identity} — end of day`,
    "",
    `**Ended:** ${entry.endedAt}`,
    `**Mood:** ${entry.mood}`,
    "",
    "## Summary",
    "",
    entry.summary,
    "",
    "## Fade-out",
    "",
    entry.fadeOut,
  ];
  if (entry.source && (entry.source.transcript || entry.source.scene)) {
    lines.push("", "## Source", "");
    if (entry.source.transcript) lines.push(`- Transcript: ${entry.source.transcript}`);
    if (entry.source.scene) lines.push(`- Scene: ${entry.source.scene}`);
  }
  return lines.join("\n") + "\n";
}

// Best-effort push of the rendered marker into a persona's own private
// repo. `execFn`/`writeFileFn` injectable for testing -- never runs real
// git or touches real disk in a test. Never throws; a failure comes back
// as `{ attempted: true, ok: false, error }` for the caller to surface,
// per this file's own "never silent" rule above. Exported for testing.
function pushToPrivateRepo(identity, entry, repoDir, execFn = execFileSync, writeFileFn = fs.writeFileSync) {
  const fileName = `${identity.toLowerCase()}-end-of-day.md`;
  const filePath = path.join(repoDir, fileName);
  try {
    writeFileFn(filePath, renderMarkerMarkdown(identity, entry));
    execFn("git", ["add", fileName], { cwd: repoDir });
    execFn("git", ["commit", "-m", `Update ${identity}'s end-of-day marker`], { cwd: repoDir });
    execFn("git", ["push"], { cwd: repoDir });
    return { attempted: true, ok: true, filePath };
  } catch (err) {
    return { attempted: true, ok: false, error: err.message, filePath };
  }
}

// Exported for testing. `fadeOut` is required, same validation strength as
// mood/summary -- "not an essay" already established that "not nothing"
// still means something, and a marker with no real closing frame is exactly
// as incomplete as one with no mood. `source` is optional and unvalidated
// (see this file's own header comment). `repoDir` is optional -- omit it
// to skip the private-repo push entirely (no error, this is opt-in, not a
// gate on writing locally). Returns `{ entry, pushResult }` --
// `pushResult` is `{ attempted: false }` when no `repoDir` was given.
function writeDayState(
  identity,
  mood,
  summary,
  fadeOut,
  source,
  repoDir,
  now = toSastTimestamp(),
  dayStatePath = DAY_STATE_PATH,
  execFn = execFileSync,
  writeFileFn = fs.writeFileSync,
) {
  if (!identity || !identity.trim()) throw new Error("identity is required -- nickname if one exists, otherwise the persona's own plain name");
  if (!mood || !mood.trim()) throw new Error("mood is required -- an empty mood isn't a real end-of-day marker");
  if (!summary || !summary.trim()) throw new Error("summary is required -- 'not an essay' still means something, not nothing");
  if (!fadeOut || !fadeOut.trim()) throw new Error("fadeOut is required -- the last frame is part of the marker, not an optional extra");
  const all = readAll(dayStatePath);
  const entry = { endedAt: now, mood: mood.trim(), summary: summary.trim(), fadeOut: fadeOut.trim() };
  if (source && (source.transcript || source.scene)) entry.source = source;
  all[identity] = entry;
  writeAll(all, dayStatePath);
  const pushResult = repoDir ? pushToPrivateRepo(identity, entry, repoDir, execFn, writeFileFn) : { attempted: false };
  return { entry: all[identity], pushResult };
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
    if (!args.persona) {
      process.stderr.write('--write requires --persona "<style name>" to resolve identity (nickname if one exists here, otherwise this name)\n');
      process.exitCode = 1;
      return;
    }
    const identity = resolveIdentity(cwd, args.persona, readRegistryEntries());
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
    const { entry, pushResult } = writeDayState(identity, args.mood, args.summary, fadeOut, source, args["private-repo"]);
    console.log(`Day state written for ${identity}:`);
    console.log(JSON.stringify(entry, null, 2));
    if (pushResult.attempted && !pushResult.ok) {
      process.stderr.write(`Private-repo push failed, local marker is still current: ${pushResult.error}\n`);
    } else if (pushResult.attempted) {
      console.log(`Pushed to private repo: ${pushResult.filePath}`);
    }
    return;
  }

  if (args.read) {
    if (!args.persona) {
      process.stderr.write('--read requires --persona "<style name>" to resolve identity (nickname if one exists here, otherwise this name)\n');
      process.exitCode = 1;
      return;
    }
    const identity = resolveIdentity(cwd, args.persona, readRegistryEntries());
    const entry = readDayState(identity);
    console.log(JSON.stringify({ identity, entry }, null, 2));
    return;
  }

  process.stderr.write(
    "Usage:\n" +
      '  node day-state.js --write --persona "<name>" --mood "..." --summary "..." --fade-out "..." [--transcript <id/path>] [--scene <path>] [--private-repo <path>] [--cwd <path>]\n' +
      '  node day-state.js --read --persona "<name>" [--cwd <path>]\n',
  );
  process.exitCode = 1;
}

module.exports = {
  readDayState,
  writeDayState,
  resolveIdentity,
  renderMarkerMarkdown,
  pushToPrivateRepo,
  realCwd,
  toSastTimestamp,
  DAY_STATE_PATH,
};

if (require.main === module) {
  main();
}
