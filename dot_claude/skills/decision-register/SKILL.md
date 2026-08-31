---
name: decision-register
description: Log a new Architecture Decision Record (ADR) in the current repo under docs/adr/, or list/supersede existing ones. Invoke for "log this decision", "record an ADR", "write a decision record", "what decisions have we made here".
user-invocable: true
tools: Read, Glob, Grep, Write, Edit
---

# Skill: Decision Register

Implements the global ADR convention (`@rules/registers.instructions.md`): one file per
decision under `docs/adr/`, indexed by `docs/adr/README.md`.

## Logging a new decision

1. If `docs/adr/` doesn't exist, create it along with `README.md` (empty index table:
   `| # | Title | Status |`).
2. Read `docs/adr/README.md` to find the next sequential number (never reuse or renumber,
   even if an old ADR was later superseded).
3. Write `docs/adr/NNNN-short-title.md` using the shape from `registers.instructions.md`:
   context paragraph, **Status**, **Decision**, **Why**, **How to apply**, optional
   **What got cut/kept**.
4. Add a row to `README.md`'s index table.
5. Confirm the decision text with the user before writing if it wasn't already stated
   plainly in the conversation — don't invent rationale that wasn't actually given.

## Superseding a decision

1. Find the existing ADR by number or title.
2. Change its `**Status:**` line to `Superseded by NNNN` (the new ADR's number) — never
   edit or delete the rest of its original body.
3. Write the new ADR normally, noting in its context paragraph what it replaces.
4. Update both rows in `README.md`.

## Listing decisions

Read `docs/adr/README.md` and report the table as-is. If it doesn't exist, say so plainly
— don't fall back to scanning for some other convention.

## Migrating an existing single-file decision register into this shape

Some repos (e.g. `xls`) started with a single running `docs/decision-register.md` before
adopting this convention. When migrating one:

1. **Preserve each entry's original `DEC-N` number as its new ADR number** (zero-padded to
   4 digits) — do not resequence from 1. A repo's other docs routinely cite `DEC-N` labels
   in plain prose; resequencing silently breaks every one of those, where preserving the
   number breaks none. Only real markdown anchor links into the old file
   (`decision-register.md#<slug>`) need repointing to the new file paths.
2. Fold each entry's own internal history (an "OVERRIDDEN"/"Reversed"/"Progress" update to
   the same decision over time) into dated `Addendum` blocks within that one file, in
   chronological order — reserve a genuinely new, separately-numbered superseding ADR for
   a full reversal only, not an in-place refinement. Flag this specific judgment call back
   to the user rather than deciding silently which category a given update falls into.
3. Replace the old single-file register with a short stub pointing at `docs/adr/README.md`
   — keep it, don't delete it, so old links don't 404.
4. Update `docs/tracking-index.md` to point at `docs/adr/README.md` as the decision
   register.
