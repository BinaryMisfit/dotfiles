# PowerShell wrapper for msg-validator
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) { $python = (Get-Command python3 -ErrorAction SilentlyContinue).Source }
if (-not $python) { Write-Error 'Python not found in PATH'; exit 127 }
$script = Join-Path $PSScriptRoot 'msg-validator.py'
& $python $script $args[0]
exit $LASTEXITCODE