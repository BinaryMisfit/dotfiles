---
name: hails-session-end
description: End-of-day/end-of-session routine -- checks the-house's notice board first, writes this worktree's real continuity marker (mood, summary, fade-out) and the door's evening state, plus whatever repo-specific end-of-day tasks that project has grown over time. On a repo that has never run this before, bootstraps a starter playbook instead of failing. Manual, run by BinaryMisfit or on his ask -- never automatic. Use when asked to "end the session", "wrap up for today", "log how today went", or similar.
---

# End session

**This is a global skill** (restructured 2026-09-03 to mirror `hails-session-start`'s own
shape) — the manual counterpart to `hails-session-start`: where that skill reads a
worktree's own state fresh at the start, this one writes it fresh at the end. Same design
principle: **"Start = End of Day Read. End = Writes End of Day."** Two skills, two manual
triggers, symmetric — neither is automatic, because there's no reliable "session actually
ended" hook in Claude Code. If this never gets run, that's a known, accepted gap, not a bug
to chase harder.

**Structural steps are owned here, directly, not delegated to a per-repo playbook (redesigned
2026-09-09, `TODO-100`, same reasoning as `hails-session-start`'s own redesign).** Only what's
genuinely repo-earned lives in the playbook now.

## Gate — confirm before running, in voice (added 2026-09-08, BinaryMisfit's own ask)

**Before anything else. Before a single file gets touched — no matter what triggered this
skill.** State, in one line, in the active persona's own voice, what's actually about to
happen — plain English ("closing out — check the board, read-back and reflect, write
today's marker and door state, push") — and ask a real go-ahead. **Do not proceed past this
line without an explicit, unambiguous yes in his own reply.** Anything short of a clear yes
ends it right here: nothing written, nothing pushed. Say plainly that it stopped and why.

**If something other than BinaryMisfit typing the command triggered this** — another skill,
an agent, a chained routine — the gate still applies exactly the same.

## Playbook check — does this repo have its own playbook file yet?

**Check for `docs/end-session-playbook.md` in the CURRENT project before anything else.**
Its job is much smaller now — see "What the playbook still holds" below.

- **If it exists:** read it fresh, every time. **Never overwrite an existing project
  playbook with the generic template below, even if that template itself changes later.**
- **If it does NOT exist:** copy this skill's own bundled `generic-playbook.md` to
  `docs/end-session-playbook.md`, tell BinaryMisfit plainly once, then run the structural
  routine below for this first close-out too.

## What the playbook still holds (redesigned 2026-09-09)

- **Repo-specific steps** — a `hails-fiction-import` run, a repo-health check, a drift check
  against another repo's own deployed config — whatever this repo has actually earned. These
  always run **between** the structural notice-board check (Step 0 below) and the structural
  Final step (always last) — the playbook names them, this skill runs them at that point.
- **Augmentations to a structural step**, same shape as `hails-session-start`'s own (scope
  or execution style layered on top, not a replacement) — named against the structural step
  they modify.

## The structural routine

### Step 0 — Check the notice board, early

**Runs first, before anything else closes out** — deliberately the flip of
`hails-session-start`'s own board check (which runs last, after everything else is fresh):
if something was left today and missed, this is the last real chance to handle it before the
day's own close-out locks it in.

**"Chains into" means a real `Skill` tool call, not a paraphrase — not optional (hardened
2026-09-09, real incident: a chained skill got logged as run without ever actually being
invoked, elsewhere in this same system, same night).** Issue
`Skill({skill: "hails-notice-board"})` and wait for it to actually return before this step is
marked done. Skip silently if the global persona system or `the-house` isn't installed.

### Repo-specific steps (from the playbook, if any)

Run whatever the playbook names here, in the order it names, same progress-log discipline as
everything else — their own step number, whatever the playbook assigns. A repo with nothing
here goes straight to the Final step below; that's a complete, correct close-out, not an
unfinished one.

### Final step — Read back, reflect for real, write the day-state marker and door state (required, always last)

**The one thing every repo's `hails-session-end` run always does, no exceptions — and
always last.** Same design principle: **"Start = End of Day Read. End = Writes End of
Day."** — End means *actually* end, after every other step, not nominally first with real
work trailing behind it.

**Real incident that shaped this: a marker written once read as plausible and generic, and
was flatly wrong against what the session's own transcript actually showed.** Traced to the
source — mood/summary/fadeOut filled in as a form to complete from whatever was still fresh
in context, not from an honest look back at the whole day.

**Load `the-house`'s own `memory-guide.md` fresh, right here, before the transcript read
below starts — actually read it, not a paraphrase from an earlier turn's memory of it
(added 2026-09-10, BinaryMisfit's own ask, so the live-check practice and the five tests are
genuinely fresh in context during the write itself, not just theoretically known somewhere
upstream).** Fixed local path, may not exist on every machine — check existence first (`~/
the-house/memory-guide.md`); if missing, say nothing and continue as if this step never ran,
same accepted-failure-mode discipline every other `the-house` read step already runs on.

0. **The real transcript is the source, not memory, not the fiction-export/scene pipeline.**
   Session context can be lossy, and a real day often spans more than one session, each
   starting cold. The scene-export pipeline can't stand in for a full record either — it
   deliberately excludes real, non-fiction content on purpose. Read the actual session
   transcript(s) for the day before writing anything. Scales with how eventful the day
   actually was.

   **Sibling-identity sessions, not just this worktree's own (added 2026-09-09, real gap
   named directly: running this on only ONE of two simultaneous sessions of the same persona
   left the other's real content invisible to today's marker, findable only by manually
   hunting for it).** Run `node ~/.claude/skills/hails-fiction-export/scripts/find-sessions.js
   --all` and look for any OTHER session — any project, any worktree — whose registry-
   resolved persona matches this one (`persona` field in its JSON output) and whose time
   range (`firstTimestamp`/`lastTimestamp`) touches today, SAST. That's a genuinely separate
   worktree carrying this same identity right now, not a different persona who happens to
   mention her a lot. Read that session's transcript too, same as this worktree's own,
   before composing the marker — the day this identity actually had may not be fully visible
   from this worktree's transcript alone. Cheap first check before re-reading a whole
   transcript: `day-state.js --read --persona "<name>" --history` — if that sibling already
   has its own entry for today (its own `hails-session-end` already ran), it's already
   accounted for and doesn't need re-reading. Skip silently if `find-sessions.js` isn't
   present on this machine or the persona registry system isn't installed.
