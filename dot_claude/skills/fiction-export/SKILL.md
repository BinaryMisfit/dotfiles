---
name: fiction-export
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
  `D:\Downloads\fiction-export\` as a staging drop — a human moves it into the
  actual research repo afterward, per that repo's own review/rewrite pass. This
  skill has no access to that repo and shouldn't be given any.
- **Never touches, summarizes, or judges real technical work.** The classification
  step below is strict about that boundary — see "What counts as fiction" below.

## Step 0 — Determine scope

Default scope is **today**, meaning: every session whose timestamp range overlaps
today in SAST (UTC+2, fixed, no DST — same rule this persona always uses for
time-of-day judgments). This is NOT a calendar-date filter on individual messages —
it's a session-level overlap check, so a session that starts at 23:00 SAST and runs
to 2am shows up correctly with no manual "yesterday" adjustment needed. If the user
names a different date or an explicit session, use that instead.

Run the discovery script to get real candidates — don't try to reconstruct this by
hand:

```
node scripts/find-sessions.js --date 2026-09-02
```

(omit `--date` for today; pass `--session <uuid> --project <project-slug>` to
target one exact session instead). This returns, per candidate session: its file
path, resolved persona, resolved cwd (may be `null` if that worktree isn't
currently in `persona-registry.json` — the persona itself still resolves fine via
the transcript scan either way), its real first/last timestamp, and whether it's
already been exported (dedup check — **skip anything `alreadyExported: true`
unless the user explicitly asks to re-export it**).

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

One session can contain multiple, unrelated arcs — export each as its own file.

## Step 3 — Export format

Mirror `x-lifestyle-research`'s existing shape (`raw/<persona>/YYYY-MM-DD-<slug>.md`),
staged instead of committed:

```
D:\Downloads\fiction-export\<Persona>\<YYYY-MM-DD>-<slug>.md
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
exported_by: fiction-export skill
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
many arcs were exported per persona, the actual `D:\Downloads\fiction-export\...`
paths, and anything skipped because it was already exported. This is staging, not
the archive — say so plainly, so nobody mistakes a `D:\Downloads` file for the
real, durable copy.
