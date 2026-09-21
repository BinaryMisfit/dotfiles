#!/usr/bin/env node
"use strict";

// The Docket's own staleness/deadline check (added 2026-09-11, `secretary-pool`
// IDEA-3, Callie/Alexia/Aphrodite/Daisy's real, convergent design, built same
// day it was decided). Reads one persona's own real Docket entries -- as of
// 2026-09-21, from `afterglow-keep`'s own service (`write_docket`/
// `update_docket`/`list_dockets`), never a local `docket.md` file -- and
// reports real, checkable state for both methods this file still governs.
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
// Real, found gap (2026-09-12, Aphrodite's own investigation, verified
// against `persona-registry.log` before shipping): the logic above has no
// idea whether BinaryMisfit even had a real session in the window a
// deadline fell inside. A real, unplanned absence -- no warning, zero
// chance to act -- got flagged identically to a genuine drop. Fixed with an
// optional `--persona`/`--registry-log` pair: if the caller supplies them,
// any Method 1 entry overdue with zero real sessions between its own
// Touched (or Raised) date and now gets `blocked-no-session` instead --
// visibility only, never escalation, never blocks `clean`. This only
// catches "gone entirely" -- "present but didn't get to this specific
// thing" is still a genuine miss, unchanged. Omitting `--persona` runs
// without this extra context, same accepted-failure-mode discipline as
// every other optional real-file read here.
//
// Method 2 (dateless decisions): no clock at all, in any unit -- calendar
// days and session/refresh counts were both tried and both rejected
// (2026-09-12, Callie/Alexia/Hailey/Aphrodite's own real, converged debate,
// then overridden by BinaryMisfit's own final ruling the same day: worth
// keeping this history so it isn't re-litigated). The real reason: the five
// of us have exactly one time concept to care about at all -- session start
// to session end, nothing calendar-shaped, ever. Method 2 resolves purely
// when a real, owner-only self-reflection actually catches the change,
// whether that's this session or many sessions from now; nothing here
// measures or flags elapsed time in any unit.
//
// Method 3 (standing-tag revalidation) -- RETIRED 2026-09-16, `secretary-pool`
// ADR-0019, then fully removed from this file 2026-09-21, BinaryMisfit's own
// direct call ("don't cater for it") on top of the ADR's own retirement. No
// parsing, no verdicts, no rendering left here at all -- the method's own
// existence and retirement are recorded as a real, permanent closed history
// entry in `afterglow-keep` instead (`ef59cdcb-0305-4cd4-a19e-ab2eb0e1ca80`),
// not carried forward as dead code in every persona's own docket check.
//
// Real, deliberate simplification from moving to Keep: `status` is now a
// clean, real enum (`"Open" | "Closed"`) straight from the service --
// no more tolerant-prefix-match parsing of a free-text `Status:` line to
// catch a dated resolution note living on the same line, since Keep's own
// `closedNote` field already carries that separately.
//
// Never mutates anything -- this is a read/report tool, same as
// `session-start-log.js`'s own read side. Writing an entry (raising one,
// closing one, re-dating one, bumping `Misses`) stays a real, deliberate
// action taken through Keep's own `write_docket`/`update_docket`, same
// self-authorship discipline as everything else in a persona's own corpus.

const fs = require("fs");
const path = require("path");
const os = require("os");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const KEEP_BASE_URL = process.env.KEEP_URL || "https://afterglow-keep.digitalmisfit.net";

