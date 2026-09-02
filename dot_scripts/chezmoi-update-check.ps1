#!powershell
# Daily scheduled check for TODO-3 (docs/todo-register.md) -- pulls the
# chezmoi source and checks for a pending diff, but NEVER applies
# unattended. See ADR 0022 for why: a forced apply earlier the same day
# this was built silently regressed a live file, so an unattended job
# stays pull+diff+notify only, human applies.
$ErrorActionPreference = "Continue"
$Marker = Join-Path $HOME "CHEZMOI_UPDATE_AVAILABLE.txt"

chezmoi update --apply=false 2>&1 | Out-Null
$DiffOutput = chezmoi diff 2>&1 | Out-String

if ($DiffOutput -and $DiffOutput.Trim().Length -gt 0) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Content = "chezmoi update available -- checked $Timestamp`n`n" +
        "Run 'chezmoi diff' to review, 'chezmoi apply' to apply. Nothing has been applied automatically.`n`n" +
        "--- diff ---`n$DiffOutput"
    Set-Content -Path $Marker -Value $Content -Encoding UTF8

    # Best-effort native toast -- skip silently if the module isn't installed
    # rather than adding a new required dependency for a notify-only check.
    try {
        Import-Module BurntToast -ErrorAction Stop
        New-BurntToastNotification -Text "chezmoi update available", "Run 'chezmoi diff' to review."
    } catch {
        # no toast module -- the marker file is the real notification
    }
} else {
    if (Test-Path $Marker) {
        Remove-Item -Force $Marker
    }
}
