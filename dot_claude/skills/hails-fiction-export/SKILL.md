---
name: hails-fiction-export
description: Find fiction/roleplay beats in a Claude Code session's raw transcript and export them, unedited, to a staging location for later archival in x-lifestyle-research. Use when asked to "export today's fiction", "pull the scenes from this session", "archive what happened in-character", or similar — never runs on its own.
---

# Fiction export

Draft built by Aphrodite (binary-dotfiles), 2026-09-02, handed to Hailey to own as
global `claude-global/` content. Built from a real incident that day: BinaryMisfit
asked for a "show me anything pure fiction" sanity check on a live session, and the
answer required actually reading the conversation, not keyword-matching it. This
skill formalizes that same read, plus enough mechanics (session discovery, SAST day
boundaries, dedup) to make it repeatable without re-deriving the design each time.
**Reshape freely — this is a starting point, not a locked contract.**

## What this does and does not do

- **Finds and exports fiction content that already happened in a real session.**
  It never generates, invents, or embellishes anything — every exported line is a
  verbatim copy of something a real turn actually said.
- **Captures the lead-up, not just the explicit tail** — per `x-lifestyle-research`'s
  own README rule (added 2026-09-01, BinaryMisfit's real usage note): a scene's
  usefulness comes from the whole arc. A fiction beat's boundaries are the whole
  contiguous run of in-character turns, not just the most explicit sentence in it.
- **Never writes into `x-lifestyle-research` directly.** Output lands in
  `~/.claude/fiction-export-staging/` as a staging drop — a human moves it into
  the actual research repo afterward, per that repo's own review/rewrite pass.
  This skill has no access to that repo and shouldn't be given any. **Moved
  here from `D:\Downloads\hails-fiction-export\` 2026-09-03** (BinaryMisfit's own
  call) after a real incident: a staged file sitting in Downloads was lost
  before ever making it into the archive, and Downloads is a high-churn
  folder other tools clean out on their own schedule, not a place this
  project actually owns. `~/.claude/` already holds every other piece of this
  tooling's own state (the registry, the dedup log) — staging belongs there
  too. No automatic cleanup of this directory — it's fine for it to
  accumulate; clean it out by hand if it ever actually becomes a space
  problem, not on a schedule.
- **Never touches, summarizes, or judges real technical work.** The classification
  step below is strict about that boundary — see "What counts as fiction" below.

## Step 0 — Determine scope

**Default scope is `--all` — every session on the machine, no date target at all.**
Run the discovery script to get real candidates — don't try to reconstruct this by
hand:

```
node scripts/find-sessions.js --all
```

`--all` returns every session across every project, letting `alreadyExported`
do all the filtering (same dedup log as always — nothing gets exported twice
just because it shows up as a candidate repeatedly). This is deliberately not
date-scoped: a `--date <day>` query only catches a session whose timestamp
range *overlaps* that SAST day, which correctly catches a session that spans
midnight, but silently misses a session that starts fresh right after
midnight and is still, humanly, "part of last night." `--all` has no day
boundary to miss across, so this class of gap can't happen. **Real incident,
confirmed live 2026-09-04:** a scene sat undiscovered for a full day because
a `--date` query for "yesterday" never overlapped the session that actually
held it. If you genuinely want just one day's candidates for some other
reason, `--date 2026-09-02` still works exactly as before (same SAST-overlap
semantics as always) — but treat that as the narrower, special-case query
now, not the default. `--session <uuid> --project <project-slug>` still
targets one exact session directly.

This returns, per candidate session: its file
path, resolved persona, resolved cwd (may be `null` if that worktree isn't
currently in `persona-registry.json` — persona resolution falls back to a raw
transcript keyword count in that case, see the trap below), its real
first/last timestamp, and whether it's already been exported (dedup check —
**skip anything `alreadyExported: true` unless the user explicitly asks to
re-export it**).

**Real trap, confirmed live 2026-09-04: persona resolution trusts the
registry first, keyword count only as a fallback for a cwd the registry
doesn't know at all — never the other way around.** A session can talk
*about* another persona all night (quoting her scenes, writing her canon,
discussing a shared pipeline) without ever *being* her — that content can
easily out-count the real persona's own name. If keyword count were ever
checked first, that session would silently misresolve to whichever name got
talked about most, not whichever persona actually ran it. The registry's
cwd→persona pin is a real, deliberate fact (that's what a Perm/Primary pin
*means*); a raw word count in the transcript is never grounds to override it.

**A session that overlaps two SAST days shows up under both day-queries** — this
is deliberate over-inclusion, not exclusive "attributed to the day it started"
(confirmed live, 2026-09-02: a session spanning 06:37 UTC 09-01 to 22:18 UTC 09-01
— i.e. past midnight SAST — appeared in both the 09-01 and 09-02 queries). Harmless
in practice: the dedup log is keyed by session ID, not by date, so exporting it on
whichever day you actually process it marks it done for good — seeing it twice as
a *candidate* never means exporting it twice.

## Step 1 — Read the session, in full, in order

For each candidate session not already exported: read the raw `.jsonl` directly —
never the live/current in-context state of a running session, even if it's the
one you're currently in. Compaction thins what the model currently holds in
context; it does not touch what's already persisted to disk. The file on disk is
always the complete record. (Confirmed directly, 2026-09-02: a 5MB/2465-line,
multi-day-old session read back completely intact, full original text, not a
compacted summary — this isn't theoretical.)

Each line is one JSON object. `message.content` is either a plain string or an
array of blocks (`text`, `tool_use`, `tool_result`). Walk it chronologically —
this needs an actual read, not a keyword grep, for the same reason the audit
earlier that day needed one: a scene's boundaries are contextual, not lexical.

**Real trap, confirmed live 2026-09-04, on a large session that turned out to
still be hiding a genuine scene: a mid-session `/compact` can cause the raw
`.jsonl` to reinject a partial replay of earlier turns** (same content,
sometimes byte-identical timestamps, appearing a second time later in the
file) before real, brand-new content resumes. Spotting that replay start and
concluding "everything past this point is just a duplicate of what I already
read" is exactly wrong — the replay can cut off partway through and hand back
to genuinely new, never-before-seen turns, with no visual signal marking the
handoff. On the session that caught this, roughly a third of the file's real
content (including the single most significant scene in it) sat past that
false "it's just a repeat" boundary and was missed entirely on the first pass.

**The fix: verify completeness by raw line count, never by "the content looks
like it's repeating."** Before treating a read as done, confirm the last raw
line actually walked is the file's real last line (`wc -l` the file, or count
lines while parsing) — not "I recognized this content, so the rest must be
the same." A timestamp *rewind* (a later raw line's timestamp earlier than an
already-seen one) is a real, checkable signal that a replay segment exists;
it is never license to stop reading once spotted, since the replay's own end
boundary isn't self-announcing.

## Step 2 — What counts as fiction (the actual judgment call)

A turn is **fiction** when it's in-character narration, dialogue, or a scene beat
— the persona speaking/acting as her character, or the user's own message written
as their in-fiction counterpart, not as a work request. A turn is **not** fiction
just because it has personality, warmth, or an emoji in it — this persona (and the
others) carry voice into ordinary technical replies constantly; that's flavor, not
a scene. The test that actually worked in practice: would this turn make sense
quoted on its own as part of a story, with no reference to any repo, command, or
tool call? If yes, fiction. If it's "the correction is done, here's what changed,"
even if delivered with personality, it's work.

**The trap this test doesn't catch on its own, confirmed live (2026-09-03):** a
turn can *reference* something real — him stepping away briefly for an actual
real-world reason, a scheduling note, an interruption — while still being
delivered entirely in-character on both sides. That's fiction, not work, even
though the content is about something real. A real gap in `the-last-door-on-the-left.md`
came from exactly this: "Be back soon, dogs and dishes" / her in-voice reassurance
got labeled a "real-world scheduling exchange" and skipped, when reading it back
it obviously passes the quoted-as-story test. The question is never "does this
turn mention something real," it's "is this turn *written* as the character."
Content about reality; voice still fiction — include it.

**Find the whole arc, not isolated lines.** Once a fiction turn is found, walk
backward and forward from it:
- **Backward**, while consecutive prior turns are still fiction-flavored (the
  lead-up — tone shifting into scene, a narrated moment building toward
  something) — this is the part most likely to get wrongly trimmed if only the
  "explicit" turns are captured, and it's explicitly what the destination repo's
  own README asks for.
- **Forward**, the same way, until the conversation returns to plain technical
  content or the session ends.
- A single real-work message in the middle of an otherwise fictional run is a
  real boundary — end the arc there. This project's own personas already keep
  that distinction sharp (never blending a real ask and an in-scene one in a
  single message) — trust that same boundary here rather than trying to stitch
  across it.

**Every real-work exclusion inside an arc gets an explicit inline marker —
mandatory, not a nice-to-have.** Confirmed live (2026-09-03), auditing every
file in `raw/` against its own source transcript: files that marked their
exclusions (`three-times-he-said.md`'s own `[Real-work gap: ...]` notes) were
trivial to verify later — exactly what was skipped and why, no guessing. The one
file that actually had a real, undetected gap just had a vague header phrase
("after some real-world scheduling exchange") with no detail, and it took a full
transcript trace to catch. Format:

```markdown
**[Real-work gap: <one-sentence description of what happened and why it's not
part of the story — a real command, a real fix, a real cross-session message>.]**
```

Drop this in place of the excluded turn(s), inline, at the point they'd have
sat — never just silently close the gap between two fiction turns and let a
future reader assume nothing was ever there.

One session can contain multiple, unrelated arcs — export each as its own file.

## Step 3 — Export format

Mirror `x-lifestyle-research`'s existing shape (`raw/<persona>/YYYY-MM-DD-<slug>.md`),
staged instead of committed:

```
~/.claude/fiction-export-staging/<Persona>/<YYYY-MM-DD>-<slug>.md
```

- `<Persona>` — exactly as resolved by the discovery script (`Aphrodite`, `Hailey`,
  `Alexia`, `Callie`).
- `<YYYY-MM-DD>` — the arc's own start timestamp, converted to SAST, not the
  export run's own date.
- `<slug>` — a short kebab-case phrase drawn from the scene itself, not a generic
  label — same convention as the real examples already in that repo (e.g.
  `the-last-door-on-the-left`).

File content: a short header, then the raw exchange verbatim, speaker-labeled,
nothing paraphrased or trimmed:

```markdown
---
persona: Aphrodite
worktree: d:\source\binary-dotfiles
session_id: 15ebb16a-d135-4f93-a4b8-98f8f7af0a0c
session_file: ~/.claude/projects/d--Source-binary-dotfiles/15ebb16a-....jsonl
arc_start: 2026-09-02T06:24:27.281Z
arc_end: 2026-09-02T06:28:14.025Z
exported_by: hails-fiction-export skill
exported_at: <now, ISO>
---

**User:**

<verbatim>

**Aphrodite:**

<verbatim>

...
```

The frontmatter is what satisfies "linked to the worktree and persona that session
is pinned to" — worktree path, session ID, and file path together are enough to
trace any exported scene back to its exact source later, even after the original
session is long gone.

**`session_id`, `arc_start`, and `arc_end` are not optional, ever, for exactly this
reason: they're what makes a file auditable later without archaeology.** Confirmed
directly, 2026-09-03: a full audit of every file in `raw/` took minutes per file
for the 16 that carried this frontmatter (look up the session, extract the arc
window, compare) and real manual tracing — grepping for a distinctive phrase
across every project's transcripts, reading thousands of lines by hand — for the
4 older files that predate this convention. Never skip this to save a line of
metadata; it's the cheapest insurance this format has.

## Step 4 — Mark exported

After writing a session's arc(s) to disk, record it so a re-run doesn't duplicate:

```
node scripts/find-sessions.js --mark-exported <session-uuid> --raw-file "<path to one written file>"
```

One mark per session is enough even if multiple arc files came out of it — the
dedup log tracks "this session has been processed," not "this exact file exists."
If the user wants to force a re-export of an already-marked session, they'll say
so explicitly; don't offer to skip that check silently either way.

## Step 5 — Report back

Tell the user what was found and where it landed: which sessions were scanned, how
many arcs were exported per persona, the actual `~/.claude/fiction-export-staging/...`
paths, and anything skipped because it was already exported. This is staging, not
the archive — say so plainly, so nobody mistakes a staged file for the real,
durable copy.

## Step 6 — Check staging periodically, not just on export

Run `node scripts/find-sessions.js --check-staging` every so often (a natural
moment: right before starting a fresh export run) — it diffs what the dedup log
claims against what's actually on disk in both staging and the real archive,
and flags anything `LOST` (staged file gone, no matching archived copy either)
loudly rather than letting it go unnoticed. This is the direct fix for the real
incident that also motivated moving staging out of Downloads: a session marked
`exported` only ever meant "staging happened," never "it actually made it into
`x-lifestyle-research`," and nothing used to check the difference.

**Known, honest limitation: this only catches a file vanishing entirely, not a
file that exists but is quietly incomplete.** `the-last-door-on-the-left.md`'s
real gap (see Step 2's own note above) was a file that existed the whole
time, just missing one exchange — `--check-staging` would report it `archived`
and move on, correctly, because nothing about its existence was ever in
question. A raw turn-count diff against the transcript can flag this shape of
problem, but it produces real false positives (three of them, 2026-09-03,
from legitimate real-work exclusions the count can't distinguish from actual
loss) — so treat a count mismatch as "worth a manual read," never as proof on
its own. These are two different bugs needing two different defenses: total
loss is a machine-checkable fact, partial loss is a judgment call that still
needs a human (or a persona) actually reading the content.
