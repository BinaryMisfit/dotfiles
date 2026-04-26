[Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

# Token loader
$envLoader = "$HOME\Documents\PowerShell\env.ps1"
if (Test-Path $envLoader) {
    . $envLoader
}

# oh-my-posh
$ompTheme = "$HOME\Documents\PowerShell\themes\pwsh10k.omp.json"

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
Set-PSReadlineKeyHandler -Key UpArrow -Function HistorySearchBackward
Set-PSReadlineKeyHandler -Key DownArrow -Function HistorySearchForward
Set-PSReadLineOption -BellStyle None
Set-PSReadLineOption -PredictionSource History
