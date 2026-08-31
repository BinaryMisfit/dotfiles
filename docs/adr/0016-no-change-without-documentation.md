# 0016 — Standing rule: no change lands without a matching documentation update, in the same change

Mirrors the same rule already standing in the `digital-homelab`/`home-ansible` repo
(added there 2026-08-30, after a real audit found README's stack table silently stale,
`CLAUDE.md`'s own counts stale, and a claimed limitation that had only ever been verified
against a since-replaced model — none of it caught until someone checked source against
docs by hand). BinaryMisfit asked for the same standard here, explicitly, backdating
documentation for a real evening's worth of decisions (ADRs 0011-0015) that had already
been made and acted on before this rule was written down.

**Status:** Decided

**Decision:** no change to this repo — a template, a run script, a `.chezmoiignore`/
`.chezmoiremove` entry, a permission/settings key, a domain-boundary or ownership call —
lands without a matching documentation update in the *same* change. Before considering any
such change done: find every doc that makes a claim about the thing just changed
(`README.md`, `CLAUDE.md` itself, `docs/adr/`, `docs/todo-register.md`,
`docs/inventory-register.md`) and update it in the same pass. If no doc covers the area
being touched yet, create one — don't treat something as too small to write down. A
one-line settings tweak with no real "why" behind it doesn't need a full ADR; a decision
that took real investigation, reversed an assumption, or would confuse a future session
without its reasoning does.

**Why:** the same failure mode that prompted this rule in `home-ansible` was already
happening here, quietly — this same evening produced five real, non-trivial decisions
(chezmoi source divergence, paired-scripts requirement, the TODO-2 resolution, the
registers/domain-boundary correction, the Scoop migration order-of-operations) that only
got written down after being asked for directly, not as each one happened. Undocumented
decisions don't stay remembered — they get re-discovered the hard way, or contradicted by
a later session that never knew they existed.

**How to apply:** treat this the same weight as ADR 0004's scripted-cleanup requirement —
a real gate on considering work finished, not a nice-to-have. Backdating is explicitly
fine and expected when documentation debt is found after the fact (as it was here); the
goal is completeness of the record, not literal chronological purity.
