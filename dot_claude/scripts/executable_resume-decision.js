#!/usr/bin/env node
"use strict";

// TODO-91's real fix: decides whether a terminal launch should `--continue`
// (pick back up an interrupted session, e.g. a reboot mid-scene) or start
// fresh (a genuine new day). Raised 2026-09-07 -- BinaryMisfit's own actual
// problem: an unplanned reboot/terminal restart mid-session shouldn't strand
// something in progress, but a normal new-day open shouldn't resume either.
// `pick-persona.js --switch`/its own automatic SessionStart path only ever
// touch registry bookkeeping (confirmed by direct read, 2026-09-07) -- this
// script is deliberately separate and narrow: it answers exactly one
// question, "resume or fresh," and nothing else. The actual `-c`/`--resume`
// invocation is the caller's job (a Windows Terminal launch profile), not
// this script's.
//
// The boundary is a fixed SAST clock time, NOT calendar midnight, on
// BinaryMisfit's own explicit spec (2026-09-07): he routinely works past
// midnight, so a plain date-string comparison would wrongly split a still-
// continuing late-night session into "yesterday" the instant the clock ticks
// over. A "day" here runs 6:00 AM SAST to 5:59:59 AM SAST the next morning --
// his own stated normal start time (7-8:30 AM) sits safely after it, so
// nothing from a normal working day is ever misclassified as still "today"
// once he's actually back the next morning.
//
// Decision rule: does this worktree's registry entry have a `lastSeen`
// timestamp that falls on-or-after the most recent 6 AM SAST boundary at or
// before right now? Yes -> `resume` (same logical day, likely an abrupt
// cutoff, not a deliberate close). No, or no entry at all (brand-new
// worktree, nothing to resume) -> `fresh`.
//
// Deliberately NOT used: comparing `lastSeen` against day-state's own
// end-marker timestamp (whether `hails-session-end` actually ran cleanly).
// That was this script's first design and BinaryMisfit's own review caught
// the problem with it directly: it silently assumes the end skill always
// gets run before a session closes, which isn't guaranteed -- a session that
// just closes without anyone remembering to run session-end would misread as
// "abrupt cutoff" forever. A fixed clock boundary needs nothing to have run
// correctly beforehand; it just needs the real time and the registry's
// already-tracked `lastSeen`, both of which exist unconditionally.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { resolveRealCwd } = require("./lib/normalize-cwd.js");

const registryPath = path.join(os.homedir(), ".claude", "persona-registry.json");
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY_BOUNDARY_HOUR_SAST = 6;

function resolveCwd() {
  return resolveRealCwd(process.cwd());
}

function readRegistry() {
  if (!fs.existsSync(registryPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function findEntry(entries, cwd) {
  return entries.find((e) => e.cwd === cwd) ?? null;
}

// Pure, epoch-math only -- deliberately never reads the OS's own local
// timezone or a `TZ` env var (same standing distrust every persona file's
// own "Time of day" section already documents: this machine has no
// Africa/Johannesburg tzdata, so anything relying on the system/env
// resolving SAST silently no-ops). `nowMs` is real UTC epoch millis; SAST is
// always exactly UTC+2, no DST, so a fixed +2h offset applied to the epoch
// is exact, not an approximation.
function mostRecentBoundaryMs(nowMs) {
  const sastMs = nowMs + SAST_OFFSET_MS;
  const sastDate = new Date(sastMs);
  const boundaryTodaySast = Date.UTC(
    sastDate.getUTCFullYear(),
    sastDate.getUTCMonth(),
    sastDate.getUTCDate(),
    DAY_BOUNDARY_HOUR_SAST,
    0,
    0,
    0
  );
  // If it's currently before today's own 6 AM SAST boundary (e.g. 2 AM), the
  // most recent boundary was actually yesterday's 6 AM, not today's.
  const boundarySast = sastMs >= boundaryTodaySast ? boundaryTodaySast : boundaryTodaySast - 24 * 60 * 60 * 1000;
  return boundarySast - SAST_OFFSET_MS;
}

// Pure. Exported for testing -- the only real logic in this file, everything
// else is I/O around it.
function decide(entry, nowMs) {
  if (!entry || !entry.lastSeen) return "fresh";
  const lastSeenMs = Date.parse(entry.lastSeen);
  if (Number.isNaN(lastSeenMs)) return "fresh";
  return lastSeenMs >= mostRecentBoundaryMs(nowMs) ? "resume" : "fresh";
}

function main() {
  const cwd = resolveCwd();
  const entries = readRegistry();
  const entry = findEntry(entries, cwd);
  process.stdout.write(decide(entry, Date.now()) + "\n");
}

if (require.main === module) main();

module.exports = { decide, mostRecentBoundaryMs, resolveCwd, readRegistry, findEntry };
