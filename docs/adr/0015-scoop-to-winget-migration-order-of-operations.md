# 0015 — Scoop→winget migration: order-of-operations, and real gaps found running it live

Running the first real `chezmoi apply` after `run_once_after_remove-scoop-mise.ps1.tmpl`
was introduced raised a genuine risk: that script uninstalls Scoop and everything it
installed, **including `chezmoi` itself** if it was originally Scoop-installed — a machine
running `chezmoi apply` with a Scoop-installed `chezmoi.exe` could delete its own running
binary mid-execution. Traced the existing design intent in `bootstrap.ps1`: it installs
`chezmoi` via `winget` (`twpayne.chezmoi`), a separate binary from any Scoop-installed
copy, specifically so a fresh winget-installed `chezmoi` already owns the process before
the removal script fires later in the same `chezmoi apply` run (per that script's own
header comment). The path was already designed correctly; it had just never been walked
through deliberately end-to-end.

A second migration, run for real on a work machine (existing chezmoi-managed, profile
`work`, switching from Scoop rather than a fresh bootstrap), found two real template gaps
neither of the two home-machine runs had surfaced: PowerShell 7 and Git had been shadowed
by Scoop and were never in the `winget` package list at all, so removing Scoop left neither
reinstalled; and `claudeCode.preferredLocation` was set live-only in VS Code settings, not
sourced from the template.

**Status:** Decided

**Decision:** the safe migration order on an existing Scoop-based machine is: (1) sync the
chezmoi source per ADR 0011, (2) explicitly `winget install --id twpayne.chezmoi ...` and
verify `(Get-Command chezmoi).Source` no longer resolves into a Scoop path *before*
running `chezmoi apply`, (3) review the diff, (4) back up every file about to change, (5)
run `chezmoi apply` in a real interactive terminal (its own conflict/confirmation prompts
need a real TTY, confirmed live — piped stdin does not satisfy them), (6) verify
`chezmoi status`/`chezmoi diff` come back empty afterward. Added `Microsoft.PowerShell` and
`Git.Git` to `run_onchange_install-tools.ps1.tmpl`'s package list and
`claudeCode.preferredLocation` to `.chezmoitemplates/vscode/settings.json.tmpl` to close
the two real gaps found.

**Why:** the chezmoi-deletes-itself risk is real but was never actually exercised until
this pass — verifying it by design-reading `bootstrap.ps1`/the removal script's own
comments, then confirming with a live migration, is what turned "should be fine" into
"confirmed fine, with a documented order." The two package-list gaps would have silently
broken PowerShell/Git on every future machine repeating this same migration, undiscovered
until someone actually ran it.

**How to apply:** any future machine still on Scoop follows the six-step order above.
Neither this repo's own uninstall path (TODO-1, still open) nor a future automation of
this migration should skip the explicit `winget install chezmoi` + verification step —
it's the one check that actually prevents the binary-deletes-itself failure mode.
