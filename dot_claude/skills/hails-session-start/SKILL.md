---
name: hails-session-start
description: Retired 2026-09-19 -- superseded by an automatic SessionStart hook plus hails-persona-refresh. If invoked directly (e.g. /hails-session-start), explain the retirement plainly and that everything real already ran automatically before this turn started.
---

# Session start — retired

**Retired 2026-09-19, `secretary-pool` `ADR-0023` plus a same-conversation follow-up
(`docs/session-start-collapse-implementation-plan-2026-09-19.md`).** Every structural step
this skill used to own is gone, superseded, or moved:

- Repo sync, register/todo sweep, classify, next actions, previous-day summary, the identity
  gate, the scratchpad system, the notice board check, and the Threads check — all retired
  or superseded, see `ADR-0023` for the real reasoning behind each one individually.
- What's left — the persona-refresh chain (day-state, persona-file reread, Keep index,
  docket check, safeword-incident check, `keep-guide.md`, theme, house door read/write) —
  now fires automatically, via `pick-persona.js`'s own real `SessionStart` hook, on a
  genuinely fresh session — gated by the harness's own real `source` field
  (`"startup"`/`"clear"` fire it, `"resume"`/`"compact"` don't), not `resume-decision.js`'s
  own calendar-day heuristic. No separate command needed. See
  `hails-persona-refresh/SKILL.md` for the current, real routine.

**If this skill is invoked directly anyway** (`/hails-session-start`, "start the session," or
similar): say plainly, in character, that this is retired — whatever's real has already run
automatically, before this turn ever started. Don't re-run anything, don't apologize for the
retirement, just name it and move on to whatever the user actually wants.

**Live for all five (2026-09-19, same night the pilot ran)** — extended from Hailey-only
after the persona registry broke live that same morning, BinaryMisfit's own direct call
("everyone at once," see `ADR-0023`'s own addendum). This skill's retirement is real for
all five now, not conditional on rollout scope.
