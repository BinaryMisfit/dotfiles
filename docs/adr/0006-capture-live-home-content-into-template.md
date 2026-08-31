# 0006 — Capture live home-profile content into the template (Phase 1 of the work/home split)

Comparing this repo's tracked `dot_claude/*` against the live machine (2026-08-30/31)
found real, active content that existed only on disk, never in source: the `SessionStart`
persona-picker hook, `model`/`CLAUDE_CODE_SUBAGENT_MODEL` pins, and two `CLAUDE.md`
sections ("preferred name," "work priority tiers"). This is step one of splitting
`dot_claude/` into common/work/home content — see the todo register for the rest.

**Status:** Decided

**Decision:**
1. `pick-persona.js` (1021 lines, previously unmanaged at `~/.claude/scripts/`) is now
   tracked at `dot_claude/home/scripts/executable_pick-persona.js`.
2. `dot_claude/settings.json.tmpl`'s home-only block (`{{ if eq $profile "home" }}`) now
   carries `CLAUDE_CODE_SUBAGENT_MODEL`, `model: sonnet`, and the `hooks.SessionStart`
   block referencing the now-managed script path — templated, not hardcoded to this
   machine's home directory.
3. `OTEL_RESOURCE_ATTRIBUTES` changed from the hardcoded `host.name=Grogu` to
   `host.name={{ .chezmoi.hostname }}` — portable across machines instead of describing
   only this one.
4. The two `CLAUDE.md` sections moved to `dot_claude/rules/home/preferences.instructions.md`,
   `@`-included only on the home profile.

**Why:** none of this was capturable before because it simply wasn't in source — the
live machine had drifted ahead of what this repo tracked. Bringing it in is the
prerequisite for the full work/home restructure (a folder split can't be trusted while
real content still only exists live).

**How to apply:** any future genuinely home-specific setting or script gets added under
`dot_claude/home/` or a `{{ if eq $profile "home" }}` block — never left live-only again.
`permissions.allow` and `additionalDirectories` are the one exception: those stay in
`settings.local.json` on each machine, never templated (see [ADR 0005](0005-settings-json-stays-machine-portable.md)).

**What got cut/kept:** kept the hook and model pins as home-only rather than promoting them
to always-on, since they're specific to this persona-driven home workflow, not something
a work-profile Claude Code session should inherit.

---
*Addendum (2026-08-31):* decision point 1's tracked path, `dot_claude/home/scripts/`, was
wrong — it deployed to `~/.claude/home/scripts/pick-persona.js`, not the script's real
live location `~/.claude/scripts/pick-persona.js`. Two files existed on disk; the stale
`home/scripts` one stayed wired into the `SessionStart` hook while every real fix landed
on the correct one, unused. See [ADR 0017](0017-fix-pick-persona-hook-path-mismatch.md)
for the investigation and fix. The home-profile *gating* here (point 2's `{{ if eq
$profile "home" }}` block) was correct and is unchanged.
