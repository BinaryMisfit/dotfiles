## Registers

A repo's **registers** are its living record of open work, ideas, and settled calls —
separate files by concern, never mixed into one undifferentiated list. Full origin/why:
`secretary-pool/docs/registers-convention-history.md`.

**Shared rules across every register type:**
- Priority/readiness/status is **set explicitly on the entry, never inferred** by a later
  session — only the human (or an explicit instruction) changes it.
- IDs are sequential integers per type-prefix, assigned once, **never reused or
  renumbered**, even after an entry closes or is superseded.
- A repo with 2+ registers gets a `docs/tracking-index.md` listing which files are active,
  so tooling never hardcodes a file list. A repo with exactly one register skips it.
- Read a register fresh every time it matters — never rely on a prior session's memory.

### Todo Register

`docs/todo-register.md` — single running file, one section per entry, ID `TODO-N`.

**Status:** `Open` / `Blocked` / `In progress` (a repo may use `Backlog` in place of `Open`
for not-yet-triaged items — pick one status set per repo, don't mix). **No `Done` status**
— a closed item is archived and removed, not marked done in place.

**Type** *(optional)*: `Targeted` (one-off) or `Repeatable` (recurs — log each round in the
entry, don't open a new `TODO-N`).

**Entry shape:** index row (`| # | Item | Priority | Status | Type | Area | Raised | Touched |`)
linking to a full section closing with a concrete **Next action**.

**`Raised`/`Touched` are real dates (`YYYY-MM-DD`), not derived from prose.** `Raised` =
first entered; `Touched` = most recent real edit, updated every time the row changes, not
just on close. Why: `secretary-pool/docs/registers-convention-history.md`.

**The entry itself is one line — the action, nothing else.** Real detail lives wherever it
actually belongs by type, and the todo line links to it: a call made or needing to be made
→ an ADR; a concept still maturing → the Idea Register; anything else → whatever existing
doc covers that area, or a new one under `docs/`.

**Todo Archive:** every repo running a todo register also gets `docs/todo-archive.md` —
permanent, chronological, newest-first, nothing ever removed once added (corrections get a
note, not a deletion).

**Closing an item:**
1. Add an entry to `docs/todo-archive.md`, carrying the `TODO-N` number into the heading
   (never reused). Summarize what was done and where the output lives, dated.
2. Remove its section and index row from `todo-register.md` entirely.
3. If user-facing, also add it to a `CHANGELOG.md`/`release-register.md`/project memory —
   different audience, not a substitute for the archive entry.

For a **Repeatable** item, closing means "this round is cleared," not "closed forever" —
say what round/scope actually completed.

### Idea Register

`docs/idea-register.md` — single running file, ID `IDEA-N`.

**Readiness tiers**, 1 (ready to start) through 4 (needs audit) — not a Status enum; ideas
mature toward action, they don't get "decided."

**Entry shape:** **Grounded:** bullets (source-verified) separated from **Open:** bullets
(genuine unknowns) — never blur the two. Note dependencies on other register entries
explicitly.

### Decision Records (ADRs)

Real, non-obvious decisions live under `docs/adr/`, **one file per decision** — settled
calls, not evolving work, so each gets an immutable record instead of an editable row.

**File naming:** `docs/adr/NNNN-short-title.md`, zero-padded 4-digit sequential number.
`docs/adr/README.md` is the index.

**Migrating an existing single-file decision register:** keep each entry's original
`DEC-N` as its new ADR number, don't resequence — preserves existing prose citations. Full
reasoning/precedent: `secretary-pool/docs/registers-convention-history.md`.

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

**Status enum:** `Open` → `Decided` / `Deferred` → `Superseded by NNNN`. A reversed
decision gets a **new** ADR that supersedes the old one — never edit or delete a decided
record's original body; amendments append as a dated `Addendum` block.

**Migrating a register whose entries carry their own internal update history** (layered
"OVERRIDDEN"/"Reversed" notes, not a clean reversal): fold each update into a dated
`Addendum` within that same entry's file, chronologically — don't split into new
superseding ADRs. Reserve that for a genuine full reversal. Judgment call, flag to a human
when unclear — full reasoning in the history doc.

**When to write one:** a decision that would otherwise get re-litigated or re-guessed —
not for routine bug fixes the diff already explains.

### Other register types

**One-file-per-entry is an ADR-only pattern.** Every other register is a single running
file — don't generalize the ADR shape just because it's newest.

A repo may need a domain-specific register beyond todo/idea/ADR. **Don't create one
speculatively** — trigger has to be real (something concrete to write down, no existing
register/doc fits). Motivate it on the spot (one line), create it, add to
`docs/tracking-index.md`, write the entry. Same shared rules apply; fields are
repo-specific.

**Cross-repo pointer for a domain-specific register used across multiple repos/personas:**
its real path must be stated here, in this always-loaded file — a repo's own
`docs/tracking-index.md` only helps a session that already has that repo cloned.
**`secretary-pool`'s `docs/persona-domain-register.md`** is the real, cross-persona map of
which infra/domain each persona owns, plus standing rules like "cross-session-reach
settings/hook changes get flagged to the domain owner first." Read this when a change
touches infrastructure another persona's own domain owns and `secretary-pool` isn't
already cloned here.

### Session-start integration

Where `hails-session-start`'s register sweep runs, it reads every file
`docs/tracking-index.md` lists (or the single register present) fresh each time —
`docs/adr/README.md` counts as the decision register for that sweep.

### Ownership and distribution

Canonical authoring source: `secretary-pool`'s own `rules/registers.instructions.md` tree,
deployed here via `scripts/sync-global-claude-config.js`, then merged into chezmoi for
`binary-dotfiles` distribution to other machines — that deployed artifact, not any one
authoring repo's own structure, is the real dependency. Full history (why it moved, from
where, twice): `secretary-pool/docs/registers-convention-history.md`.
