# Architecture Decision Records

One file per decision, numbered sequentially, never renumbered or reused. See
`~/.claude/rules/registers.instructions.md` for the full convention (entry shape, status
enum, supersession rule).

| # | Title | Status |
|---|---|---|
| [0001](0001-bootstrap-session-start-playbook.md) | Bootstrap session-start playbook for this repo | Decided |
| [0002](0002-private-prefix-is-not-encryption.md) | `private_` prefix means restrictive permissions, not encryption | Decided |
| [0003](0003-drop-private-prefix-from-npmrc.md) | Drop `private_` prefix from npmrc | Decided |
| [0004](0004-scripted-cleanup-required-for-every-removal.md) | Every removal ships with a scripted cleanup; a full uninstall path is required | Decided |
| [0005](0005-settings-json-stays-machine-portable.md) | `settings.json` stays machine-portable; machine-specific state moves to `settings.local.json` | Decided |
| [0006](0006-capture-live-home-content-into-template.md) | Capture live home-profile content into the template (Phase 1 of the work/home split) | Decided |
| [0007](0007-work-home-split-for-claude-code.md) | Split `dot_claude/` into common/work/home, gated by profile instead of one blanket switch | Decided |
| [0008](0008-interactive-bootstrap-and-finish-codex-removal.md) | Interactive profile/git-identity bootstrap; finish the Codex removal; fix a `.chezmoiremove` bug | Decided |
| [0009](0009-vendor-xls-persona-output-styles.md) | Vendor xls-owned persona output-styles into this repo for distribution | Decided |
| [0010](0010-fix-vscode-settings-profile-key-mismatch.md) | Fix `settings.json.tmpl` reading a dead `.vscode.profile` key instead of `.profile` | Decided |
| [0011](0011-chezmoi-source-can-diverge-from-working-copy.md) | Chezmoi's source directory can silently diverge from the working copy | Decided |
| [0012](0012-every-run-script-ships-as-a-pair.md) | Every run script ships as a Windows/POSIX pair, no exceptions | Decided |
| [0013](0013-todo-2-resolution-ssh-force-and-settings-drift.md) | TODO-2 resolution: force SSH via `insteadOf`, drop disputed entries, relocate machine-local permission | Decided |
| [0014](0014-registers-convention-ownership-and-domain-boundary.md) | Registers convention ownership moves to xls; domain boundary between xls and binary-dotfiles | Decided |
| [0015](0015-scoop-to-winget-migration-order-of-operations.md) | Scoop→winget migration: order-of-operations, and real gaps found running it live | Decided |
| [0016](0016-no-change-without-documentation.md) | Standing rule: no change lands without a matching documentation update, in the same change | Decided |
