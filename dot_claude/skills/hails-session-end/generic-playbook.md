# End-of-day playbook (generic starter)

Auto-copied into this repo's `docs/end-session-playbook.md` on the `hails-session-end` skill's
first run here, because no project-specific playbook existed yet. **This file is now this
repo's own** — edit it freely as this project's real end-of-day needs emerge; a later
change to the generic template this was copied from will never overwrite it, and nothing
here needs to stay in sync with any other repo's copy. Same relationship `hails-session-start`'s
own generic template already has to its own per-repo copies — mirrored deliberately
(2026-09-03, BinaryMisfit's own design call), not a coincidence.

**The marker write is always the LAST step, no exceptions (structural rule, added
2026-09-05, BinaryMisfit's own explicit correction).** Every other step this repo ever adds
— a `hails-fiction-import` run, a repo-health check, anything at all — goes **before** it,
never after. This reverses the original shape of this file, on purpose: the marker write
used to be Step 1, with repo-specific steps added below it, and that ordering is exactly
what caused a real incident (2026-09-05, `docs/fiction-pipeline-issues-register.md` PIPE-2)
— a marker got written before that day's real content had actually been imported, so it
was sourced from a lower-fidelity fallback instead of the real thing. Writing the marker
*after* everything else means it can actually reflect what the day really was, not a guess
made before the day's own record existed yet.

**A fresh repo with nothing else yet still runs this one step, alone — that's a complete,
correct playbook, not an unfinished one.** Number it Step 1 in that case. The moment this
repo earns a real repo-specific step (see below), that step becomes Step 1 and the marker
write becomes Step 2 — renumber, don't just append past it.

## Repo-specific steps — add your own ABOVE the marker-write step below

**This is where a project's own real end-of-day work goes**, once it's actually earned a
place here — not speculatively added on day one. Worked example (not a template to copy
wholesale, just evidence of the shape): X-Lifestyle's own hails-session-end playbook runs its
hails-fiction-import pipeline and a repo-health check here, as real steps that happen
**before** the marker write, precisely so the marker can be sourced from their output
rather than written blind ahead of them.

If a step here needs something from an earlier step in this same list, say so explicitly in
that step's own instructions — don't assume ordering that isn't written down. **Nothing in
this section may depend on the marker write having already happened** — if it does, that's
a sign it isn't actually a "before" step and needs its own separate mechanism (see
`hails-fiction-import`'s own real example: it deliberately archives its own end-of-day
marker into `import-register.md`'s detail block, never the live slot, precisely so a later
or out-of-band import run can't clobber whatever the live marker-write step below already
recorded).

## Final step — Write the day-state marker (required)

**The one thing every repo's hails-session-end run always does, no exceptions — and always
last.** Same design principle BinaryMisfit set directly, 2026-09-03: **"Start = End of Day
Read. End = Writes End of Day."** — sharpened 2026-09-05: End means *actually* end, after
every other step, not nominally first with real work trailing behind it.

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
