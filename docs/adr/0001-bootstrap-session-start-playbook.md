# 0001 — Bootstrap session-start playbook for this repo

This repo had no `docs/session-start-playbook.md` when the global `session-start` skill
ran here for the first time (2026-08-30). The skill's own convention is: if a repo has
never run the routine before, copy its bundled generic starter in rather than failing or
skipping the routine.

**Status:** Decided

**Decision:** Copy `~/.claude/skills/session-start/generic-playbook.md` into
`docs/session-start-playbook.md` verbatim, then run its steps for this first session too.

**Why:** the skill treats a missing playbook as "first run," not "not applicable" — every
repo the routine touches should get a real (if initially thin) report, and the playbook is
this repo's own from that point on to diverge and grow, same as `xcl\xls`'s copy did.

**How to apply:** this repo's playbook is `docs/session-start-playbook.md`. It is edited
freely as real conventions emerge here (a real timezone, a health check, register sweeps)
— it will never be overwritten by a later change to the generic template it was copied
from.
