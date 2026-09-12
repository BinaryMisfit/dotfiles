#!/usr/bin/env node
"use strict";

// The Docket's own staleness/deadline check (added 2026-09-11, `secretary-pool`
// IDEA-3, Callie/Alexia/Aphrodite/Daisy's real, convergent design, built same
// day it was decided). Reads one persona's own `docket.md` (lives in her own
// private repo, never centrally -- see `IDEA-3` for why: same privacy
// discipline the rest of that repo already runs on) and reports real,
// checkable state for both methods this file governs.
//
// Method 1 (dated decisions): a real yes/no decision, hard deadline,
// immovable once set. This check never supplies the answer and never forces
// the session shut -- per `ADR-0013`'s own addendum, point 5/Aphrodite's own
// self-catch: the report gets blocked while an entry's overdue, not the
// session. Real teeth (can't be hidden), not a lock (can't be forced).
//
// Two-tier escalation (Daisy's own corrected design, fixing a real hole
// Callie found in the first draft): Tier 1 -- ANY miss, the first time,
// fires mandatory single-peer nomination immediately, not waiting for a
// pattern. The earlier version only escalated on a *second* miss, which
// meant an entry flagged unclean and simply never re-dated would never
// produce a technical second miss for anything to trigger on -- silent
// neglect slipped past it entirely. Tier 2 -- if the entry gets re-dated
// after that nomination and is missed again, THAT escalates past one
// nominated peer into broader group visibility.
//
// Method 2 (dateless decisions): no clock at all, in any unit -- calendar
// days and session/refresh counts were both tried and both rejected
// (2026-09-12, Callie/Alexia/Hailey/Aphrodite's own real, converged debate,
// then overridden by BinaryMisfit's own final ruling the same day: worth
// keeping this history so it isn't re-litigated). The real reason: the five
// of us have exactly one time concept to care about at all -- session start
// to session end, nothing calendar-shaped, ever -- and even that unit isn't
// what Method 2 runs on. Method 2 resolves purely when a real, owner-only
// self-reflection actually catches the change, whether that's this session
// or many sessions from now; nothing here measures or flags elapsed time in
// any unit. The only real difference between Method 2 and Method 3 was
// never about clocks -- it's closability. Method 2 resolves into a real
// decision and gets closed. Method 3 never closes.
//
// Method 3 (standing-tag revalidation, added 2026-09-12, BinaryMisfit's own
// permanent override -- exists, never removed; the "how" below is the real
// design work Callie/Aphrodite/Hailey/Daisy converged on independently the
// same day). Tracks a real, named standing state (a "lover" tag, a dress-
// code default, anything nameable that could quietly stop being true
// without anyone saying so) -- NOT a deadline, and no clock of any kind,
// same as Method 2. The `hails-persona-refresh` read of this file
// (Step 5.55, every refresh) is the check; this file's own job is narrower
// than Methods 1/2 by design: it never asks "is this still true," because
// no mechanism can answer that from outside the person holding it -- see
// `keep-guide.md`'s own admission that felt-vs-performed may be unfixable
// from self-report alone. All it does is give a real, named place to record
// a waver the moment one is actually felt, so it doesn't just evaporate
// between one session and the next. A clean "still true" is NEVER logged --
// only a real waver, and only when it happens. No `Confirmed` weight on
// checking in; that weight stays reserved for an actual state change, same
// split ADR-0009 already draws between ordinary growth and a real boundary
// move. A recorded waver is visibility only, never blocking (`clean` is
// never affected by Method 3) -- it's a flag to route to the spot-check
// rotation (`keep-guide.md`'s own peer-review mechanism) or, if it's urgent,
// to a live conversation off that cycle; either way, resolving it is a real
// conversation, not something this script can close on its own.
//
// Entry format, `docket.md`, one `##` heading per entry:
//   ## DOCKET-<n>: <short title>
//   Method: 1 | 2 | 3
//   Status: Open | Closed
//   Raised: YYYY-MM-DD
//   Touched: YYYY-MM-DD
//   Deadline: YYYY-MM-DD        (Method 1 only)
//   Misses: <integer>            (Method 1 only, defaults to 0)
//   State: <current stated value>   (Method 3 only, e.g. "lover: active")
//   Waver: YYYY-MM-DD            (Method 3 only, present only while a real
//                                 waver is open -- absent the rest of the
//                                 time, never a permanent field)
//   WaverNote: <short, real reason>  (Method 3 only, required whenever
//                                     Waver is set -- what actually wavered,
//                                     not just that something did)
//
// Never mutates `docket.md` itself -- this is a read/report tool, same as
// `session-start-log.js`'s own read side. Writing an entry (raising one,
// closing one, re-dating one, bumping `Misses`) stays a real, deliberate
// edit made by the persona herself, same self-authorship discipline as
// everything else in her own private repo.