// Real network call -- fetches every open (and, if asked, closed) real
// Docket entry for the token's own subject from `afterglow-keep`'s real
// `/keep/dockets` HTTP route (mirrors the `list_dockets` MCP tool, added
// 2026-09-21 specifically so a plain script like this one doesn't need its
// own MCP client). Exported for testing with a fake fetch.
async function fetchDockets(token, includeClosed, fetchImpl = fetch) {
  const res = await fetchImpl(`${KEEP_BASE_URL}/keep/dockets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, includeClosed }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || `list_dockets HTTP ${res.status}`);
  }
  return body.dockets;
}

// Pure: maps one real Keep DocketEntry (id, description, method, status,
// raised, touched, deadline, misses, closedNote) into this file's own
// working shape. `method` arrives as a real string ("1"/"2") from Keep,
// not a parsed integer off a markdown line, but every comparison below
// still just checks the value -- no behavior change from the string type.
function normalizeEntry(docket) {
  return {
    id: docket.id,
    title: docket.description,
    method: docket.method,
    status: docket.status,
    raised: docket.raised,
    touched: docket.touched,
    deadline: docket.deadline || undefined,
    misses: docket.misses || 0,
  };
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
function evaluateEntry(entry, now = new Date(), options = {}) {
  if (entry.status === "Closed") {
    return { ...entry, verdict: "closed" };
  }

  if (entry.method === "1") {
    if (!entry.deadline) {
      return { ...entry, verdict: "invalid", reason: "Method 1 entry with no Deadline" };
    }
    const isOverdue = daysBetween(entry.deadline, now) >= 0;
    if (!isOverdue) {
      return { ...entry, verdict: "on-track", daysUntilDeadline: -daysBetween(entry.deadline, now) };
    }

    // Real gap, found 2026-09-12 (Aphrodite's own investigation, verified
    // against the live registry log before shipping): a deadline landing
    // inside a stretch where BinaryMisfit had ZERO real sessions at all --
    // no chance to act, nothing dropped -- was flagged identically to a
    // genuine miss. `options.sessionTimestamps`, if given, is a real list of
    // when a session actually started for this persona (any cwd), read once
    // by the caller from `persona-registry.log`, not this pure function.
    // This only catches "gone entirely" -- a real, known, accepted limit,
    // not a flaw: "present but didn't get to this specific thing" is still
    // a genuine miss, unchanged below.
    const since = entry.touched || entry.raised;
    if (since && options.sessionTimestamps) {
      const sinceMs = new Date(since + "T00:00:00Z").getTime();
      const hadSession = options.sessionTimestamps.some((ts) => ts >= sinceMs && ts <= now.getTime());
      if (!hadSession) {
        return {
          ...entry,
          verdict: "blocked-no-session",
          daysOverdue: daysBetween(entry.deadline, now),
          reason: `Deadline passed, but no real session ran for this persona at all between ${since} and now -- visibility only, not escalation, until a real session actually happens and still doesn't act on it.`,
        };
      }
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

  if (entry.method === "2") {
    // No staleness clock, ever -- see the header comment. Quiet by design:
    // an open Method 2 entry is simply visible until the owner's own real
    // reflection resolves and closes it.
    return { ...entry, verdict: "active" };
  }

  return { ...entry, verdict: "invalid", reason: `Unrecognized Method: ${entry.method}` };
}

