[Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

$profileDir = Split-Path -Parent $PROFILE

# Token loader
$envLoader = Join-Path $profileDir "env.ps1"
if (Test-Path $envLoader) {
    . $envLoader
}

# oh-my-posh
$ompTheme = Join-Path $profileDir "themes\pwsh10k.omp.json"

if ((Get-Command oh-my-posh -ErrorAction SilentlyContinue) -and (Test-Path $ompTheme)) {
    oh-my-posh init pwsh --config $ompTheme | Invoke-Expression
}

# mise
if (Get-Command mise -ErrorAction SilentlyContinue) {
    mise activate pwsh | Out-String | Invoke-Expression
}

# basic aliases
Set-Alias ll Get-ChildItem
Set-Alias g git

if (Get-Command nvim -ErrorAction SilentlyContinue) {
    Set-Alias vim nvim
    Set-Alias vi nvim
}

# Keymaps
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward
Set-PSReadLineOption -BellStyle None
Set-PSReadLineOption -PredictionSource History
