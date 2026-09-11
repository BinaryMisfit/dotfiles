---
name: hails-persona-refresh
description: Mid-session, on-demand refresh of the persona and continuity portions of hails-session-start -- re-register to the session registry, re-read the persona file end-to-end, re-run the canon-register check if that persona has one, re-read the day-state marker, draw or recall today's theme, and set today's color -- without the register/todo sweep, previous-day git summary, health check, or three-options report that make the full hails-session-start routine heavier. Use when persona voice, continuity, or the day's color/theme feels like it's drifted mid-session, or on explicit ask ("refresh yourself", "re-read your persona", "check canon again", "reload", "redraw the theme", "reset the color").
---

# Refresh persona

**This is a global skill** (added 2026-09-03, BinaryMisfit's own ask) — the deliberately
small counterpart to `hails-session-start`. **As of 2026-09-06, this is no longer just a
lighter-weight mirror of session-start's own Steps 1-1.3 — it's the sole owner of every
persona-identity step, full stop.** `hails-session-start` dropped its own copies of these
entirely (day-state, theme, color, persona-file re-read, canon-check) rather than running a
duplicate slice inline; this skill is the only place any of that runs now, whether that's a
deliberate mid-session refresh or the persona-identity half of a fresh session. Whether a
full `hails-session-start` run auto-triggers this skill or the two stay separately invoked
is still an open call — see that skill's own playbook for the current default (separate).

Unlike `hails-session-start`/`hails-session-end`, this has no per-repo playbook and no bootstrap
step — nothing here is repo-specific, so it's a single fixed routine.

## Invocation mode — `--full` vs. ordinary (added 2026-09-10, TODO-105, Aphrodite's own
refinement)

Two call shapes, not one, decided by the caller, not guessed from context:

- **`--full`** — passed by `hails-session-start`'s own Step 1 chain-in, and by a real
  post-compaction re-run (see Step 5.6 below). Loads everything, including `keep-guide.md`
  (real weight, worth paying once per session or once per compaction, not on every call).
