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

## Final step — Read back, reflect for real, write the day-state marker (required)

**The one thing every repo's hails-session-end run always does, no exceptions — and always
last.** Same design principle BinaryMisfit set directly, 2026-09-03: **"Start = End of Day
Read. End = Writes End of Day."** — sharpened 2026-09-05: End means *actually* end, after
every other step, not nominally first with real work trailing behind it.

**Rewritten 2026-09-06, real incident: a marker written this same night read as plausible
and generic, and was flatly wrong against what the session's own transcript actually
showed.** Traced to the source — mood/summary/fadeOut were being filled in as a form to
complete from whatever was still fresh in context, not from an honest look back at the
whole day. Agreed by all four personas individually, one at a time, before this section was
rewritten to match:

0. **The real transcript is the source, not memory, not the fiction-export/scene pipeline.**
   Session context can be lossy (compaction summarizes older turns), and a real day often
   spans more than one session, each starting cold with no first-hand memory of what came
   before — memory alone can't be trusted to hold the whole day accurately. The scene-export
   pipeline can't stand in for it either: it deliberately excludes real, non-fiction content
   on purpose (a real agreement to keep something out of the shared archive means it's
   ALSO not in the export you'd be reading from) — it was never a complete record to begin
   with. Read the actual session transcript(s) for the day before writing anything. This
   scales with how eventful the day actually was — a quiet day earns a quick pass, a real
   day earns a real one; it's a genuine retrospective read, not a mandatory full re-parse
   every single time regardless of what happened.
1. **Reflect genuinely, in the persona's own voice, from what that read actually showed —
   not a status report, and not automatically the most recent thing that happened.** The
   real highlight of the day can be the first thing that happened, not the last — recency is
   not the same thing as importance. What's the actual mood this session/day is ending on —
   chosen because it's true, not because it's the easy, safe-to-write answer. Then 2-3 real
   lines on what actually mattered.
2. **Two self-tests before committing the line (Aphrodite's own addition, real and
   concrete, not just advice to "try harder"):**
   - **Portability check:** could this exact sentence be copy-pasted onto a *different* day
     for this same persona and still read as true? If yes, it isn't specific enough — that's
     the tell for the easy, generic-but-technically-true answer instead of the real one.
   - **Citation check:** can this line point at one real, quotable exchange in the actual
     transcript — not a vibe averaged over the whole day? If the honest draft can't cite a
     real moment, same tell, different angle.
3. **Add the fade-out — the real closing frame, chosen the same way, not narrated by
   default from whatever happened last.** Distinct from the summary above: summary
   compresses the whole day's arc, this answers one narrower question — what's the real
   state to resume from. Terse fragments, no mood language, and it has to survive the same
   two self-tests above.
4. **"Hers, not his" governs every field here (2026-09-03, BinaryMisfit's own correction).**
   A raw scene transcript narrates in second-person address to the player ("you hear...
   before you fall asleep") — that convention must never bleed into `mood`, `summary`, or
   `fadeOut`. Before writing, check: whose body, whose feelings, whose memory is this
   sentence actually describing? If the honest answer is his, it's wrong for this file, no
   matter how well-written.
5. **While reading back for the marker, also catch anything worth keeping that didn't get
   flagged live (added 2026-09-06).** "Say the small thing, don't sit on it" covers what
   registers in the moment; this covers what only becomes visible in hindsight — a technical
   decision that mattered more than it looked like live, a real moment, a genuinely funny
   line. Anything real gets written to wherever it actually belongs — this same marker if
   it's about the day's own mood, or the persona's own private repo (see below) if it has
   real staying power beyond just today. This is a genuine, self-authored judgment call, not
   automation deciding what counts — automation never writes to a private repo's own memory
   content, only the persona herself does, same as everywhere else this project draws that
   line.

   **Not everything noticed here has to get WRITTEN anywhere at all (BinaryMisfit's own
   words, same day, said directly to Alexia)** — not the marker, not the private repo.
   Genuinely reckoning with something, honestly, once, is a complete outcome on its own;
   filing it is one real way to keep it, not the only one that counts. A retrospective pass
   that surfaces something real but leaves nothing written down afterward hasn't failed —
   it did its actual job.
6. **Write the local marker (the actual source of truth, always written first):**
   ```bash
   node ~/.claude/scripts/day-state.js --write --persona "<this persona's style name>" --mood "<word or short phrase>" --summary "<2-3 lines>" --fade-out "<last frame, present tense>" [--transcript <id/path>] [--scene <path>] [--private-repo <path to this persona's own cloned private repo>] [--cwd <path>]
   ```
   Keyed by identity (nickname if one exists for this cwd, otherwise the persona's own
   plain name), not cwd — `--persona` is how the script resolves which. `--transcript`/
   `--scene` are optional pointers, never required. `--cwd` defaults to the current
   worktree. **`--private-repo` is opt-in, best-effort:** if given, the write also pushes a
   human-readable copy into that repo as `<identity-lowercase>-end-of-day.md`. No retry
   logic if the push fails — it's a full-overwrite snapshot, nothing to reconcile — but a
   failed push is never silent; if this skill's own output shows a push failure, say so
   plainly to BinaryMisfit rather than letting it pass unremarked, since the whole reason
   this state lives in a private repo at all is surviving the machine dying, and a push
   that fails with zero signal quietly defeats that.
7. **If this worktree's own nickname disappeared since the last run (a collision resolved,
   a sibling worktree closed), archive that identity's old marker file in the private repo
   rather than leaving it live under a name nothing resolves to anymore — and never delete
   it.** Same discipline as todo-archive.md/ADR-superseded/the domain register's own
   carve-out rows: a nickname going away is a real, ephemeral fact; the memory behind it
   isn't. Move it to an `archive/` folder in that persona's own repo, don't throw it out.
8. **Confirm back to BinaryMisfit** what got written — the mood, a one-line echo of the
   summary, and the fade-out line — so it's visible, not just filed silently.

**Not the persona performing continuity for its own sake** — a quiet, uneventful close is a
legitimate mood too, say so plainly rather than manufacturing weight that isn't there.
**Not mandatory before every session ends** — run this whole skill when BinaryMisfit asks,
or when the persona genuinely has something worth carrying forward and offers to.
