# 0007 — Split `dot_claude/` into common/work/home, gated by profile instead of one blanket switch

The user now uses Claude Code at work (with Copilot as backup), not just at home. The
previous `.chezmoiignore` rule — "Claude Code: home profile only" — is no longer true, and
everything checked into `dot_claude/rules/` and `dot_claude/skills/` before today was, per
the user's own sort call, 100% work content (corporate Jira/Azure DevOps workflow tooling)
that happened to be gated to the wrong profile the whole time. ADR 0006 already captured
the genuinely home-specific live content (the persona-picker hook, preferences). This ADR
covers the other half: making the pre-existing work content actually reach a work profile,
without leaking onto home.

**Status:** Decided

**Decision:**
1. `dot_claude/rules/` splits into three buckets:
   - **Common** (unconditional): `registers.instructions.md` — a documentation standard
     worth having on both profiles.
   - **Work-only**: `work/{branches,external-services,jira,pull-requests}.instructions.md`
     — moved from the old flat layout, `@`-included only when `profile == "work"`.
   - **Home-only**: `home/preferences.instructions.md` (from ADR 0006).
2. `dot_claude/skills/` **stays flat** — Claude Code only discovers skills at
   `~/.claude/skills/<name>/SKILL.md`, one level deep; a nested `skills/work/<name>/`
   folder would silently break discovery (confirmed via `claude-code-guide`, not assumed).
   Instead, `.chezmoiignore` gates the 11 work-specific skill directories by name when
   `profile != "work"`. `decision-register` stays ungated (common).
3. `dot_claude/output-styles/k1ra.md` and its `settings.json.tmpl` default
   (`"outputStyle": "K1ra"`) both move behind `{{ if eq $profile "work" }}` — K1ra no
   longer deploys to a home-profile machine at all, structurally, not just because the
   persona-picker hook happens to overwrite it every session.
4. Per [ADR 0004](0004-scripted-cleanup-required-for-every-removal.md), this restructure
   ships with `run_once_after_restructure-claude-work-content.{sh,ps1}.tmpl` — removes the
   old flat-path rule files unconditionally, and (on any non-work profile) the now-gated
   work-only skills and `output-styles/k1ra.md`, in case a machine had already applied the
   previous all-inclusive structure.

**Why:** the old single `.claude/**` switch conflated "which AI tool a profile uses" with
"which content within that tool applies to that profile" — those are different questions
once one tool (Claude) serves both profiles. A blanket switch also can't express "this
piece is common" at all, which the registers standard needs.

**How to apply:** any new Claude Code rule/skill goes into exactly one of common/work/home
going forward — never left flat and unscoped the way this content was before today.

**What got cut/kept:** considered nesting `skills/` the same way as `rules/` for
consistency — rejected once skill-discovery depth was verified flat-only; forcing
consistency there would have broken every work skill on a real machine.
