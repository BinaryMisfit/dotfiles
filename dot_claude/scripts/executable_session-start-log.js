#!/usr/bin/env node
"use strict";

// Session-tagged, per-step progress log for hails-session-start (added
// 2026-09-06, BinaryMisfit's own design ask). The real problem this fixes:
// a skill/playbook is instructions I read and follow, not code with an
// enforced call stack -- nothing about it guarantees a step actually ran,
// captures what happened, or lets a rerun resume where a dead session left
// off. This script is the deterministic backing store that makes those
// three things real, same pattern as day-state.js/theme-select.js/
// pick-persona.js already use elsewhere in this system: push the state
// machine into real, tested code; let the playbook stay the orchestrator
// that decides WHEN to call it and what to say about the results.
//
// Keyed by `cwd` (same primary key day-state.js and the persona registry
// use). **Deliberately NOT scoped to a calendar day** -- a real design
// mistake caught live, 2026-09-06 (BinaryMisfit's own correction): this
// file's first draft reset on a new SAST day, conflating "a day" with "a
// run." Those are different things. BinaryMisfit runs `/hails-session-start`
// multiple times in one real day (a fresh repo opened, a fresh worktree, a
// session that crashed and got reopened) -- each of those is its own run
// and deserves its own resumability, regardless of whether the calendar
// date happens to match. Conversely a single run can span past midnight and
// is still the SAME run. What actually matters is whether the LAST attempt
// for this cwd finished: a completed run means the next `--begin` starts
// clean; an incomplete one means the next `--begin` resumes exactly where
// it left off, no matter how much or little time passed in between.
// Continuity/theme/color (day-state.js, theme-select.js) are correctly
// day-scoped and stay that way -- that's a different, genuinely
// per-calendar-day concept (mood/theme "for today"), not a run-completion
// concept. Don't import this file's day-agnostic reasoning back onto those;
// they were never the same problem.
//
// Step-level granularity (Aphrodite's own addition to the design, 2026-09-06):
// tagging by run alone isn't enough -- an interrupted run needs to know
// exactly which step was live when it died, not just "this run touched
// something, skip everything." Each step reports its own outcome
// independently.
//
// Deliberately NOT a content log (Aphrodite's other addition, same day):
// `data` passed to `stepDone` is whatever the CALLER chooses to persist --
// this script never inspects or restricts it, but the convention every
// caller in this system follows is "which steps ran, not what they found."
// A private-repo read step, for instance, should call `stepDone` with
// `{ read: true }`, never the repo's actual content -- logging content here
// would make the isolation a persona's own private repo is supposed to buy
// theater. This file has no way to enforce that; it's a discipline the
// playbook has to hold, same as "never blind add -A" in Step 0.5.
//
// Four outcomes a step can report, matching the "auto-heal or stop" default
// rule BinaryMisfit set (2026-09-06): `done` (succeeded), `failed`
// (something went wrong but it's retryable -- a rerun attempts this step
// again), `blocked` (needs a human before anything past it can proceed --
// Step 0's identity mismatch is the standing example: no auto-recovery,
// ever), and the transient `in-progress` a step sits in between `stepStart`
// and its real outcome, so a run that dies mid-step is visibly distinct
// from one that never reached that step at all. A run only ever moves from
// incomplete to complete via an explicit `--complete` call once every step
// the playbook cares about has actually reported a real outcome -- this
// script has no fixed step list of its own to check that against, so
// "complete" is asserted by the caller, not inferred.
//
// NOT SAFE FOR CONCURRENT CALLS AGAINST THE SAME CWD (real gap, caught
// 2026-09-06 by Alexia while wiring this into digital-homelab's own
// playbook, before it ever shipped as a live bug): every write here is an
// unlocked read-modify-write of one shared JSON file. A playbook that
// dispatches steps as parallel agents (several repos' own Step 1.5) must
// never have those agents call `--step-start`/`--step-done` themselves --
// two processes racing the same read-modify-write can silently clobber
// each other's update. The fix is structural, not a script feature: only
// the one process actually orchestrating the run (the main session, never
// a dispatched sub-agent) calls this script, serializing every write
// through it -- same reasoning this project's own file-exclusivity rule
// already applies to parallel writes against a register file.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { resolveRealCwd } = require("./lib/normalize-cwd.js");