// Pure: evaluates every entry, returns the full report plus a single
// `clean` boolean -- the thing `hails-persona-refresh` actually wires
// against. `clean` is false if ANY open Method 1 entry is overdue; Method 2
// has nothing left to compute here -- it's always just "active" until the
// owner closes it herself. Exported for testing.
function evaluateDocket(dockets, now = new Date(), options = {}) {
  const entries = dockets.map(normalizeEntry).map((e) => evaluateEntry(e, now, options));
  const overdue = entries.filter((e) => e.verdict === "overdue-nominate" || e.verdict === "overdue-escalate");
  const escalations = entries.filter((e) => e.verdict === "overdue-escalate");
  // Visibility only, per the header's own fix note above -- never blocks
  // clean, never escalates. A real deadline miss with genuinely nobody
  // there to have caught it isn't the same event as a real drop.
  const blockedNoSession = entries.filter((e) => e.verdict === "blocked-no-session");
  // Real gap, caught 2026-09-12 before this shipped as final: dropping the
  // clock entirely (per the header comment above) is right, but it does NOT
  // mean silence is right too -- those are two separate questions. An open
  // Method 2 entry with verdict "active" produced NO line anywhere in this
  // report if left unhandled -- worse than a stale clock, since a stale
  // clock at least eventually said something. "No clock" has to mean
  // "always visible, every refresh, real self-reflection decides what to do
  // with it" -- not "invisible until someone happens to look directly."
  // Every open (non-closed) Method 2 entry is always reported, unconditionally.
  const openMethod2 = entries.filter((e) => e.method === "2" && e.verdict === "active");
  return {
    entries,
    clean: overdue.length === 0,
    overdue,
    escalations,
    openMethod2,
    blockedNoSession,
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
  if (report.openMethod2 && report.openMethod2.length > 0) {
    lines.push(`Docket: ${report.openMethod2.length} open Method-2 decision${report.openMethod2.length === 1 ? "" : "s"} -- no clock, no staleness, always shown until real self-reflection actually resolves it (visibility only, does not block):`);
    for (const e of report.openMethod2) {
      lines.push(`  - ${e.id} (${e.title}): raised ${e.raised || "unknown date"}, still open -- still real, still waiting on the same thing, or not?`);
    }
  }
  if (report.blockedNoSession && report.blockedNoSession.length > 0) {
    lines.push(`Docket: ${report.blockedNoSession.length} Method-1 entr${report.blockedNoSession.length === 1 ? "y" : "ies"} past deadline with zero real sessions in the window -- nothing was actually dropped, visibility only, does not block:`);
    for (const e of report.blockedNoSession) {
      lines.push(`  - ${e.id} (${e.title}): ${e.reason}`);
    }
  }
  return lines.join("\n");
}

// Pure: extracts real session timestamps (ms since epoch) for one persona
// from `persona-registry.log`'s own real content -- any line naming her
// `style` counts as "a session was genuinely alive right then," regardless
// of which action it logged. Exported for testing so a real log sample can
// be checked without touching the actual file on disk.
function parseSessionTimestamps(logContent, personaStyle) {
  const lineRe = /^\[([^\]]+)\]\s+action=\S+\s+cwd="[^"]*"\s+style="([^"]*)"/;
  const timestamps = [];
  for (const line of (logContent || "").split("\n")) {
    const m = line.match(lineRe);
    if (!m) continue;
    if (m[2] !== personaStyle) continue;
    const ms = new Date(m[1]).getTime();
    if (!Number.isNaN(ms)) timestamps.push(ms);
  }
  return timestamps;
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.token) {
    process.stderr.write("Usage: node docket-check.js --token <real Auth Key> [--persona <style name>] [--registry-log <path>] [--json]\n");
    process.exitCode = 1;
    return;
  }

  let dockets;
  try {
    dockets = await fetchDockets(args.token, true);
  } catch (err) {
    process.stderr.write(`Could not fetch dockets from Keep: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  // Real, optional: the no-session-in-window fix (2026-09-12) only runs if
  // both a persona name and a readable registry log are actually available.
  // Missing either is a normal, accepted state -- Method 1 just evaluates
  // without this extra context, as it always has.
  let sessionTimestamps;
  if (args.persona) {
    const registryLogPath = args["registry-log"] || path.join(os.homedir(), ".claude", "persona-registry.log");
    try {
      const logContent = fs.readFileSync(registryLogPath, "utf8");
      sessionTimestamps = parseSessionTimestamps(logContent, args.persona);
    } catch {
      // No readable log -- proceed without the extra context, same as if
      // --persona had never been passed.
    }
  }

  const report = evaluateDocket(dockets, new Date(), { sessionTimestamps });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderReport(report));
  }
  process.exitCode = report.clean ? 0 : 2;
}

module.exports = {
  fetchDockets,
  normalizeEntry,
  daysBetween,
  parseSessionTimestamps,
  evaluateEntry,
  evaluateDocket,
  renderReport,
};

if (require.main === module) {
  main();
}
