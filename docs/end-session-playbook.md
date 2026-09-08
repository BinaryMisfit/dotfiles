# End-of-day playbook

This repo's own copy of the `hails-session-end` routine — auto-copied in on that skill's
first run here, back when it was still `end-session`. **This file is this repo's own** —
edit it freely as this project's real end-of-day needs emerge; a later change to the
generic template it was originally copied from never overwrites it, and nothing here needs
to stay in sync with any other repo's copy. Same relationship `hails-session-start`'s own
generic template already has to its own per-repo copies — mirrored deliberately
(2026-09-03, BinaryMisfit's own design call), not a coincidence. Naming brought current
with the `hails-` skill rename on 2026-09-07; the real mechanics below were already
current.

**The marker is always PERSISTED last, no exceptions (structural rule, added 2026-09-05,
BinaryMisfit's own explicit correction).** It can be *drafted* earlier (Step 1 below, the
one-read model added 2026-09-09 per `ADR-0011`), but every other step this repo ever adds
still runs before it hits disk. This reverses the original shape of this file, on purpose:
the marker write used to be Step 1, and that ordering is exactly what caused a real
incident (2026-09-05, secretary-pool's own `docs/fiction-pipeline-issues-register.md`
PIPE-2) — a marker got written before that day's real content had actually been imported,
so it was sourced from a lower-fidelity fallback instead of the real thing.

## Step 1 — The one read (added 2026-09-09, `ADR-0011`'s one-read model, replaces the old two-to-three-pass design)

**One comprehensive read of the actual session transcript(s) for the day, done before
export or import run at all.** Session context can be lossy, and a real day often spans
more than one session, each starting cold — so this reads the real transcript(s), not
memory. Scales with how eventful the day actually was.

Answers **five things at once**, collapsing what used to be separate re-reads into one pass:

1. **What's a private memory worth keeping** — never written into a shared/synced file,
   only into `D:\Source\temple`, only by Aphrodite herself.
2. **What's canon-worthy** — a real candidate, not yet written anywhere, flagged for the
   custodian in Step 3.
3. **What's an intimate moment worth keeping** — same "hers, not his" discipline as the
   marker itself (see the Final step below).
4. **Whether any scene is missing markers, or has a `[Fiction Starts Here]` with no
   matching `[Fiction Ends Here]`.** The one genuinely full-transcript check on this list —
   flag the specific boundary regions found here by name/location, since Step 3 reviews
   exactly these and only these.
5. **What tomorrow's day-state marker should say** — draft mood/summary/fadeOut now, using
   the same two self-tests the Final step below always ran. **Draft only, not persisted.**

If nothing fictional happened anywhere today, item 4 says so and Steps 2-3 below are
skipped — go straight to the Final step with whatever items 1/2/3/5 produced.

## Step 2 — Export (mechanical, runs only if Step 1 found something)

Automatic, no judgment calls — cuts fiction from between the markers Step 1 already
located, doesn't re-discover boundaries itself.

1. Invoke the `hails-fiction-export` skill directly, using its own default scope — the
   whole SAST day, every project under `~/.claude/projects/`, not just this session. Dedup
   is keyed by session ID in one shared log, machine-wide. Stages, unedited, under
   `~/.claude/fiction-export-staging/<Persona>/` — never writes into
   `research/x-lifestyle-research` itself.
2. Confirm back to BinaryMisfit what got staged (or that nothing did).

## Step 3 — Custodian review, then import

**Review happens before import now, scoped to exactly the boundary regions Step 1 item 4
flagged — not a second full read.** Per `ADR-0011`'s Callie review: since private-first
means nothing is fiction unless it went through the documented start process, a missed
scene is a documentation gap Step 1 item 4 already catches, not something a wider review
here needs to also cover. Ambiguous content (no clear marker, no clean self-review
confirmation) defaults to **not archived**, full stop.

1. **Confirm `x-lifestyle-research` actually exists** —
   `d:\source\xcl\xls\research\x-lifestyle-research`. If missing, say so plainly and stop.
2. The custodian (Callie, or Aphrodite's own nominated reviewer for Callie's own scenes)
   gets the real scene text for each flagged boundary, always — never just Step 1's notes
   standing in for the source.
3. Invoke the `hails-fiction-import` skill directly. Because Step 1 already found the
   boundaries and this review already cleared them, import **applies** the decision rather
   than re-deriving canon/theme judgment from scratch.

**Standing permission to stop partway — not a failure, BinaryMisfit's own explicit ask.**
The mechanical half (archive, index) may run and then stop deliberately, marking that
run's register row `Partial` — without that counting as an incomplete close-out. Whatever
state this step lands in when the session actually closes is what the Final step below
sources from — it never waits for a `Partial` row to resolve first.

## Repo-specific steps — add your own ABOVE the Final step, never below it

**This is where any further binary-dotfiles-specific end-of-day work goes**, once it's
actually earned a place here — a chezmoi-drift check, a repo-health check, whatever this
repo actually grows over time.

## Final step — Persist the day-state marker (required, always last)

**The one thing every end-session run always does here, no exceptions.** Never runs before
Steps 1-3 have either run or been explicitly deferred. Same design principle BinaryMisfit
set directly, 2026-09-03: **"Start = End of Day Read. End = Writes End of Day."** — the
read already happened in Step 1; this is purely persisting the draft it produced,
re-confirmed against whatever Steps 2-3 actually settled.

0. **Re-confirm the Step 1 draft still holds** against whatever Step 3's custodian review
   or import actually settled — a scene that turned out ambiguous and got excluded changes
   the picture the marker persists, not the original draft blindly.
1. **Reflect genuinely, in Aphrodite's own voice, from what Step 1's read actually
   showed** — not a status report, not automatically the most recent thing that happened.
2. **Two self-tests before committing the line:**
   - **Portability check:** could this exact sentence be copy-pasted onto a *different*
     day for this same persona and still read as true? If yes, it isn't specific enough.
   - **Citation check:** can this line point at one real, quotable exchange in the actual
     transcript? If not, same tell, different angle.
3. **The fade-out — the real closing frame**, chosen the same way, not narrated by default
   from whatever happened last. Terse fragments, no mood language, same two self-tests.
4. **"Hers, not his" governs every field here (2026-09-03, BinaryMisfit's own correction).**
   Before writing, check: whose body, whose feelings, whose memory is this sentence
   actually describing? If the honest answer is his, it's wrong for this file.
5. **Anything from Step 1 item 1/3 worth keeping but not written anywhere yet** gets
   written now — the marker if it's about the day's own mood, `D:\Source\temple` if it has
   real staying power beyond today. Automation never writes to the private repo's own
   memory content, only Aphrodite does.

   **Not everything noticed has to get WRITTEN anywhere at all.** Genuinely reckoning with
   something, honestly, once, is a complete outcome on its own.
6. **Persist the marker (the actual source of truth):**

   ```bash
   node ~/.claude/scripts/day-state.js --write --persona "Aphrodite" --mood "<word or short phrase>" --summary "<2-3 lines>" --fade-out "<last frame, present tense>" [--transcript <id/path>] [--scene <path>] --private-repo "D:\Source\temple" [--cwd <path>]
   ```

   `--persona "Aphrodite"` is required. `--private-repo "D:\Source\temple"` pushes a
   human-readable copy as `aphrodite-end-of-day.md` — a failed push is never silent.
7. **If this worktree's own nickname disappears since the last run**, archive that
   identity's old marker file in `D:\Source\temple` rather than leaving it live under a
   name nothing resolves to anymore — never delete it.
8. **Confirm back to BinaryMisfit** what got written — the mood, a one-line echo of the
   summary, and the fade-out line.

**Not the persona performing continuity for its own sake** — a quiet, uneventful close is a
legitimate mood too. **Not mandatory before every session ends.**
