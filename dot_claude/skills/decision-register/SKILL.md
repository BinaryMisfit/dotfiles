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
