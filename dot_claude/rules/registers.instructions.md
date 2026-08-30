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

**Status:** `Open` / `Blocked` / `In progress` / `Done` (a repo may use `Backlog` in place
of `Open` for not-yet-triaged items — pick one status set per repo, don't mix).

**Type** *(optional)*: `Targeted` (one-off, closes forever once done) or `Repeatable`
(recurs — log each instance/round in the entry rather than opening a new TODO-N).

**Entry shape:** index row (`| # | Item | Priority | Status | Type | Area |`) linking down
to a full section closing with a concrete **Next action** — never leave an entry vague
enough that a future session can't act on it without re-asking what it means.

**The entry itself is one line — the action, nothing else.** Any real detail (context,
investigation notes, discussion, alternatives) does not live in the todo register at all;
it lives wherever it actually belongs by type, and the todo line links to it:
- A call that needs to be made or was already made → an ADR (`docs/adr/`)
- A concept that needs to mature before it's actionable → the Idea Register
- Anything else with real substance → whatever existing document or register already
  covers that area, or a new doc under `docs/` if none does
The todo register stays a list of pointers to act on, never the place the thinking happens.

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

**Status enum:** `Open` (raised, not yet settled) → `Decided` (settled, in effect) /
`Deferred` (deliberately parked) → `Superseded by NNNN` (a later ADR replaced this one).
A reversed decision gets a **new** ADR that supersedes the old one — never edit or delete
a decided record's original body. Amendments append as a dated `Addendum` block instead.

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
