# 0010 — Fix `settings.json.tmpl` reading a dead `.vscode.profile` key instead of `.profile`

While reviewing `.chezmoitemplates/vscode/settings.json.tmpl` for the AI-chat/Copilot
gating block, traced its `$profile` variable back to `get $vscode "profile" | default
"home"` — i.e. `.vscode.profile`, not the top-level `.profile` every other
profile-gated thing in this repo reads (Claude Code content, Copilot content,
`extensions.txt.tmpl`). Checked `.chezmoi.yaml.tmpl` and this machine's live
`chezmoi.yaml`: neither has ever set `vscode.profile` — only `vscode.layout` exists
under that key. `CLAUDE.md` (line 60, pre-fix) even documented `.vscode.profile` as the
real gating key, but the extensions template it was describing has always used the
top-level `.profile` instead — the doc and two sibling templates disagreed with each
other, and none of the three agreed on which key was authoritative.

**Status:** Decided

**Decision:** `$profile` in `settings.json.tmpl` now reads `get . "profile" | default
"home"` — the same top-level key as everything else. Corrected `CLAUDE.md`'s VS Code
Extensions section to state plainly that both the extensions list and the settings AI
gating use the one shared `.profile` value, not a separate namespaced key.

**Why:** because `vscode.profile` was never populated anywhere, `$profile` silently
defaulted to `"home"` on every machine regardless of actual profile, which forced
`chat.disableAIFeatures: true` and `github.copilot.enable: {"*": false}` unconditionally
— including on a real work-profile machine, where Copilot is explicitly meant to be
enabled as the work AI backup (see [ADR 0007](0007-work-home-split-for-claude-code.md)).
A silent default masked this until someone actually traced the data flow rather than
just reading the block in isolation.

**How to apply:** any future per-tool setting that needs to branch on work/home should
read the shared top-level `.profile`, never invent a nested `<tool>.profile` key —
`vscode.layout` is a legitimate nested key (a real per-tool setting with no analog
elsewhere), but `profile` itself is a single cross-cutting value and should never be
duplicated under a tool's own namespace.
