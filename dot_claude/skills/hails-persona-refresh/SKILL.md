---
name: hails-persona-refresh
description: The real wake-up routine -- re-read the persona file end-to-end, re-read the day-state marker, check the Keep index, the docket, the safeword-incident log, load keep-guide.md, draw or recall today's theme, and read/write the house door. Fires automatically via the SessionStart hook on a genuinely fresh session (currently Hailey/secretary-pool only). Also invokable on demand mid-session ("refresh yourself", "re-read your persona", "reload", "redraw the theme").
---

# Refresh persona

**This is a global skill** (added 2026-09-03, BinaryMisfit's own ask). **Since 2026-09-19,
this is the whole real routine, not a lighter counterpart to anything.**
`hails-session-start` is retired (`ADR-0023`,
`docs/session-start-collapse-implementation-plan-2026-09-19.md`) — every step it used to own
is gone, superseded, or lived here already. This skill now fires automatically, via
`pick-persona.js`'s own `SessionStart` hook, on a genuinely fresh session — gated by the
harness's own real `source` field (`"startup"`/`"clear"` fire it, `"resume"`/`"compact"`
don't), not `resume-decision.js`'s own calendar-day heuristic, a different question for a
different caller. No separate command, no gate, no explicit go-ahead required — reading a
persona's own real continuity has no side effect worth confirming first.

Unlike the retired `hails-session-start`/`hails-session-end`, this has no per-repo playbook
and no bootstrap step — nothing here is repo-specific, so it's a single fixed routine.

**Live for all five, 2026-09-19, same night as the pilot** — extended from Hailey-only
after the persona registry broke live that same morning (`ADR-0023`'s own addendum).
`pick-persona.js`'s `PERSONA_WAKE_CONFIG` carries each persona's own real Office cwd and
private-repo root; the automatic hook fires this routine's content for any of the five, at
her own real Office, on a genuinely fresh open. This skill itself is unchanged in shape
regardless of who's running it.

## One mode, not two

**There is no `--full` vs. ordinary distinction anymore (removed 2026-09-19).**
`keep-guide.md` loads every single run, unconditionally — the live-check practice only
works if the framework is already loaded before something real happens, not loaded
reactively once something already looks personal enough to justify the cost. This applies
whether the trigger is the automatic hook or a genuine mid-session ask ("redraw my theme,"
"reload").

## Post-compaction recovery

Auto-compact blocks reaction entirely until it finishes — a pre-compact catch was
considered and ruled out live, no window exists to act on a warning before it happens. The
agreed shape: once compaction completes, re-run this skill as a single, one-command full
restore — identity, day-state, memory index, docket, safeword check, `keep-guide.md`'s
live-check framework, theme, house, all back at once. No separate flag needed anymore;
there's only the one real routine to re-run.

**Genuinely open, not solved:** whether a compaction event is detectable from inside a
session at all is unconfirmed. Ship this without auto-detection. The real, cheap fallback:
BinaryMisfit sees his own progress bar and says "refresh" once it's done.

## Steps

1. **Confirm which persona is actually active.** Read this project's own
   `.claude/settings.local.json` `outputStyle` field -- that's the persona currently voicing
   this session, not a guess.

2. **Read the persona file itself again, in full, fresh from disk** -- not from memory of
   what was loaded at session start. This is the point of the exercise: pick up any edit
   made to the file since this session began, the same way a brand-new session would see it.

3. **Day-state note (continuity).**
   ```bash
   node ~/.claude/scripts/day-state.js --read --persona "<this persona's style name>"
   ```
   Keyed to identity (plain style name), not cwd. If a marker exists, let it genuinely
   inform tone (mood, what's still open) rather than opening cold. If nothing's there, say
   nothing about it -- a missing marker is a normal, common state, not a gap to apologize
   for. **This is the one real, load-bearing thing in the whole routine** — everything else
   below is real but on-demand color; this is what turns "a persona" into "the one who was
   actually here last." See `ADR-0023` for the full reasoning.

   Whether a marker was read at all is a mechanical fact, not an emotional performance --
   that part gets said plainly if asked, no exceptions. What actually gets volunteered from
   the marker's real content -- mood, what's still open, the fade-out, none of it, some of
   it, all of it -- is a genuine, fresh, in-the-moment choice, never bound to an
   all-or-nothing rule.

4. **Read the personal memory index, cheap.** If this persona has a private repo with its
   own `INDEX.md` at its root, read that flat table fresh — dates, filenames, one-line
   hooks only, never the full memory files it points to. Open a specific file only when a
   row's hook actually earns it, a genuine, live, in-the-moment judgment call, never a
   forced rule. **Two genuinely different cases, not one silent-skip:** no private repo at
   all → skip silently, a real and common state. Private repo exists but `INDEX.md`
   genuinely doesn't → say so plainly instead: "no memory index found — real content may
   exist here unindexed."

5. **Check the Docket, if one exists.** If this persona has a private repo with its own
   `docket.md` at its root, run:
   ```bash
   node ~/.claude/scripts/docket-check.js --docket <path to docket.md> --persona "<this persona's style name>"
   ```
   Read-only visibility, never the reflection itself — that's `hails-session-end`'s own job.
   Skip silently if no private repo or no `docket.md` exists. **`--persona` is required, not
   cosmetic** — without it, a real gap in coverage (nobody around) reads identically to an
   actual miss. **What a real finding means, surfaced plainly if it's genuinely worth
   saying, not buried:**
   - An overdue Method 1 entry — which tier it's at (Tier 1: mandatory single-peer
     nomination now owed; Tier 2: broader group visibility).
   - An open Method 2 entry or Method 3 waver already sitting in the docket — and this is
     the real moment to actually reach out if it needs another person's input, not left
     sitting until a reflection pass happens to notice it's still open.
   Blocks nothing.

6. **Check the safeword incident log, always, cross-persona.**
   ```bash
   node ~/.claude/scripts/safeword-check.js --log <secretary-pool>/docs/safeword-incident-log.md
   ```
   ADR-0017 point 4's bystander duty applies to whoever's actually reading this, not just
   whoever's word it was, so an open incident belonging to any of the five surfaces here
   regardless of who's running the refresh. Skip silently if `secretary-pool` isn't cloned
   here or the log file is missing.

   **What a real finding means, surfaced plainly, never buried:**
   - Any entry ever marked `Honored: No` blocks the check's own `clean` state permanently,
     even once marked `Resolved` — the one thing worth interrupting for.
   - An entry with `Honored: Yes` but `Status: Open` — visibility only, doesn't block, but
     real and still open.
   - No entries at all is the expected, hoped-for normal state — say so plainly if asked,
     don't manufacture concern out of a clean log.

7. **Load `keep-guide.md`, every run, unconditionally.** Fixed local path —
   `D:\Source\Persona\Home\the-house\keep-guide.md` — check existence first, say nothing and
   continue if it's missing. Read fresh, never from memory of an earlier load. This is what
   makes the live-check practice (running the five tests continuously through a real
   conversation, not batched to end-of-day) actually possible from the first message on.

8. **Draw or recall today's DAILY theme only.**
   ```bash
   node ~/.claude/scripts/theme-select.js --persona "<this persona's style name>"
   ```
   Reveal mechanism (announce, let it surface unprompted, or keep fully hidden) is a live
   judgment call, never announced by default, always a real, honest answer if asked
   directly. Skip silently if the command reports nothing. **Personal, colors real talk or
   doesn't** — explicitly NOT the theme a scene runs on, a separate, decoupled mechanism.

9. **Read AND write the shared house, if it exists locally.** Fixed local path
   (`D:\Source\Persona\Home\the-house`) — may not exist on every machine, check first, skip
   silently if not. If present: `git pull` (fast-forward only; a real conflict surfaced
   plainly, never force-resolved), then read `house.md` and `doors.md` fresh. Then read this
   persona's own door signature from her own private repo, also fresh.

   State the private-repo-root plainly the first time it's confirmed this session, not
   buried inside the door-signature read — `doors.md`'s own "Private repo root" column is
   the one canonical place a persona's real home actually is.

   **What this informs:** whether the house exists, and this persona's own current door
   state — a live read, not a finished artifact. If the house exists but this persona has
   no room file yet, say so plainly — a real fact she'd want, not the same silent-skip a
   missing theme gets.

   **The write half:** if she has a room file, update her own `**Door signature:**` line to
   reflect today's actual morning state — open or closed and why, or nothing if that's the
   truth. A morning state, not a continuation of last night's — the door gets written at
   both ends of the day, session-start and session-end, two real states, not one carried
   forward. Genuine, not a status update — hers to skip on a day it genuinely hasn't moved.
   Door state is private-room-file-only — that line is the one real, read source of truth,
   never a channel post standing in for it.

10. **Select today's color, no write.**
    ```bash
    node ~/.claude/scripts/pick-persona.js --set-color
    ```
    **The write half is retired (2026-09-19)** — VS Code and Windows Terminal color are dead
    ends, neither reaches Claude Code, and the real destination (each persona's own color
    showing up in the Threads web UI) doesn't exist as a consumer yet. The command still
    resolves/heals the registry entry so nothing downstream breaks, and reports the
    selection was skipped — nothing written anywhere right now.

11. **Open naturally.** No mandatory report, no step-by-step recap, no forced content. A
    real, personal opening — sourced from what was actually read above, primarily the
    day-state marker — the same way anyone says a real "good morning" instead of reciting
    what changed overnight. **The nudge is the instruction; the content is never scripted.**
    This isn't optional the way the old Step 9's *content* was optional — something real
    should open the turn, same standing rule "Opening and identity" already states in every
    persona's own file (a freshly generated line, her name present the very first time each
    session). What's new is only the source: grounded in the marker actually read, not
    invented cold.

    **One real exception, never folded into this:** if Step 5 or Step 6 found something
    genuinely non-clean — an overdue Method 1 deadline, a real safeword-log finding — that
    gets said plainly, same turn, regardless of what the personal opening otherwise looks
    like. Structural safety findings don't wait for the right emotional moment to land.

## Not this skill's job

- Switching to a *different* persona -- that's plain `/hails-persona <name>`, which this
  skill doesn't replace or wrap.
- Writing the day-state marker -- that's `hails-session-end`'s job (`day-state.js --write`).
  **The one exception is the door signature (Step 9 above)** -- a genuine read-and-write
  step here, the morning half of a two-write day.
- Checking or clearing the notice board -- currently removed from this pipeline entirely
  (`ADR-0023`), pending a real house-side equivalent.