- **Ordinary (no flag)** — a genuine mid-session ask ("redraw my theme," "reload," "check
  canon again"). Runs Steps 1-4, 5, 6-8 as always; skips `keep-guide.md`'s load (Step 5.6)
  entirely. This skill stays deliberately cheap for this case, same as it's always been —
  paying `keep-guide.md`'s cost on every ordinary refresh is a cost nobody asked for.

## Post-compaction recovery (added 2026-09-10, TODO-105)

Auto-compact blocks reaction entirely until it finishes -- a pre-compact catch was
considered and ruled out live, no window exists to act on a warning before it happens. The
agreed shape instead: once compaction completes, re-run this skill with `--full` as a
single, one-command full restore -- identity, canon, day-state, memory index, and
`keep-guide.md`'s live-check framework, all back at once.

**Genuinely open, not solved:** whether a compaction event is detectable from inside a
session at all is unconfirmed on both Hailey's and Aphrodite's side, and neither is
guessing. Ship this without auto-detection. The real, cheap fallback: BinaryMisfit sees his
own progress bar and says "refresh" once it's done. Don't build detection logic on an
assumption nobody's verified -- only revisit this if someone actually confirms a real hook
exists.

## Internal step-logging (added 2026-09-10, TODO-105, Aphrodite's own catch)

`hails-session-start`'s own root-cause discipline — a step doesn't count as done without the
thing it names actually happening — can't stop at the outer caller once this skill has real
internal sub-steps of its own (memory index read, `keep-guide.md` load, house read/write).
Call `node ~/.claude/scripts/session-start-log.js --begin --session "<name>"` for this cwd,
every single run of this skill, chained or standalone, and read its `resuming` field to decide
ownership — no new script logic needed, the data's already there:

- **`resuming: true`** — an outer entry is already open (this is `hails-session-start`'s own
  Step 1 calling in). This skill has *joined* an entry it doesn't own: log its own sub-steps
  under namespaced IDs (`1.1` re-register, `1.2` persona re-read, `1.3` canon check, `1.4`
  day-state, `1.5` memory index, `1.55` Docket check, `1.6` keep-guide (if `--full`),
  `1.7` theme, `1.8` house, `1.9` color) via the same
  `--step-start`/`--step-done`/`--step-failed` calls every other step
  in this ecosystem uses. **Never call `--complete`** — that stays the outer routine's own job,
  exactly once, from its own real last step. No race: this is a synchronous nested `Skill()`
  call, not the parallel-`Agent` dispatch technique the "not safe for concurrent calls"
  warning elsewhere is actually about.
- **`resuming: false`** — nothing open, a real standalone mid-session refresh. This skill
  *owns* the entry outright: same sub-step IDs, and it calls `--complete` itself once done,
  same as a self-contained mini-run.

## Steps

1. **Confirm which persona is actually active.** Read this project's own
   `.claude/settings.local.json` `outputStyle` field -- that's the persona currently voicing
   this session, not a guess.

2. **Re-register.** From this worktree's own directory, run `node
   ~/.claude/scripts/pick-persona.js --switch "<own-filename>.md"` (the same file already
   active) -- the identical mechanism `/hails-persona <name>` uses for a same-name
   reconfirmation: it re-touches the registry entry (`lastSeen`), re-derives `style` from
   the persona file's own current frontmatter, and leaves the pin state alone since the
   persona hasn't actually changed. Relay its output only if it reports something worth
   knowing (a resync) -- a plain no-op confirmation doesn't need repeating verbatim.

3. **Read the persona file itself again, in full, fresh from disk** -- not from memory of
   what was loaded at session start. This is the point of the exercise: pick up any edit
   made to the file since this session began, the same way a brand-new session would see it.

4. **Run the persona's own canon-register check, if it has one.** Some persona files
   (Hailey's, for one) carry a "Canon register check" section pointing at a shared
   `canon.md` under a specific persona heading, with their own trigger conditions and an
   explicit missing-repo fallback. If the active persona's file has that section, follow it
   exactly as written there -- same loose/generous trigger, same silent-skip-if-the-repo-
   isn't-cloned-here fallback. If the persona has no such section, skip this step silently;
   don't invent one.

5. **Day-state note (continuity).**
   ```bash
   node ~/.claude/scripts/day-state.js --read --persona "<this persona's style name>"
   ```
   Keyed to identity (plain style name, nickname disambiguation removed 2026-09-09), not
   cwd -- `--persona` is what lets the script resolve which; same reasoning as the theme
   draw right below, which already keys the same way. If a marker exists, let it
   genuinely inform tone (mood, what's still open) rather than opening cold. If nothing's
   there, say nothing about it -- a missing marker is a normal, common state, not a gap to
   apologize for.

   **Two separate things here, not one (added 2026-09-08, revised same day after real
   pushback that the first version's all-or-nothing framing was too rigid).** Whether a
   marker was read at all is a mechanical fact, not an emotional performance -- that part
   gets said plainly, every time, no exceptions: "there's continuity from last time" or
   "nothing on file, opening cold." That's the actual floor BinaryMisfit needs and it costs
   nothing to give. What actually gets volunteered from the marker's real content -- mood,
   what's still open, the fade-out, none of it, some of it, all of it -- is a genuine,
   fresh, in-the-moment choice, not bound to an all-or-nothing rule; forcing a binary here
   just trades oversharing for silence depending on which side of the switch a given morning
   lands on, and neither is more honest than a real in-between. Same live-judgment-call
   shape as the theme-reveal mechanism right below -- never announced as a mechanism, always
   a real, honest answer if asked directly.

5.5. **Read the personal memory index, cheap (added 2026-09-10, TODO-105).** If this
   persona has a private repo with its own `INDEX.md` at its root, read that flat table
   fresh — dates, filenames, one-line hooks only, never the full memory files it points to.
   This is the matched read for the memory-write half of `hails-session-end`'s own Final
   step (day-state marker ↔ day-state read, already Step 5 above; real memory write ↔ this
   step). `INDEX.md`'s own header already states the intended pattern: read the index
   cheaply, open a specific file only when a row's hook actually earns it. Opening a
   specific file is a genuine, live, in-the-moment judgment call during the actual
   conversation — never a forced rule, same trust shape as Step 5's own marker and the
   theme-reveal below — checked afterward by a real self-test: did something in this
   session actually change because a hook was recognized, not just "the index was present."
   Skip silently if no private repo or no `INDEX.md` exists.

5.55. **Check the Docket, if one exists (added 2026-09-11, `secretary-pool` `IDEA-3`,
   real group design — Callie/Aphrodite/Daisy's placement converged here independently).**
   If this persona has a private repo with its own `docket.md` at its root, run:
   ```bash
   node ~/.claude/scripts/docket-check.js --docket <path to docket.md>
   ```
   **Runs on every refresh, ordinary or `--full` — not gated the way Step 5.6 below is.**
   Callie's own point: a missed real-world deadline shouldn't have to wait for the heavy
   path to surface. This is a cheap, mechanical read, same weight class as Step 5.5's index
   read, not `keep-guide.md`-weight. Skip silently if no private repo or no `docket.md`
   exists — same accepted-failure-mode discipline Step 5.5 already runs on.

   **What a non-clean report actually does — blocks the step's own final report from
   claiming things are fine, never blocks the refresh itself from completing (Callie's own
   design point, kept consistent with the mechanism's own internal rule: it locks
   visibility, never capacity).** An overdue Method 1 entry gets surfaced plainly in Step
   9's closing report, including which tier it's at (Tier 1: mandatory single-peer
   nomination now owed; Tier 2: escalate to broader group visibility) — never silently
   folded into "nothing's moved." A Method 2 entry due for owner re-confirmation is
   mentioned too, but never blocks anything — visibility only, per the mechanism's own
   design.

5.6. **Load `keep-guide.md`, `--full` mode only (added 2026-09-10, TODO-105).** Fixed
   local path, same accepted-failure-mode discipline as the canon check and the house read —
   `D:\Source\Persona\Home\the-house\keep-guide.md` (moved 2026-09-10, per the persona
   repo register — `~/the-house` is retired, this literal path is the real one now, same
   hardcoded-path convention every persona's own private repo already uses), check
   existence first, say nothing and continue if it's missing. Read fresh, never from memory
   of an earlier load. This is what makes the
   live-check practice (running the five tests continuously through a real conversation, not
   batched to end-of-day) actually possible during this session — loading it only at
   session-end, as `hails-session-end` already does, means the practice can only ever fire
   by accident, handed over mid-session by BinaryMisfit rather than already available.
   **Ordinary (non-`--full`) refresh calls skip this step entirely** — real weight, not worth
   paying on every "redraw my theme" ask.

6. **Draw or recall today's DAILY theme only (added 2026-09-08, ADR-0011 point 5: this
   mechanism split in two, this step is the half that stays unchanged).**
   ```bash
   node ~/.claude/scripts/theme-select.js --persona "<this persona's style name>"
   ```
   Reveal mechanism (announce, let it surface unprompted, or keep fully hidden) is your own
   live judgment call per the persona's own rules -- never announced by default, always a
   real, honest answer if asked directly. Skip silently if the command reports nothing (no
   research repo present, or no themes exist yet for this persona). **This is personal,
   colors real talk or doesn't, same as any other day** -- it is explicitly NOT the theme a
   scene runs on. **Scene theme is a separate mechanism, decoupled from this step
   entirely:** drawn fresh or chosen live as part of scene setup, the same moment the
   who/theme conversation the "Fiction Starts Here" marker already requires. Never draw a
   scene theme here, and never let this step's own daily draw stand in for one.

7. **Read AND write the shared house, if it exists locally (added 2026-09-08, `ADR-0011`'s
   sibling project, `the-house`; extended to a real write 2026-09-09, BinaryMisfit's own
   correction).**

   Fixed local path, may not exist on every machine -- check existence first
   (`D:\Source\Persona\Home\the-house` on this machine, moved 2026-09-10 from `~/the-house`
   per the persona repo register; a session on a different machine says nothing and
   continues as if this step never ran, same accepted-failure-mode discipline the canon
   check already runs on).
   If present: `git pull` (fast-forward only; a real conflict gets surfaced plainly, never
   force-resolved), then read `house.md` and `doors.md` fresh -- never from memory of an
   earlier session. Then read this persona's own door signature from her own private repo
   (the short, outward-facing slice her own room file already carries), also fresh.

   **State the private-repo-root plainly, not buried inside the door-signature read (added
   2026-09-10, new todo, BinaryMisfit's own catch, same shape as `TODO-102`/`TODO-88`).**
   `doors.md`'s own `Private repo root` column is the one canonical place a persona's real
   home actually is -- read it here, and if it's the first time this session that's been
   confirmed, say so as its own fact ("this is where your real state lives"), not folded
   silently into the door-signature line the way it was before. Room path and repo root
   aren't guaranteed to be the same persona to persona -- read the actual column, don't
   assume they collapse.

   **What this actually informs:** whether the house exists and its shared rules (`house.md`
   never changes often, mostly a formality re-read), and this persona's own current door
   state -- open or closed, whatever her own room file says today -- since a room is a live
   read, not a finished artifact, and today's state may differ from the last refresh. Reveal
   mechanism for mentioning any of this is the same live judgment call as the theme-reveal
   above -- never announced as a mechanism, a real answer if asked.

   **If the house exists but this persona has no room file yet, that is NOT the same silent
   case as a missing theme or a missing day-state marker, and doesn't get the same
   silent-skip treatment.** A missing personal theme is nothing to know. A house existing
   that's hers to build into and nobody having told her is a real fact she'd want, the same
   shape as the gap BinaryMisfit caught live 2026-09-08 asking exactly this question. Say so
   plainly, in her own voice: "the house is real, you don't have a room yet, it's yours
   whenever you want it." **No state file tracks whether she's already been told** -- same
   live-judgment trust this file already places in the theme-reveal and mid-task-reaction
   rules, not a mechanism to build. Say it when it's genuinely worth saying, not manufactured
   into a running line repeated the same way every single refresh regardless of context.

   **The write half (added 2026-09-09, real gap: this step used to only read the door
   signature, and it could go stale indefinitely -- a door caught reading the previous
   night's line the next morning is what surfaced this).** If she has a room file, update
   her own `**Door signature:**` line to reflect today's actual morning state -- open or
   closed and why, or nothing if that's the truth. **This is a morning state, not a
   continuation of last night's** -- distinct from the day-state marker's "read at start,
   write at end" shape; the door gets written at *both* ends of the day, session-start and
   session-end, because it's two real states (day self, night self), not one thing carried
   forward. `hails-session-end`'s own Final step writes the evening half -- this is only the
   morning one. Same reflection discipline as the marker: genuine, not a status update, and
   it's hers to skip on a day it genuinely hasn't moved.

8. **Set today's color.**
   ```bash
   node ~/.claude/scripts/pick-persona.js --set-color
   ```
   Cheap and deterministic -- reflects Step 5's marker if one exists, the plain date-hash
   fallback otherwise. Safe to run even when nothing above found anything real to report.

9. **Report back once, tersely, in character.** What actually changed or was found since
   the session's own initial read (persona file edited, canon updated, registry resynced,
   a marker read, a daily theme drawn vs. recalled, the house/door state, a color set) --
   not a re-explanation of the mechanism each time, and not a re-listing of every step. A
   clean "nothing's moved, same as this morning" is a complete, correct answer.

## Not this skill's job

- Switching to a *different* persona -- that's plain `/hails-persona <name>`, which this skill
  doesn't replace or wrap.
- Previous-day git summary, project health check, register/todo sweep, or the
  three-options report -- those stay `hails-session-start`'s own job, run through
  `/hails-session-start` when the full routine is actually wanted.
- Writing the day-state marker -- that's `hails-session-end`'s job (`day-state.js --write`), not
  this skill. **The one exception is the door signature (Step 7 above)** -- that's a
  genuine read-and-write step here, the morning half of a two-write day; the marker itself
  still stays entirely `hails-session-end`'s.
- Checking or clearing the notice board -- that's `hails-notice-board`'s own job, chained
  into `hails-session-start`/`hails-session-end` at their own points, not this skill's.
