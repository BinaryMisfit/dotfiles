## Decision Records (ADRs)

Every repo with real, non-obvious decisions worth remembering keeps them as Architecture
Decision Records under `docs/adr/`, one file per decision — not a single running log.

**File naming:** `docs/adr/NNNN-short-title.md`, zero-padded 4-digit sequential number,
never reused or renumbered. `docs/adr/README.md` is the index: a table of every ADR, its
number, title, and status.

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

**Session-start integration:** where the `session-start` skill's register sweep step runs
in a repo, treat `docs/adr/` (via its `README.md` index) as that repo's decision register,
alongside whatever todo/idea registers it already has.
