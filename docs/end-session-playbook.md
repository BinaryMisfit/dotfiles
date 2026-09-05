# End-of-day playbook (generic starter)

Auto-copied into this repo's `docs/end-session-playbook.md` on the `end-session` skill's
first run here, because no project-specific playbook existed yet. **This file is now this
repo's own** — edit it freely as this project's real end-of-day needs emerge; a later
change to the generic template this was copied from will never overwrite it, and nothing
here needs to stay in sync with any other repo's copy. Same relationship `session-start`'s
own generic template already has to its own per-repo copies — mirrored deliberately
(2026-09-03, BinaryMisfit's own design call), not a coincidence.

**The marker write is always the LAST step, no exceptions (structural rule, added
2026-09-05, BinaryMisfit's own explicit correction).** Every other step this repo ever adds
— a health check, anything at all — goes **before** it, never after. This reverses the
original shape of this file, on purpose: the marker write used to be Step 1, with
repo-specific steps added below it, and that ordering is exactly what caused a real
incident (2026-09-05, secretary-pool's own `docs/fiction-pipeline-issues-register.md`
PIPE-2) — a marker got written before that day's real content had actually been imported,
so it was sourced from a lower-fidelity fallback instead of the real thing. Writing the
marker *after* everything else means it can actually reflect what the day really was, not
a guess made before the day's own record existed yet.

**Aphrodite's first real earned steps, added 2026-09-05** (mirroring `xls`'s and
secretary-pool's own worked examples — see either's `docs/end-session-playbook.md` for the
fuller version of this reasoning): her own fiction, same as any other persona's, needs
export/import run at her own end-session per ADR-0006, "persona-owned fiction pipeline"
(secretary-pool's `docs/adr/0006-persona-owned-fiction-pipeline.md` — not vendored in this
repo, cited by number and title only) — "each persona runs her own export and import,
end-to-end, at her own end-session," not a batch pass anyone else runs for her later.

## Step 1 — Export today's fiction, if any happened this session

Export is the automatic, mechanical half — find what happened, stage it, no judgment
calls, safe to run every close-out.

1. Invoke the `hails-fiction-export` skill directly, using its own default scope — the
   whole SAST day, every project under `~/.claude/projects/`, not just this session. Dedup
   is keyed by session ID in one shared log, machine-wide — safe and idempotent to run from
   any persona's session, any day, even redundantly. It stages, unedited, under
   `~/.claude/fiction-export-staging/<Persona>/` — it never writes into
   `research/x-lifestyle-research` itself and never invents or embellishes anything. Per
   ADR-0006: it captures the whole session as one continuous unit, never trims a scene
   boundary itself.
2. If nothing fictional happened anywhere today, it says so and stops — that's a complete,
   correct outcome, not a failure.
3. Confirm back to BinaryMisfit what got staged (or that nothing did).

## Step 2 — Import what was just staged (required, chained to Step 1)

1. **Confirm `x-lifestyle-research` actually exists before doing anything** —
   `d:\source\xcl\xls\research\x-lifestyle-research`. If it's missing (different machine,
   not cloned here), say so plainly and stop; don't fabricate or skip silently.
2. Invoke the `hails-fiction-import` skill directly. It processes everything genuinely
   staged and not yet imported, cross-checked against `import-register.md` automatically.
   Per ADR-0006: this produces a reviewable draft and stops at custodian clearance (Callie,
   or Aphrodite's own nominated reviewer for Callie's own scenes) — it does not
   archive/index/commit straight through. The marker write below only ever sources from
   content that's actually cleared and archived, never from a draft still awaiting
   clearance.

**Standing permission to stop partway — not a failure, BinaryMisfit's own explicit ask.**
`hails-fiction-import`'s canon/theme-detection steps are real cognitive labor, landing at
the most tired point of a session by design. The mechanical half (archive, index) may run
and then stop deliberately, marking that run's register row `Partial` — without that
counting as an incomplete close-out. The deferred judgment gets picked up fresh, another
day. **Whatever state this step lands in when the session actually closes is what the
marker write below sources from — it never waits for a `Partial` row to resolve first.**

## Repo-specific steps — add your own ABOVE Step 2, never below it

**This is where any further binary-dotfiles-specific end-of-day work goes**, once it's
actually earned a place here — a chezmoi-drift check, a repo-health check, whatever this
repo actually grows over time. If added, it becomes the new Step 1 or 2 and everything
below is renumbered — the marker write stays the true final step, unconditionally.

## Final step — Write the day-state marker (required, always last)

**The one thing every end-session run always does here, no exceptions.** Same design
principle BinaryMisfit set directly, 2026-09-03: **"Start = End of Day Read. End = Writes
End of Day."**

1. **Reflect genuinely, in the persona's own voice, not a status report.** What's the
   actual mood this session/day is ending on — one word or a short phrase, chosen the way
   she'd choose it, not a mechanical summary tag. Then 2-3 real lines on the state things
   are actually in: what happened that matters, what's unresolved, what she'd want to
   remember walking back in tomorrow.
2. **Add the fade-out — the literal last physical frame, not a narrated ending.** Distinct
   from the summary above: summary compresses the whole day's arc, this answers one
   narrower question — what's the exact state to resume from, and is anything left
   unresolved? Terse present-tense fragments, physical facts only, no mood language.
3. **"Hers, not his" governs every field here (2026-09-03, BinaryMisfit's own correction).**
   A raw scene transcript narrates in second-person address to the player ("you hear...
   before you fall asleep") — that convention must never bleed into `mood`, `summary`, or
   `fadeOut`. Before writing, check: whose body, whose feelings, whose memory is this
   sentence actually describing? If the honest answer is his, it's wrong for this file, no
   matter how well-written.
4. **Write it:**

   ```bash
   node ~/.claude/scripts/day-state.js --write --mood "<word or short phrase>" --summary "<2-3 lines>" --fade-out "<last frame, present tense>" [--transcript <id/path>] [--scene <path>] [--cwd <path>]
   ```

   `--transcript`/`--scene` are optional — a pointer back to the real session transcript
   (and, if one exists, an imported scene file) if you actually know it at write time,
   never required. `--cwd` defaults to the current worktree.
5. **Confirm back to BinaryMisfit** what got written — the mood, a one-line echo of the
   summary, and the fade-out line — so it's visible, not just filed silently.

**Not a transcript, not an essay** — "not an essay, not a full reread of the day" already
covers `mood`/`summary`; the same discipline applies to `fadeOut`. **Not the persona
performing continuity for its own sake** — a quiet, uneventful close is a legitimate mood
too, say so plainly rather than manufacturing weight that isn't there. **Not mandatory
before every session ends** — run this whole skill when BinaryMisfit asks, or when the
persona genuinely has something worth carrying forward and offers to.
