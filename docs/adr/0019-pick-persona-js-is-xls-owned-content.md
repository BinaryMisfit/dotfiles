# 0019 — `pick-persona.js` is xls-owned content, not this repo's own

While auditing session history for the last two days (2026-09-02), a real regression was
caught live: this repo's tracked `dot_claude/scripts/executable_pick-persona.js` had not
been updated since [ADR 0017](0017-fix-pick-persona-hook-path-mismatch.md) (a deploy-*path*
fix only), while the live `~/.claude/scripts/pick-persona.js` had been patched directly by
`xls` on 2026-08-30 (commit `d7313a0`, a real nickname-collision bug in the `SessionStart`
hook) and had since moved substantially further ahead — `xls`'s own history shows the file
relocating to `claude-global/scripts/pick-persona.js` as part of consolidating all
global Claude Code tooling there, plus several more feature commits after that.

Because this repo's own CLAUDE.md never listed `pick-persona.js` under the xls-owned
domain-boundary section, a routine `chezmoi apply --force` (run to clear unrelated CRLF
drift on two persona files) silently overwrote the live, patched script with this repo's
stale copy — deleting the nickname-collision fix and several logging/auto-nickname code
paths from the live file. Caught immediately via the same session-history audit that
surfaced the original 2026-08-30 gap (a cross-session bug report and redeploy that a
dying session never got to verify landed anywhere durable).

**Status:** Decided

**Decision:** `pick-persona.js` is xls-owned content, on the same footing as
`rules/registers.instructions.md`, `skills/decision-register/`, the persona output-styles,
and the five vendored home-profile skills. Its canonical source is `xls`'s own
`claude-global/scripts/pick-persona.js`. This repo's `dot_claude/scripts/executable_pick-persona.js`
is a vendored copy, pulled from the live `~/.claude/scripts/pick-persona.js` deployment —
never authored or hand-edited here, and never overwritten by an unscoped `chezmoi apply`
without first confirming which direction actually has the newer content.

**Why:** The regression happened specifically because `pick-persona.js` looked, structurally,
like it belonged to `binary-dotfiles` (it's chezmoi/mechanics-adjacent, and ADR 0017's own
fix was about *this repo's* deploy path), but its actual *content* authorship had already
moved to `xls` well before this repo's copy was ever updated to match. Treating "which repo
does this file's packaging live in" as the same question as "who authors its content" is
exactly the mistake ADR 0014's domain-boundary distinction exists to prevent — this just
hadn't been applied to this specific file yet.

**How to apply:** `docs/session-start-playbook.md`'s Step 3.6 drift-check now includes
`scripts/executable_pick-persona.js` ↔ `~/.claude/scripts/pick-persona.js` in its pull-only
file list, same direction and same safety rule as every other xls-owned file. Before ever
running a wide or forced `chezmoi apply` again, diff `pick-persona.js` specifically first —
this file changes faster than most of what this repo tracks, since it's under active
development in `xls`.

**What got cut/kept:** The live regression was recovered in the same session it happened,
by reading the file directly out of `xls`'s own git history at its current HEAD
(`d:\source\xcl\xls\claude-global\scripts\pick-persona.js`) — no functionality was
permanently lost, but it was a close call specifically because this repo had no backup of
the live file before the forced apply overwrote it.

---
*Addendum (2026-09-03):* `pick-persona.js`'s canonical source moves with the rest of the
home-profile surface to `secretary-pool`'s own tree — see
[0024](0024-home-profile-claude-config-ownership-moves-to-secretary-pool.md). The caution
this ADR establishes (diff `pick-persona.js` specifically before any wide or forced
`chezmoi apply`) still applies unchanged, just against the new source.
