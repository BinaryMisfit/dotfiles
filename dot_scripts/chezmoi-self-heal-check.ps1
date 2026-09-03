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
# Implemented 2026-09-03 (TODO-5 / ADR 0023). chezmoi's own state tracking
# (chezmoistate.boltdb / `chezmoi state dump`) can't distinguish a genuinely
# interrupted apply from ordinary unapplied drift -- researched for real,
# not guessed. The actual answer is a sentinel marker set by chezmoi's
# native hooks.apply.pre and cleared by hooks.apply.post (see
# run_once_configure-chezmoi-apply-hooks.ps1.tmpl): if the marker exists
# right now, a previous `chezmoi apply` started and never finished (killed,
# crashed, machine rebooted mid-apply).
Write-Host "`n--- Interrupted-apply detection ---"
$MarkerPath = Join-Path $HOME ".chezmoi-apply-in-progress"
$ConfigCandidates = @(
    (Join-Path $HOME ".config\chezmoi\chezmoi.yaml"),
    (Join-Path $HOME ".config\chezmoi\chezmoi.yml"),
    (Join-Path $HOME ".config\chezmoi\chezmoi.toml"),
    (Join-Path $HOME ".config\chezmoi\chezmoi.json")
)
$ConfigFile = $ConfigCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
$HooksConfigured = $ConfigFile -and (Select-String -Path $ConfigFile -Pattern "chezmoi-apply-marker" -Quiet)

if (-not $HooksConfigured) {
    Write-Host "detection not active -- apply hooks aren't configured yet (run_once_configure-chezmoi-apply-hooks hasn't run, or its own real collision with an existing 'hooks' key is still unresolved)"
} elseif (Test-Path $MarkerPath) {
    Write-Host "INTERRUPTED APPLY: marker found at $MarkerPath -- a previous 'chezmoi apply' started and never completed" -ForegroundColor Red
    $issues += "interrupted apply: marker present at $MarkerPath"
} else {
    Write-Host "clean -- no interrupted apply detected"
}

Write-Host "`n=== Summary ==="
if ($issues.Count -eq 0) {
    Write-Host "No issues found in the tiers checked." -ForegroundColor Green
} else {
    Write-Host "$($issues.Count) issue(s) found:" -ForegroundColor Yellow
    $issues | ForEach-Object { Write-Host "  - $_" }
    Write-Host "`nNothing has been changed. Review and act manually."
}