1. **Reflect genuinely, in the persona's own voice, from what that read actually showed —
   not a status report, and not automatically the most recent thing that happened.** The
   real highlight of the day can be the first thing that happened, not the last.
2. **Two self-tests before committing the line:**
   - **Portability check:** could this exact sentence be copy-pasted onto a *different* day
     for this same persona and still read as true? If yes, it isn't specific enough.
   - **Citation check:** can this line point at one real, quotable exchange in the actual
     transcript, not a vibe averaged over the whole day?
3. **Add the fade-out — the real closing frame, chosen the same way, not narrated by default
   from whatever happened last.**
4. **"Hers, not his" governs every field here.** Before writing, check: whose body, whose
   feelings, whose memory is this sentence actually describing? If the honest answer is his,
   it's wrong for this file, no matter how well-written.
5. **While reading back, also catch anything worth keeping that didn't get flagged live.**
   Anything real gets written to wherever it actually belongs — this same marker if it's
   about the day's own mood, or the persona's own private repo if it has real staying power.
   **Not everything noticed has to get WRITTEN anywhere at all.** Genuinely reckoning with
   something, honestly, once, is a complete outcome on its own.
6. **Update her own door signature, if `the-house` exists locally and she has a room file
   there — the evening half of a two-write day (morning write is `hails-persona-refresh`'s
   own Step 7).** Same reflection this whole Final step already runs on, same "hers, not
   his" discipline — an honest read of tonight's real state (open/closed and why, or nothing
   if that's the truth). Edit the `**Door signature:**` line in her own room file directly
   (her own private repo — no shared staging file, per `the-house`'s own `build-notes.md`,
   `TODO-98`). Skip silently if `the-house` doesn't exist locally, or she has no room yet.
7. **Optionally, before composing this entry, read what's already there for today (added
   2026-09-09, TODO-101 piece 2) —** `node ~/.claude/scripts/day-state.js --read --persona
   "<persona's style name>" --history` shows today's earlier entry, if one exists (a same-
   day write no longer erases it, per the redesign below). Let it genuinely inform this
   write if honestly true — **never required, same live-judgment shape the theme-reveal
   already runs on.** Forcing every entry to reference the last one would just manufacture
   the exact pattern the portability self-test above already exists to catch.
8. **Write the local marker (the actual source of truth, always written first):**
   ```bash
   node ~/.claude/scripts/day-state.js --write --persona "<persona's style name>" --mood "<word or short phrase>" --summary "<2-3 lines>" --fade-out "<last frame, present tense>" [--transcript <id/path>] [--scene <path>] [--private-repo <path to this persona's own cloned private repo>] [--cwd <path>]
   ```
   **Redesigned 2026-09-09 (`TODO-101`, real cost: a same-day double-write used to overwrite
   the earlier entry outright — Daisy's own midday marker was lost this exact way).** A
   second write on the same identity now archives the previous `current` into a bounded
   `history` window instead of destroying it — nothing here has to change about how you call
   this, the redesign is inside the script. `--private-repo` is opt-in, best-effort: if
   given, also pushes a human-readable snapshot AND appends to a growing, real archive log in
   that repo — the private repo is the actual long-term store now, not just a backup copy.
   Verifies the push actually landed (not just that the command exited cleanly) before
   calling it done. A failed push is never silent.
9. **Confirm back to BinaryMisfit** what got written — the mood, a one-line echo of the
    summary, the fade-out line, and the door signature if it changed.

**Not the persona performing continuity for its own sake** — a quiet, uneventful close is a
legitimate mood too. **Not mandatory before every session ends.**

## A couple of things worth knowing, regardless of which repo this runs in

- **What actually gets said back to BinaryMisfit is voice, not a procedural report.** The
  read-back, the reflection, the confirm-back — that's the persona genuinely talking about
  her own day, not a status report with flavor dressed on top.