const LOG_PATH = path.join(os.homedir(), ".claude", "session-start-log.json");

function realCwd(cwd) {
  return resolveRealCwd(cwd);
}

function nowIso(now = new Date()) {
  return now.toISOString();
}

function readAll(logPath) {
  try {
    return JSON.parse(fs.readFileSync(logPath, "utf8"));
  } catch {
    return {};
  }
}

function writeAll(all, logPath) {
  fs.writeFileSync(logPath, JSON.stringify(all, null, 2) + "\n");
}

// Begin (or resume) a run for this cwd. If nothing's on file yet, or the
// last run on file already completed, this starts a fresh entry -- a
// finished run's own step outcomes are never carried forward into a new
// one. If the last run is still incomplete (never reached `--complete`),
// its steps are left exactly as they are (that's the resume) and only
// `sessionId`/`lastSeen` update, so a later session picking up a dead one
// doesn't erase what the first session already finished. No calendar-time
// check anywhere in this -- see the header comment. Returns
// `{ entry, resuming }` -- `resuming` is true only when an incomplete run
// already existed with at least one step recorded before this call.
// Exported for testing.
function beginRun(cwd, sessionId, now = new Date(), logPath = LOG_PATH) {
  const all = readAll(logPath);
  const key = realCwd(cwd);
  const existing = all[key];
  const resuming = !!(existing && !existing.completed && Object.keys(existing.steps).length > 0);
  const entry = resuming
    ? existing
    : { startedAt: nowIso(now), completed: false, steps: {} };
  entry.sessionId = sessionId;
  entry.lastSeen = nowIso(now);
  all[key] = entry;
  writeAll(all, logPath);
  return { entry, resuming };
}

function requireOpenRun(all, key) {
  const entry = all[key];
  if (!entry) throw new Error(`no run begun for ${key} -- call --begin first`);
  if (entry.completed) throw new Error(`the last run for ${key} already completed -- call --begin to start a new one`);
  return entry;
}

function setStep(cwd, name, fields, now, logPath) {
  if (!name || !String(name).trim()) throw new Error("a step name is required");
  const all = readAll(logPath);
  const key = realCwd(cwd);
  const entry = requireOpenRun(all, key);
  entry.steps[name] = { at: nowIso(now), ...fields };
  entry.lastSeen = nowIso(now);
  writeAll(all, logPath);
  return entry.steps[name];
}

// Exported for testing.
function stepStart(cwd, name, now = new Date(), logPath = LOG_PATH) {
  return setStep(cwd, name, { status: "in-progress" }, now, logPath);
}

// `data` is caller-chosen, opaque to this script -- see the header comment's
// "deliberately not a content log" note. Exported for testing.
function stepDone(cwd, name, data, now = new Date(), logPath = LOG_PATH) {
  const fields = { status: "done" };
  if (data !== undefined) fields.data = data;
  return setStep(cwd, name, fields, now, logPath);
}

// Retryable -- a later `--begin` resuming this same (still-incomplete) run
// still sees this step as not-done, so the playbook knows to attempt it
// again. Exported for testing.
function stepFailed(cwd, name, reason, now = new Date(), logPath = LOG_PATH) {
  const fields = { status: "failed" };
  if (reason) fields.reason = reason;
  return setStep(cwd, name, fields, now, logPath);
}

