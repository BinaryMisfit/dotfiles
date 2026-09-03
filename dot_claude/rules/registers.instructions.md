## Registers

A repo's **registers** are its living record of open work, ideas, and settled calls —
separate files by concern, never mixed into one undifferentiated list. This codifies what
was already proven working in `xcl\xls` and `digital-homelab` before either had a name for
it, plus the ADR standard for decisions specifically.

**Shared rules across every register type:**
- Priority/readiness/status is **set explicitly on the entry, never inferred** by a later
  session from context — only the human (or an explicit instruction) changes it.
- IDs are sequential integers per type-prefix, assigned once, **never reused or
  renumbered**, even after an entry closes or is superseded.
- A repo with 2+ registers gets a `docs/tracking-index.md` listing which files are active,
  so tooling (including `session-start`'s register sweep) never hardcodes a file list. A
  repo with exactly one register skips it.
- Read a register fresh every time it matters — never rely on a prior session's memory of
  its contents.

### Todo Register

`docs/todo-register.md` — single running file, one section per entry, ID `TODO-N`.

**Status:** `Open` / `Blocked` / `In progress` (a repo may use `Backlog` in place of `Open`
for not-yet-triaged items — pick one status set per repo, don't mix). **There is no `Done`
status** — a closed item doesn't sit in the register marked done, it's archived and
removed (see "Todo Archive" below); the register only ever carries what's still
outstanding.

**Type** *(optional)*: `Targeted` (one-off, closes forever once done) or `Repeatable`
(recurs — log each instance/round in the entry rather than opening a new TODO-N).

**Entry shape:** index row (`| # | Item | Priority | Status | Type | Area | Raised | Touched |`)
linking down to a full section closing with a concrete **Next action** — never leave an
entry vague enough that a future session can't act on it without re-asking what it means.

**`Raised` and `Touched` are real dates (`YYYY-MM-DD`), not derived from prose (added
2026-08-31).** `Raised` is the date the item first entered the register; `Touched` is the
date of its most recent real edit (status change, scope change, progress note) — update it
every time the row itself changes, not just when the item closes. Both exist specifically
so a session returning after time away can see genuine age/staleness at a glance instead of
mining each entry's own prose for the last date mentioned — a real, deliberately chosen
tradeoff (two more columns to maintain) made because a user stepping away for days and
coming back needs the register itself to remember this, not a session reconstructing it
from scratch each time.

**The entry itself is one line — the action, nothing else.** Any real detail (context,
investigation notes, discussion, alternatives) does not live in the todo register at all;
it lives wherever it actually belongs by type, and the todo line links to it:
- A call that needs to be made or was already made → an ADR (`docs/adr/`)
- A concept that needs to mature before it's actionable → the Idea Register
- Anything else with real substance → whatever existing document or register already
  covers that area, or a new doc under `docs/` if none does
The todo register stays a list of pointers to act on, never the place the thinking happens.

**Todo Archive (added 2026-09-03, adopted from `xls`'s own proven pattern).** Every repo
running a todo register also gets `docs/todo-archive.md` — a permanent, chronological,
newest-first log of items closed out of `todo-register.md`. This exists so the live
register stays a short, dailyable read instead of growing forever, and so a future session
can check whether something was already done (or already tried and abandoned) instead of
rehashing or re-adding it as if it were new. Nothing is ever removed from the archive once
added — a wrong entry gets corrected in place with a note, never deleted.

**Closing an item:**
1. Add an entry to `docs/todo-archive.md`, carrying the item's `TODO-N` number into the
   archive heading (`## TODO-N: ...` — the number is never reused, so this is how a future
   new item avoids colliding with a closed one). Summarize what was actually done and where
   the output lives (doc path, commit hash, PR, release version — whatever's concrete),
   dated the day it closed.
2. Remove its section and index row from `todo-register.md` entirely — don't leave a
   `Done` row behind (see the `Status` note above).
3. If the resolution is also worth surfacing somewhere user-facing, add it to a
   `CHANGELOG.md`, a `release-register.md`, or project memory too — the archive entry and
   a changelog/memory entry serve different audiences (internal "don't redo this" log vs.
   public/session-facing record) and aren't substitutes for each other.

For a **Repeatable** item, closing means "this instance/round is cleared," not "this
category of work will never come up again" — the archive entry should say what round/scope
was actually completed, so a future instance is scoped correctly instead of either
re-covering the same ground or being mistaken for genuinely new work.

### Idea Register

`docs/idea-register.md` — single running file, ID `IDEA-N`.

**Readiness tiers**, 1 (ready to start) through 4 (needs audit before it's actionable) —
not a Status enum; ideas mature toward action, they don't get "decided" the way a
decision does.

**Entry shape:** **Grounded:** bullets (claims that are source-verified) separated from
**Open:** bullets (genuine unknowns) — never blur the two. Note dependencies on other
register entries (e.g. blocked on a `DEC-N` or another `IDEA-N`) explicitly.

### Decision Records (ADRs)

Every repo with real, non-obvious decisions worth remembering keeps them as Architecture
Decision Records under `docs/adr/`, **one file per decision** — not a single running log
like the two registers above. Decisions are settled calls, not evolving work, so each one
gets its own immutable record instead of living as an editable row.

**File naming:** `docs/adr/NNNN-short-title.md`, zero-padded 4-digit sequential number.
`docs/adr/README.md` is the index: a table of every ADR, its number, title, and status.

**Numbering when migrating an existing single-file decision register into this shape:**
keep each entry's original `DEC-N` identifier as its ADR number (zero-padded), rather than
resequencing from 1. A single-file register's entries are routinely cited by their `DEC-N`
label in plain prose across a repo's other docs — resequencing breaks every one of those
citations silently, where preserving the number breaks none of them. Confirmed in practice
migrating `xls`'s own `docs/decision-register.md` (2026-08-31): 53 files referenced `DEC-N`
labels, only 10 were real anchor links needing a path fix, and zero prose citations needed
touching once the number itself was preserved.

**Entry shape:**

```markdown
# NNNN — <short title>

<one-paragraph context: what prompted this, what was actually at stake>

**Status:** Open | Decided | Deferred | Superseded by NNNN

**Decision:** <the actual call, stated flatly>

**Why:** <the reasoning — constraints, trade-offs, what tipped it>

**How to apply:** <what this changes going forward, for a future session to act on>

**What got cut/kept:** *(optional — only when real alternatives were considered)*

---
*Addendum (YYYY-MM-DD):* <append-only follow-up>
```

**Status enum:** `Open` (raised, not yet settled) → `Decided` (settled, in effect) /
`Deferred` (deliberately parked) → `Superseded by NNNN` (a later ADR replaced this one).
A reversed decision gets a **new** ADR that supersedes the old one — never edit or delete
a decided record's original body. Amendments append as a dated `Addendum` block instead.

**When migrating a single-file register whose entries already carry their own internal
history** (an "OVERRIDDEN"/"Reversed"/"Progress" update layered into the same entry over
time, rather than a clean full reversal), fold each internal update into a dated
`Addendum` block within that same entry's one file, in chronological order — don't split
these into separate new superseding ADRs. Reserve "new ADR that supersedes the old one"
for a genuine full reversal of the decision itself, not an in-place refinement or status
update to a decision that's still standing. This is a judgment call worth flagging back to
a human when migrating a real register, since the line between "internal update" and
"full reversal" isn't always obvious from the prose alone.

**When to write one:** a decision that would otherwise get re-litigated or re-guessed by
a future session — a naming convention picked over an alternative, a structural call, a
correction to a wrong prior assumption. Not for routine bug fixes or anything the diff
already explains on its own.

### Other register types

**One-file-per-entry is an ADR-only pattern.** Every other register — todos, ideas, and
any new one created below — is a single running file. Don't generalize the ADR shape to
new register types just because it's the newest one written down.

A repo may need a domain-specific register beyond todo/idea/ADR —
`gameplay-register.md`, `engine-issues-register.md`, `release-register.md`,
`document-register.md` (an index of other docs for later retrieval), etc. **Don't create
one speculatively.** The trigger is real: you have something concrete to write down right
now and none of the existing registers or documents is the right place for it. At that
point, motivate the new register on the spot — one line on why todo/idea/ADR/an existing
doc doesn't fit — then create it, add it to `docs/tracking-index.md`, and write the entry.
New register types follow the shared rules above (explicit status, stable IDs,
tracking-index entry) but their fields are repo-specific — don't force todo/idea/ADR field
names onto a register tracking something else entirely.

### Session-start integration

Where the `session-start` skill's register sweep step runs in a repo, it reads every file
`docs/tracking-index.md` lists (or the single register present, if only one exists) fresh
each time — `docs/adr/README.md` counts as the decision register for that sweep.

### Ownership and distribution (added 2026-08-31, corrected 2026-08-31, ownership moved 2026-09-03)

This convention originated in `binary-dotfiles` (Aphrodite), deployed globally via
chezmoi. As of 2026-08-31 its canonical *authoring* source moved to `xls`'s own
`claude-global/rules/registers.instructions.md`; **as of 2026-09-03 it has moved again, to
`secretary-pool`'s own copy of the same tree** — consistent with `secretary-pool` becoming
the general canonical source over `xls` (confirmed by BinaryMisfit, see `secretary-pool`'s
own `docs/todo-register.md` TODO-3 for that decision). `secretary-pool` now owns fixes and
real usage refinements to this file and the `decision-register` skill going forward, and
applies them via its own `scripts/sync-global-claude-config.js` — `xls` no longer authors
this file; a change made in `xls`'s old `claude-global/` copy is stale the moment it's
made and won't propagate.

**`binary-dotfiles`/chezmoi never depends on any single project repo being present,
cloned, or accessible.** It reads only this file's deployed, final copy at
`~/.claude/rules/registers.instructions.md` (and `~/.claude/skills/decision-register/`) —
the exact same artifact every other project on the machine reads — and merges *that* into
chezmoi for distribution to other machines. The dependency runs through the deployed
`~/.claude/` artifact only, never through any one authoring repo's own internal directory
structure — which is exactly why the authoring source can move (as it just did) without
`binary-dotfiles` needing to change anything.
