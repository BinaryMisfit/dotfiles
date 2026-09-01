---
name: session-start
description: Start-of-session routine -- forces today's already-active persona to actually greet you (not left to chance, never re-rolled), summarizes the previous calendar day's real work, runs any project-specific health check that repo has wired up, sweeps that repo's own todo/register tracking, flags anything whose priority or blocked status looks stale, and hands back exactly three concrete options for what to start on next. On a repo that has never run this before, bootstraps a starter playbook instead of failing. Use when the user runs /session-start, asks to "start the session", "run the session-start routine", or "what should I work on".
---

# Session start

**This is a global skill** (promoted 2026-08-28 from an X-Lifestyle-only project skill to
`~/.claude/skills/session-start/`, renamed from `morning-start` the same day once it became
clear this doesn't only run in the morning) — available in every project on this machine,
not just X-Lifestyle ones. It's deliberately a thin, generic wrapper: the actual step-by-step
routine lives entirely in a per-repo playbook doc (`docs/session-start-playbook.md`,
relative to whichever project is currently open — never a fixed path, since this skill
has no permanent relationship to any one repo), never duplicated into this file. If a
step described there contradicts what this skill actually does, the playbook wins — fix
the playbook to match, not this file.

## Step 0 — Does this repo have its own playbook yet?

**Check for `docs/session-start-playbook.md` in the CURRENT project (not this skill's own
directory) before anything else.**

- **If it exists:** read it fresh, every time, and follow its steps exactly. This is the
  normal case for any repo that's run this before — X-Lifestyle's own `xls` repo included,
  whose playbook is considerably more developed than the generic starter below (a real
  SAST-timezone rule, a live GCP health check, a multi-register sweep) precisely because
  it's been run and extended there for weeks. **Never overwrite an existing project
  playbook with the generic template below, even if that template itself changes later**
  — once a repo has its own copy, it's that repo's to diverge, permanently.
- **If it does NOT exist:** this is this repo's first run. Copy this skill's own bundled
  `generic-playbook.md` (deployed alongside this file, so it's always present at
  `~/.claude/skills/session-start/generic-playbook.md`) to `docs/session-start-playbook.md`
  in the current project (creating `docs/` first if it doesn't exist), then **tell the
  user plainly, once, in this run's own output**: this repo just got a starter playbook
  copied in because it didn't have one, and it's expected to get customized/extended as
  this project actually uses the routine — the same way X-Lifestyle's own copy grew from
  the same starting point. Then proceed to actually run that freshly-copied playbook's
  steps for this first session too — don't stop and wait, a fresh repo still deserves a
  real (if mostly empty) report.

## A couple of things worth knowing, regardless of which repo this runs in

- **Every time-of-day judgment and every git-log date comparison runs on whatever
  timezone that repo's own playbook specifies** — the generic starter defaults to UTC
  and says so plainly; X-Lifestyle's own playbook pins SAST explicitly. Don't assume SAST
  (or any other specific timezone) applies outside a playbook that actually says so.
- **The persona greeting step is not cosmetic and not skippable, but it does NOT
  re-roll** — it keeps whatever persona the session's `SessionStart` hook already picked
  (see `~/.claude/scripts/pick-persona.js`, if the global persona system is installed on
  this machine) and forces that one's greeting as real output, since a persona never
  actually opens unprompted on its own without an explicit trigger like this one. If no
  persona system is installed at all, skip this step silently rather than inventing one.
- **A register/todo sweep step reads live, every time** — never hardcode a per-module
  file list in this skill or assume the shape of X-Lifestyle's own multi-register system
  applies elsewhere. A brand-new repo's own playbook should default to one plain todo
  list, not import xls's whole `TODO-`/`DEC-`/`IDEA-` apparatus on day one — that grew
  out of real, earned need over weeks, not something to hand a fresh repo up front.
- **The final "options" step is deliberately capped at three** — except on a repo with
  no register/todo list at all yet, where the one and only honest option is "set one up
  and populate it," not three manufactured choices out of nothing.
- **A reclassification suggestion is never applied silently** — any register's own
  "priority set explicitly, not inferred" rule (if that repo has one) still holds; this
  skill only ever surfaces a candidate for a human call.
- **Once a repo's own Steps 2-4 get heavy, dispatch them as parallel agents instead of
  running them inline** (added 2026-08-29) — see the generic playbook's own note on this
  and X-Lifestyle's `docs/session-start-playbook.md` Step 1.5 for the proven shape. Not a
  default for a fresh single-repo starter; a technique to reach for once a step's raw
  output volume actually earns it.