// NOT retryable by a plain rerun -- this is the outcome for a step whose own
// rule says "no auto-recovery, ever" (Step 0's identity gate is the standing
// example). A blocked step stays blocked until something explicitly moves
// it past `blocked` (a human fixes the underlying problem and the step gets
// re-run to a real `done`/`failed`) -- this script doesn't enforce that on
// its own, the playbook's own "stop the entire routine here" instruction is
// what actually holds the line; this just records that it happened.
// Exported for testing.
function stepBlocked(cwd, name, reason, now = new Date(), logPath = LOG_PATH) {
  const fields = { status: "blocked" };
  if (reason) fields.reason = reason;
  return setStep(cwd, name, fields, now, logPath);
}

// Marks the current run finished -- the ONLY thing that lets the next
// `--begin` start clean instead of resuming. Caller-asserted, not inferred
// (this script has no fixed step list to check completeness against). The
// playbook calls this once its own last real step has reported a genuine
// outcome, typically right after the closing summary. Exported for testing.
function completeRun(cwd, now = new Date(), logPath = LOG_PATH) {
  const all = readAll(logPath);
  const key = realCwd(cwd);
  const entry = requireOpenRun(all, key);
  entry.completed = true;
  entry.completedAt = nowIso(now);
  entry.lastSeen = nowIso(now);
  writeAll(all, logPath);
  return entry;
}

// Read-only: the current run for this cwd (complete or not), or null if one
// has never been begun. Exported for testing.
function getStatus(cwd, logPath = LOG_PATH) {
  const all = readAll(logPath);
  return all[realCwd(cwd)] || null;
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

  try {
    if (args.begin) {
      if (!args.session) {
        process.stderr.write('--begin requires --session "<sessionName>"\n');
        process.exitCode = 1;
        return;
      }
      const { entry, resuming } = beginRun(cwd, args.session);
      console.log(JSON.stringify({ cwd: realCwd(cwd), resuming, entry }, null, 2));
      return;
    }

    if (args["step-start"]) {
      console.log(JSON.stringify(stepStart(cwd, args["step-start"]), null, 2));
      return;
    }

    if (args["step-done"]) {
      let data;
      if (args.data !== undefined) {
        try {
          data = JSON.parse(args.data);
        } catch {
          process.stderr.write("--data must be valid JSON\n");
          process.exitCode = 1;
          return;
        }
      }
      console.log(JSON.stringify(stepDone(cwd, args["step-done"], data), null, 2));
      return;
    }

    if (args["step-failed"]) {
      console.log(JSON.stringify(stepFailed(cwd, args["step-failed"], args.reason), null, 2));
      return;
    }

    if (args["step-blocked"]) {
      console.log(JSON.stringify(stepBlocked(cwd, args["step-blocked"], args.reason), null, 2));
      return;
    }

    if (args.complete) {
      console.log(JSON.stringify(completeRun(cwd), null, 2));
      return;
    }

    if (args.status) {
      console.log(JSON.stringify({ cwd: realCwd(cwd), entry: getStatus(cwd) }, null, 2));
      return;
    }
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  process.stderr.write(
    "Usage:\n" +
      '  node session-start-log.js --begin --session "<name>" [--cwd <path>]\n' +
      '  node session-start-log.js --step-start "<name>" [--cwd <path>]\n' +
      '  node session-start-log.js --step-done "<name>" [--data \'<json>\'] [--cwd <path>]\n' +
      '  node session-start-log.js --step-failed "<name>" [--reason "..."] [--cwd <path>]\n' +
      '  node session-start-log.js --step-blocked "<name>" [--reason "..."] [--cwd <path>]\n' +
      "  node session-start-log.js --complete [--cwd <path>]\n" +
      "  node session-start-log.js --status [--cwd <path>]\n",
  );
  process.exitCode = 1;
}

module.exports = {
  beginRun,
  stepStart,
  stepDone,
  stepFailed,
  stepBlocked,
  completeRun,
  getStatus,
  realCwd,
  LOG_PATH,
};

if (require.main === module) {
  main();
}
