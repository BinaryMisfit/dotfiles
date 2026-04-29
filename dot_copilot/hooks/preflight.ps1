# PowerShell wrapper for copilot preflight
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) { $python = (Get-Command python3 -ErrorAction SilentlyContinue).Source }
if (-not $python) { Write-Error 'Python not found in PATH'; exit 127 }
$script = Join-Path $PSScriptRoot 'preflight.py'
& $python $script @args
exit $LASTEXITCODE