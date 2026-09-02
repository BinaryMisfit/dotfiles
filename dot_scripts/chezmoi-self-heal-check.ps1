#!powershell
# TODO-5 (docs/todo-register.md) -- detects broken/drifted chezmoi state.
# DETECTION ONLY, same posture as TODO-3's chezmoi-update-check.ps1: never
# fixes anything automatically. Prints a report; a human decides what to
# do with it. Manually invoked for now, not scheduled -- scheduling and
# any actual repair action are still open design questions.
$ErrorActionPreference = "Continue"

Write-Host "=== chezmoi self-heal check (Windows) ===" -ForegroundColor Cyan
$issues = @()

# --- Tier: drift (reuses the same pull+diff TODO-3 already established) ---
Write-Host "`n--- Checking for drift ---"
chezmoi update --apply=false 2>&1 | Out-Null
$diffOutput = chezmoi diff 2>&1 | Out-String
if ($diffOutput -and $diffOutput.Trim().Length -gt 0) {
    $fileCount = ([regex]::Matches($diffOutput, "(?m)^diff --git")).Count
    Write-Host "DRIFT: $fileCount file(s) differ from template. Run 'chezmoi diff' to review." -ForegroundColor Yellow
    $issues += "drift: $fileCount file(s)"
} else {
    Write-Host "clean -- no drift"
}

# --- Tier: missing run_once side effects ---
# Maps each constructive run_once_* script to the on-disk side effect it
# should have produced. Cleanup scripts (run_once_after_remove-*) are left
# out of this pass -- their "side effect" is an absence, a different and
# lower-priority check to add later, not skipped by oversight.
Write-Host "`n--- Checking run_once side effects ---"
$expectedEffects = @(
    @{ Name = "nvim config junction"; Path = (Join-Path $env:LOCALAPPDATA "nvim") }
    @{ Name = "GitHub SSH key"; Path = (Join-Path $HOME ".ssh\id_ed25519_github") }
    @{ Name = "chezmoi update scheduled task"; Check = { (Get-ScheduledTask -TaskName "BinaryDotfilesChezmoiUpdateCheck" -ErrorAction SilentlyContinue) -ne $null } }
)

foreach ($effect in $expectedEffects) {
    $present = if ($effect.Check) { & $effect.Check } else { Test-Path $effect.Path }
    if ($present) {
        Write-Host "present: $($effect.Name)"
    } else {
        Write-Host "MISSING: $($effect.Name)" -ForegroundColor Yellow
        $issues += "missing: $($effect.Name)"
    }
}

# --- Tier: interrupted apply ---
# NOT YET IMPLEMENTED. Detecting a genuinely half-applied state (vs. just
# normal pending drift) needs real research into chezmoi's own state
# tracking (chezmoistate.boltdb / `chezmoi state dump`) rather than a
# guessed heuristic -- flagging honestly as open, not faking a check.
Write-Host "`n--- Interrupted-apply detection ---"
Write-Host "not yet implemented -- needs research into chezmoi's own state tracking before a real check can be written"

Write-Host "`n=== Summary ==="
if ($issues.Count -eq 0) {
    Write-Host "No issues found in the tiers checked." -ForegroundColor Green
} else {
    Write-Host "$($issues.Count) issue(s) found:" -ForegroundColor Yellow
    $issues | ForEach-Object { Write-Host "  - $_" }
    Write-Host "`nNothing has been changed. Review and act manually."
}