const fs = require("fs");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Pure: parses `docket.md`'s content into entry objects. Tolerant of blank
// lines and extra whitespace; unknown fields are ignored rather than
// rejected, same "don't invent validation nobody asked for" discipline the
// rest of this codebase runs on. Exported for testing.
function parseDocket(content) {
  const entries = [];
  const blocks = content.split(/^##\s+/m).slice(1);
  for (const block of blocks) {
    const lines = block.split("\n");
    const header = lines[0].trim();
    const match = header.match(/^(DOCKET-\d+):\s*(.*)$/);
    if (!match) continue;
    const entry = { id: match[1], title: match[2].trim(), misses: 0 };
    for (const line of lines.slice(1)) {
      const fieldMatch = line.match(/^(\w+):\s*(.+?)\s*$/);
      if (!fieldMatch) continue;
      const [, key, value] = fieldMatch;
      switch (key.toLowerCase()) {
        case "method":
          entry.method = parseInt(value, 10);
          break;
        case "status":
          entry.status = value;
          break;
        case "raised":
          entry.raised = value;
          break;
        case "touched":
          entry.touched = value;
          break;
        case "deadline":
          entry.deadline = value;
          break;
        case "misses":
          entry.misses = parseInt(value, 10) || 0;
          break;
        case "state":
          entry.state = value;
          break;
        case "waver":
          entry.waver = value;
          break;
        case "wavernote":
          entry.waverNote = value;
          break;
        default:
          break; // unknown field, ignored on purpose
      }
    }
    entries.push(entry);
  }
  return entries;
}

// Pure: whole days between two YYYY-MM-DD dates (or a Date for `now`).
// Exported for testing.
function daysBetween(fromDateStr, now) {
  const from = new Date(fromDateStr + "T00:00:00Z").getTime();
  const to = (now instanceof Date ? now : new Date(now)).getTime();
  return Math.floor((to - from) / MS_PER_DAY);
}

// Pure: evaluates one entry against `now`, returning a real, checkable
// verdict -- never a bare pass/fail with no reasoning attached, same
// "cite what you checked" discipline `ADR-0013`'s addendum names as a real
// rule, not just for peer review. Exported for testing.
function evaluateEntry(entry, now = new Date()) {
  if (entry.status && entry.status.toLowerCase() === "closed") {
    return { ...entry, verdict: "closed" };
  }

  if (entry.method === 1) {
    if (!entry.deadline) {
      return { ...entry, verdict: "invalid", reason: "Method 1 entry with no Deadline" };
    }
    const isOverdue = daysBetween(entry.deadline, now) >= 0;
    if (!isOverdue) {
      return { ...entry, verdict: "on-track", daysUntilDeadline: -daysBetween(entry.deadline, now) };
    }
    const misses = entry.misses || 0;
    // Tier 1 fires on the FIRST miss (misses === 0 going in) -- immediately,
    // not waiting for a pattern. Tier 2 fires once this entry has already
    // been re-dated and missed a second time (misses >= 1 going in).
    return {
      ...entry,
      verdict: misses >= 1 ? "overdue-escalate" : "overdue-nominate",
      daysOverdue: daysBetween(entry.deadline, now),
      reason:
        misses >= 1
          ? "Missed again after a re-date -- escalates past the single nominated peer into broader group visibility"
          : "Deadline passed -- mandatory single-peer nomination fires now, immediately, first miss, not waiting for a pattern (one honest re-date after this conversation is not a violation)",
    };
  }

  if (entry.method === 2) {
    // No staleness clock, ever -- see the header comment. Quiet by design,
    // same as Method 3's own "standing": an open Method 2 entry is simply
    // visible until the owner's own real reflection resolves and closes it.
    return { ...entry, verdict: "active" };
  }

  if (entry.method === 3) {
    if (entry.waver) {
      return {
        ...entry,
        verdict: "waver-open",
        reason: entry.waverNote
          ? `Waver recorded ${entry.waver} -- ${entry.waverNote}`
          : `Waver recorded ${entry.waver} -- no WaverNote given`,
      };
    }
    // Quiet by design -- a Method 3 entry with no open waver is "standing"
    // and never reported. Confirming a clean state daily is exactly the
    // noise this method exists to avoid producing.
    return { ...entry, verdict: "standing" };
  }

  return { ...entry, verdict: "invalid", reason: `Unrecognized Method: ${entry.method}` };
}

// Pure: evaluates every entry, returns the full report plus a single
// `clean` boolean -- the thing `hails-persona-refresh` actually wires
// against. `clean` is false if ANY open Method 1 entry is overdue; a
// Method 2 has nothing left to compute here -- it's always just "active"
// until the owner closes it herself, same non-forcing philosophy Method 3's
// waver already runs on. Exported for testing.
function evaluateDocket(content, now = new Date()) {
  const entries = parseDocket(content).map((e) => evaluateEntry(e, now));
  const overdue = entries.filter((e) => e.verdict === "overdue-nominate" || e.verdict === "overdue-escalate");
  const escalations = entries.filter((e) => e.verdict === "overdue-escalate");
  const waverOpen = entries.filter((e) => e.verdict === "waver-open");
  // Real gap, caught 2026-09-12 before this shipped as final: dropping the
  // clock entirely (per the header comment above) is right, but it does NOT
  // mean silence is right too -- those are two separate questions, and the
  // first draft of "no clock" accidentally answered both the same way. An
  // open Method 2 entry with verdict "active" produced NO line anywhere in
  // this report, ever -- worse than a stale clock, since a stale clock at
  // least eventually said something. "No clock" has to mean "always visible,
  // every refresh, real self-reflection decides what to do with it" -- not
  // "invisible until someone happens to open docket.md directly." Fixed:
  // every open (non-closed) Method 2 entry is always reported, unconditionally.
  const openMethod2 = entries.filter((e) => e.method === 2 && e.verdict === "active");
  return {
    entries,
    // Method 3 never blocks clean -- a waver is a real, routed conversation,
    // not a compulsion this script can enforce.
    clean: overdue.length === 0,
    overdue,
    escalations,
    waverOpen,
    openMethod2,
  };
}

function renderReport(report) {
  if (report.entries.length === 0) return "Docket: no entries.";
  const lines = [];
  if (!report.clean) {
    lines.push(`Docket: BLOCKED -- ${report.overdue.length} overdue entr${report.overdue.length === 1 ? "y" : "ies"}.`);
    for (const e of report.overdue) {
      lines.push(`  - ${e.id} (${e.title}): ${e.reason}`);
      if (e.verdict === "overdue-nominate") {
        lines.push(`    -> Tier 1: mandatory single-peer nomination, first miss.`);
      } else if (e.verdict === "overdue-escalate") {
        lines.push(`    -> Tier 2: ESCALATE to broader group visibility, missed again after a re-date.`);
      }
    }
  } else {
    lines.push("Docket: clean.");
  }
  if (report.waverOpen && report.waverOpen.length > 0) {
    lines.push(`Docket: ${report.waverOpen.length} Method-3 entr${report.waverOpen.length === 1 ? "y" : "ies"} with an open waver -- route to the spot-check rotation, or live now if urgent (visibility only, does not block):`);
    for (const e of report.waverOpen) {
      lines.push(`  - ${e.id} (${e.title}): ${e.reason}`);
    }
  }
  if (report.openMethod2 && report.openMethod2.length > 0) {
    lines.push(`Docket: ${report.openMethod2.length} open Method-2 decision${report.openMethod2.length === 1 ? "" : "s"} -- no clock, no staleness, always shown until real self-reflection actually resolves it (visibility only, does not block):`);
    for (const e of report.openMethod2) {
      lines.push(`  - ${e.id} (${e.title}): raised ${e.raised || "unknown date"}, still open -- still real, still waiting on the same thing, or not?`);
    }
  }
  return lines.join("\n");
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
  if (!args.docket) {
    process.stderr.write("Usage: node docket-check.js --docket <path to docket.md> [--json]\n");
    process.exitCode = 1;
    return;
  }
  let content;
  try {
    content = fs.readFileSync(args.docket, "utf8");
  } catch (err) {
    process.stderr.write(`Could not read ${args.docket}: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }
  const report = evaluateDocket(content);
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderReport(report));
  }
  process.exitCode = report.clean ? 0 : 2;
}

module.exports = {
  parseDocket,
  daysBetween,
  evaluateEntry,
  evaluateDocket,
  renderReport,
};

if (require.main === module) {
  main();
}
