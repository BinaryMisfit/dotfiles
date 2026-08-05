#!powershell
$ErrorActionPreference = "Continue"

$tools = @(
    "git",
    "chezmoi",
    "age",
    "rg",
    "fd",
    "fzf",
    "bat",
    "jq",
    "lazygit",
    "node",
    "python",
    "nvim",
    "gcc"
)

Write-Host ""
Write-Host "==> Environment audit"
Write-Host "OS: Windows"
Write-Host ""

foreach ($tool in $tools) {
    Write-Host "==> $tool"

    $cmd = Get-Command $tool -ErrorAction SilentlyContinue

    if (-not $cmd) {
        Write-Host "MISSING: $tool" -ForegroundColor Red
        Write-Host ""
        continue
    }

    Write-Host "Path: $($cmd.Source)"

    try {
        & $tool --version
    } catch {
        Write-Host "WARN: failed to run $tool --version" -ForegroundColor Yellow
    }

    Write-Host ""
}
