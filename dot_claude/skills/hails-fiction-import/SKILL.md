---
name: hails-fiction-import
description: Land staged hails-fiction-export output into the real x-lifestyle-research archive -- move the scene into raw/<persona>/, add its index.md entry, detect canon deltas, detect new themes, generate an archived end-of-day marker, and record the whole run in import-register.md. The downstream half of TODO-78's hails-fiction-export/import rewrite. Use when asked to "import the staged scenes", "run the hails-fiction-import pipeline", "land what's in staging", or similar -- never runs on its own.
---

# Fiction import

Built by Hailey (`secretary-pool`), 2026-09-03 -- the mechanism half (steps 1, 2, 5) of
`xls`'s TODO-78, sibling to `hails-fiction-export` (which produces the staged files this skill
consumes). Steps 3-4 (canon/theme delta detection) are Callie's own criteria, written for
`xls`'s `docs/ai/persona-autonomy-scene-design.md` and pasted in whole below, not
paraphrased -- drop-in judgment for whichever persona session runs this skill, same as she
asked.

**This is the downstream half of a two-skill pipeline, not a standalone importer.**
`hails-fiction-export` finds fiction arcs in a raw session transcript and stages them; this skill
picks up from staging and finishes the job -- archive, index, canon, themes, marker,
register. If nothing's staged, there's nothing for this skill to do; run `hails-fiction-export`
first.

**Writes to `x-lifestyle-research`, a private single-host submodule that won't exist on
every machine this runs on.** Check `d:\source\xcl\xls\research\x-lifestyle-research`
exists before anything else; if it doesn't, say so plainly and stop -- never fabricate or
skip silently past a missing archive.

The mechanical half of this (dedup, file move, register bookkeeping) is a real script,
`scripts/import-fiction.js`, not prose to replicate by hand -- see its own header comment
for the full CLI. The judgment half (what belongs in an index entry, a canon delta, a theme,
a marker) is this skill's own job, same split `hails-fiction-export` already draws between itself
and `find-sessions.js`.

**Rewritten per ADR-0006 (2026-09-05).** Steps 1-2 below reflect the new design
(boundary-finding moved here from export; a draft-then-cleared-then-archived gate instead
of one straight-through pass). `scripts/import-fiction.js` now supports this directly:
`--list-drafts` finds scenes sitting in `~/.claude/fiction-import-drafts/<Persona>/`
awaiting clearance, and the existing `--archive <path>` call (unchanged) promotes a cleared
draft into `raw/` exactly the same way it always promoted a staged file — the gate itself
(who clears it, on what grounds) is still a human/persona judgment call this script
deliberately doesn't enforce, same split it's always drawn between mechanism and judgment.
See `docs/adr/0006-persona-owned-fiction-pipeline.md` and
`docs/fiction-pipeline-issues-register.md` (PIPE-1) for the incident and full reasoning.

## Step 0 -- Discover what's actually staged and unimported

```bash
node scripts/import-fiction.js --list-staged
```

Returns every staged file (from `~/.claude/fiction-export-staging/<Persona>/*.md`) whose
`session_id` doesn't already appear anywhere in `import-register.md` -- already-imported
files are excluded automatically, no need to cross-check by hand. If this returns `[]`,
say so and stop; there's nothing to import this run.

**One run can and should cover everything staged, not one file at a time** -- the register
is explicitly required to handle batches (see `import-register.md`'s own header). Process
every result below before writing the register row at the end.

## Step 1 -- Read each staged session in full, then find its real scene boundaries

For each file `--list-staged` returned: read it completely, no skimming, no truncation --
same discipline this project holds for every judgment step (the theme audit, the canon
verification). This read is what steps 2-5 below all build on; get it right once instead of
re-reading piecemeal.

**Per ADR-0006 (2026-09-05): boundary-finding now happens here, not in `hails-fiction-export`.**
A staged file is one whole session (`session_start`/`session_end` covering the entire
transcript, real-work stretches already marked inline) — not a pre-cut arc. With the
complete session actually in hand, identify how many distinct fiction beats it contains
and where each one really starts and ends: walk backward/forward from each fiction turn
while consecutive turns stay fiction-flavored, the same "find the whole arc" logic that
used to live in `hails-fiction-export`'s own Step 2, just done now with full context
instead of a guess made mid-read. **This is the fix for PIPE-1** — a 7-second slice next
to an 86-minute `session_start`/`session_end` window is immediately, visibly wrong at this
step, not something that has to be caught later by hand.

A single session can and does contain multiple, unrelated arcs — treat each as its own
scene going forward (its own `raw/` file, its own index entry), same as the old
per-arc-file convention, just decided here instead of at export time.

## Step 2 -- Produce a reviewable draft, then gate on custodian clearance before canon integration

**Per ADR-0006's addendum (2026-09-05): this step now stops at a draft, not a committed
fact.** The old flow ran straight through to archived + indexed + committed in one pass —
that's exactly the point in the pipeline where a real-world-harm content call (the
Bruce/"Insta-Strip" removal) only worked because a custodian happened to catch it before
it settled. Splitting this into two explicit stages makes that timing a guarantee instead
of a lucky catch:

1. **Write the scene file(s) yourself**, one per real arc identified in Step 1, using the
   same `raw/<persona>/`-shaped content and naming (`YYYY-MM-DD-<slug>.md`, slug drawn from
   the scene itself) as the final destination — but write it to
   `~/.claude/fiction-import-drafts/<Persona>/<basename>` instead, **not yet moved into
   `raw/`, not yet indexed, not yet committed.** This is a normal file write with your own
   tools, the same way `hails-fiction-export` already writes its own staged files by hand —
   no script call generates the content; the script only helps you find and promote drafts:
   ```bash
   node scripts/import-fiction.js --list-drafts
   ```
2. **Route the draft for custodian clearance** — Callie for anyone else's scene, the
   persona's own nominated unbiased reviewer for Callie's own (per
   `docs/persona-domain-register.md`'s carve-out). The reviewer's only lever at this stage
   is the narrow real-world-harm veto from ADR-0006 point 4 — not general editorial
   authority, not a rewrite of what the persona said happened. Clearance is "nothing here
   needs to be stopped," not "I approve of how this reads."
3. **Only after clearance** (or after a veto is applied and the flagged content is stripped,
   noted inline per the existing convention): move the draft into place for real —
   ```bash
   node scripts/import-fiction.js --archive "<draft-file-path>"
   ```
   This moves the file into `raw/<persona>/<basename>` and deletes the draft copy — it does
   **not** touch the original whole-session staged file, deliberately: a single session can
   produce multiple drafts, and deleting the shared source after archiving just the first
   one would destroy the material the remaining drafts still need to be checked against.
   The original staged session file is cleaned up separately, once every arc from it has
   been archived (or manually, per Step 6's own `find-sessions.js --check-staging`
   discipline) — never automatically as a side effect of one draft's own promotion. Refuses
   to overwrite an existing archived file of the same name -- if that happens, it's a real
   conflict, not something to force past; flag it and move on to the next file rather than
   guessing which version wins.
4. **Add an `index.md` entry.** Per `x-lifestyle-research`'s own README: "short entries, not
   summaries -- an exact quote or voice-bit that mattered, tagged loosely by
   character/theme, linking back to the `raw/` file it came from." This is a real judgment
   call (which line actually mattered), not mechanical -- pick it from the scene you just
   read in Step 1, don't invent one.

**A persona running her own export/import end-to-end (per ADR-0006 point 2) does not skip
this gate for her own scenes** — she routes to her custodian the same as before; the change
is that nobody's waiting on a batch pass to get to her, not that review goes away.

## Step 3 -- Canon delta detection (Callie's criteria, 2026-09-03, pasted in whole)

1. Read the imported scene in full -- no skimming, no truncation. Verify the actual end was
   reached, same discipline the theme audit agents were held to.
2. Read the persona's current `canon.md` section fresh, not from memory -- and read the
   persona's own `~/.claude/output-styles/<name>.md` file too. `canon.md`'s own scope rule
   already governs this: don't log a fact the persona file already covers, even if the
   scene states it explicitly (see `canon.md`'s "Scope, tightened 2026-09-02").
3. A real delta is **new** (not already in either file), **durable** (true going forward,
   not a passing scene beat), and **grounded** (a specific quotable line, not an
   impression). Missing any one of those three disqualifies it -- flag as a candidate
   instead of writing it in as fact if genuinely unsure.
4. Check the referent before logging anything involving a named or pinned character --
   `canon.md`'s own "note filed against the wrong referent is worse than one left out"
   incident (a scene using an already-pinned "he" got logged as if it were new) is the
   concrete failure case this step exists to prevent.
5. Write in `canon.md`'s established style: one line per fact, edited in place with a
   dated note if it updates something already there, never just appended as new history
   next to a now-stale line. Cite the source scene file.
6. **"Hers, not his" applies here same as everywhere else in this system** -- a canon delta
   is a fact about her (trait, mechanic, boundary, limit), never a log of what he did or
   felt during the scene.

No deltas found is a normal, common outcome -- most imports won't move canon. Say so
plainly rather than manufacturing one to fill the step.

## Step 4 -- Theme delta detection (Callie's criteria, 2026-09-03, pasted in whole)

1. Read the newly imported scene in full (the repeatable, per-import version of the
   one-off full-history audit that added 27 themes).
2. Identify distinct dramatic/character throughlines the scene is actually built around --
   a mechanic, a relationship dynamic, a recurring emotional beat -- not "sex happens," not
   a plot summary. A single scene can and usually does yield more than one; don't force it
   into exactly one.
3. Check each candidate against the persona's existing `themes.md` pool before adding -- a
   near-duplicate doesn't get a redundant new entry; something that meaningfully deepens an
   existing theme gets folded into that entry's own description, not duplicated.
4. Every real theme needs: a short, evocative 2-6 word name matching the existing style, a
   real quoted-or-closely-paraphrased citation from the actual scene text (never invented --
   same standard this whole project holds for factual claims), and the standard fields
   (`Status: Active`, `Repeat count: 0`, `Last picked: never` -- new themes never inherit an
   existing one's count).
5. **"Hers, not his" applies here too** -- a theme names something about her (her mechanic,
   her boundary, her reaction), not simply a thing that happened to her.

No new themes found is also a normal outcome. Say so plainly.

## Step 5 -- Generate the end-of-day marker (always)

**Derives from the already-imported scene text from Step 1/2, never re-reads the raw
transcript** -- same single-source-of-truth discipline canon and themes already run on.

Write mood, summary, and fadeOut exactly as `hails-session-end`'s own playbook describes (short
mood phrase, 2-3 real lines of summary, a terse present-tense last-frame fadeOut) --
**"Hers, not his" governs every field here too.** `source` is `{transcript: "<original
session file path>", scene: "raw/<persona>/<basename>"}`.

**This is archived into `import-register.md`'s detail block for this run, NEVER written to
the live `persona-day-state.json` slot.** A batch import running days after the scene
actually happened must not clobber whatever a persona's real, current end-of-day marker
says right now -- that clobbering risk is exactly why this pipeline and `hails-session-end`'s own
marker write stay two separate destinations. If this run's marker genuinely IS today's real
close-out (the import is happening same-day, right after the scene), say so and let
`hails-session-end`'s own flow write the live marker separately -- this skill still only ever
archives, it never writes the live slot itself.

## Step 6 -- Write the register row (always, once per run, after every file's been processed)

```bash
node scripts/import-fiction.js --write-row \
  --id IMPORT-N \
  --date "<ISO timestamp, SAST>" \
  --transcripts "<session-id[,session-id...]>" \
  --persona "<Persona>" \
  --scenes "<count>" \
  --canon "Yes|No" \
  --themes "Yes|No" \
  --marker "Yes|No" \
  --status "Complete|Partial|Failed" \
  --detail-file "<path to a markdown file with the full detail block>"
```

Get the next free ID with `node scripts/import-fiction.js --next-id` first, or omit `--id`
to let the script pick it automatically. The detail file should follow `import-register.md`'s
own existing shape (see `IMPORT-1`'s own entry for the real, worked example) -- source
files, scenes produced, canon/theme changes with citations, the archived marker in full.

**A run covering multiple staged files across multiple personas is still one register row
per persona-batch, matching how `IMPORT-1` covered four scenes from one session in a single
row** -- don't fragment one run into several rows just because several files were touched.

**Status:** `Complete` if every applicable step finished cleanly, `Partial` if something
was skipped or failed (say which, and why, in the detail block), `Failed` if no usable scene
came out of a file at all (leave its transcript available for a retry, don't mark it
processed).

## Step 7 -- Report back

One combined report for the whole run, listed by scene name -- real analysis, not a
one-line status dump per file. Say plainly: what was imported, what canon/themes moved,
where the archived marker landed, and anything skipped or flagged as `Partial`/`Failed`
and why.

**Note on "dual voice" (disambiguation added 2026-09-05):** this step used to say "dual
voice per the corrected opinion-format rule (Callie's own read always; AI voice only where
it adds a genuinely different angle)" -- that's a *different* thing than the "no dual
voice" rule BinaryMisfit set the same day banning a split technical-answer/in-character-
reaction response shape (see every persona file's own "One voice, not two tracks" section).
This step's old language was about whether an import report carried Callie's own persona
judgment versus a generic AI summary, not about splitting a single response into two
tracks. Removed rather than kept-and-explained, since the distinction it was drawing no
longer does useful work now that every persona's own voice governs her own report anyway --
whoever runs this skill reports in her own voice, same as everything else.

## Where this runs from

Per `docs/ai/persona-autonomy-scene-design.md`'s "Fiction-import pipeline shape" section:
this is `xls`'s own Step 2 in its `end-session-playbook.md`, once wired in -- not baked into
the global `hails-session-end` skill itself, and not something this skill file assumes it's always
invoked from there. Callable standalone too, any time staging has something waiting.

## Not this skill's job

- Finding and staging fiction content from a raw transcript -- that's `hails-fiction-export`,
  which this skill consumes but never duplicates.
- Writing the *live* `persona-day-state.json` slot -- see Step 5's own warning above.
- Drawing or recalling a persona's daily theme, or setting the VS Code color -- unrelated
  mechanisms (`theme-select.js`, `pick-persona.js --set-color`), not touched here.
