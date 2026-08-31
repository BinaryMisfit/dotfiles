# 0017 — Fix pick-persona.js SessionStart hook path mismatch

Investigating a reported "flaky self-registration" / registrations silently clearing
mid-session in the persona registry (`~/.claude/persona-registry.json`, owned by `xls`)
turned up a structural bug on this repo's side: the `SessionStart` hook this machine
actually runs on every session does not call the script anyone has been fixing.

[ADR 0006](0006-capture-live-home-content-into-template.md) tracked `pick-persona.js`
at `dot_claude/home/scripts/executable_pick-persona.js`, deploying to
`~/.claude/home/scripts/pick-persona.js`. But the script's real, live location — the
one `xls`'s own `sync-global-claude-config.js` deploys to, the one the `persona` skill's
own documentation references throughout, the one every `--switch`/`--set-nickname`/
`--resolve` CLI call in this session actually targeted — is `~/.claude/scripts/pick-persona.js`,
with no `home/` segment. ADR 0006 conflated two different things: "gate this content to
the home profile" (a chezmoi templating concept — `{{ if eq $profile "home" }}`, applied
correctly) and "nest it under a literal `dot_claude/home/` directory" (a path concept,
applied incorrectly — chezmoi mirrors directory structure 1:1, so this silently changed
the deploy target itself, not just its gating).

Net effect: two `pick-persona.js` files existed on disk. The real one (`~/.claude/scripts/`)
received every fix from `xls` and every manual CLI invocation this session. The stale one
(`~/.claude/home/scripts/`, 191 lines behind at time of discovery) was the one actually
wired into `~/.claude/settings.json`'s `SessionStart` hook, so it ran on every real
session start — missing months of evolution (rotation, cascade, self-heal, submodule
family-resolution) depending on how old the drift was. Because the hook unconditionally
nulls `sessionName` on every fire (by design — a fresh harness process means the prior
registration is dead) and relies on the session re-registering itself afterward, any
internal SessionStart re-fire mid-session (compaction, resume) with nothing forcing a
re-register would silently drop the registration — reproducing the reported symptom
without needing an hour-based timer, which turned out never to have been built anywhere
in either file.

**Status:** Decided

**Decision:** Track `pick-persona.js` at `dot_claude/scripts/executable_pick-persona.js`
(deploying to `~/.claude/scripts/pick-persona.js` — no `home/` segment), matching its
real, live location and every other tool's assumption about where it lives.
`dot_claude/settings.json.tmpl`'s `SessionStart` hook command is updated to match. The
stale `~/.claude/home/scripts/` copy is removed from tracking, with a scripted cleanup
(`run_once_after_remove-stale-pick-persona.*`) deleting the deployed file (and, if now
empty, the `~/.claude/home/scripts/` directory) on every machine, per
[ADR 0004](0004-scripted-cleanup-required-for-every-removal.md).

**Why:** the wrong path was silently swallowing every fix pushed to the real script and
was the leading candidate for the "flaky self-registration" symptom BinaryMisfit
reported. The home-profile *gating* in ADR 0006 (the `{{ if eq $profile "home" }}` block
around the hook/model/env settings) was correct and stays as-is — only the literal
tracked path for the script itself was wrong.

**How to apply:** any global `xls`-authored script deployed to a fixed location under
`~/.claude/` (scripts, output-styles, skills) gets tracked at the matching path under
`dot_claude/` with no extra nesting, even when its use is gated to one profile —
profile-gating is a template condition on the settings/hook that *references* the
script, never a change to the script's own tracked or deployed path. Mirrors how
`dot_claude/output-styles/*.md` already tracks `~/.claude/output-styles/*.md` directly.

---
*Addendum note: [ADR 0006](0006-capture-live-home-content-into-template.md) carries a
pointer to this record for its now-corrected decision point 1.*
