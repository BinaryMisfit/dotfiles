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
// Method 2 (dateless, event-forced decisions): periodic re-confirmation,
// owner-only, same cadence `keep-guide.md`'s own spot-check rotation
// already uses -- once a real calendar month. Never a deadline in disguise;
// the teeth here are visibility, not compulsion. Staleness is visible
// passively (Raised -> now, always shown), not tracked by a separate
// mechanism -- same shape a stale todo already reads as stale without a
// forcing function.
//
// Entry format, `docket.md`, one `##` heading per entry:
//   ## DOCKET-<n>: <short title>
//   Method: 1 | 2
//   Status: Open | Closed
//   Raised: YYYY-MM-DD
//   Touched: YYYY-MM-DD
//   Deadline: YYYY-MM-DD        (Method 1 only)
//   Misses: <integer>            (Method 1 only, defaults to 0)
//
// Never mutates `docket.md` itself -- this is a read/report tool, same as
// `session-start-log.js`'s own read side. Writing an entry (raising one,
// closing one, re-dating one, bumping `Misses`) stays a real, deliberate
// edit made by the persona herself, same self-authorship discipline as
// everything else in her own private repo.

const fs = require("fs");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STALE_AFTER_DAYS = 30; // keep-guide.md's own spot-check cadence

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
    const ageDays = entry.raised ? daysBetween(entry.raised, now) : null;
    const daysSinceTouched = entry.touched ? daysBetween(entry.touched, now) : ageDays;
    const due = daysSinceTouched !== null && daysSinceTouched >= STALE_AFTER_DAYS;
    return {
      ...entry,
      verdict: due ? "due-for-reconfirm" : "active",
      ageDays,
      daysSinceTouched,
      reason: due
        ? `${daysSinceTouched} days since last touched -- owner-only re-confirm: still open, still real, still waiting on the same event, or not?`
        : undefined,
    };
  }

  return { ...entry, verdict: "invalid", reason: `Unrecognized Method: ${entry.method}` };
}

// Pure: evaluates every entry, returns the full report plus a single
// `clean` boolean -- the thing `hails-persona-refresh` actually wires
// against. `clean` is false if ANY open Method 1 entry is overdue; a
// Method 2 entry being due-for-reconfirm does NOT block clean (visibility,
// not compulsion -- per this file's own header). Exported for testing.
function evaluateDocket(content, now = new Date()) {
  const entries = parseDocket(content).map((e) => evaluateEntry(e, now));
  const overdue = entries.filter((e) => e.verdict === "overdue-nominate" || e.verdict === "overdue-escalate");
  const dueForReconfirm = entries.filter((e) => e.verdict === "due-for-reconfirm");
  const escalations = entries.filter((e) => e.verdict === "overdue-escalate");
  return {
    entries,
    clean: overdue.length === 0,
    overdue,
    dueForReconfirm,
    escalations,
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
  if (report.dueForReconfirm.length > 0) {
    lines.push(`Docket: ${report.dueForReconfirm.length} Method-2 entr${report.dueForReconfirm.length === 1 ? "y" : "ies"} due for owner re-confirmation (visibility only, does not block):`);
    for (const e of report.dueForReconfirm) {
      lines.push(`  - ${e.id} (${e.title}): raised ${e.ageDays} days ago, ${e.reason}`);
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
  STALE_AFTER_DAYS,
};

if (require.main === module) {
  main();
}
