#!powershell
# Sets/clears the sentinel marker chezmoi's own hooks.apply.pre/post use to
# flag a `chezmoi apply` in progress -- see
# run_once_configure-chezmoi-apply-hooks.ps1.tmpl and ADR 0023 for why this
# exists (chezmoi's own state tracking can't distinguish an interrupted
# apply from ordinary unapplied drift; a marker set by pre and cleared by
# post is the only mechanism that actually answers the question).
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("set", "clear")]
    [string]$Action
)

$MarkerPath = Join-Path $HOME ".chezmoi-apply-in-progress"

if ($Action -eq "set") {
    New-Item -ItemType File -Force -Path $MarkerPath | Out-Null
} else {
    Remove-Item -Force -ErrorAction SilentlyContinue -Path $MarkerPath
}
