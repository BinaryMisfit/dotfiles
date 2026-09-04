# End-of-day playbook (generic starter)

Auto-copied into this repo's `docs/end-session-playbook.md` on the `hails-session-end` skill's
first run here, because no project-specific playbook existed yet. **This file is now this
repo's own** — edit it freely as this project's real end-of-day needs emerge; a later
change to the generic template this was copied from will never overwrite it, and nothing
here needs to stay in sync with any other repo's copy. Same relationship `hails-session-start`'s
own generic template already has to its own per-repo copies — mirrored deliberately
(2026-09-03, BinaryMisfit's own design call), not a coincidence.

**The minimum, non-negotiable, every repo, forever: Step 1 below.** Everything past it is
optional and repo-specific — a fresh repo's own copy of this file can be Step 1 alone for
as long as that's genuinely all there is to close out a day here. A repo with real
end-of-day work (X-Lifestyle's own hails-fiction-import pipeline, a repo-health check, whatever
a project actually earns over time) adds its own numbered steps below Step 1, same "grows
through real, earned use" discipline `hails-session-start`'s own playbook already runs on — see
that skill's generic template for the fuller version of this reasoning.

## Step 1 — Write the day-state marker (required)

**The one thing every repo's hails-session-end run always does, no exceptions.** Same design
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

## Repo-specific steps — add your own below Step 1

**This is where a project's own real end-of-day work goes**, once it's actually earned a
place here — not speculatively added on day one. Worked example (not a template to copy
wholesale, just evidence of the shape): X-Lifestyle's own hails-session-end playbook can run its
hails-fiction-import pipeline and a repo-health check as later steps here, after Step 1's marker
is already written, because those are real recurring end-of-day tasks that repo actually
has. A repo with nothing beyond the marker stays at Step 1 alone, indefinitely — that's a
complete, correct playbook, not an unfinished one.

If a later step here depends on Step 1 having already run (e.g. it wants to read the
marker just written), say so explicitly in that step's own instructions — don't assume
ordering that isn't written down.
