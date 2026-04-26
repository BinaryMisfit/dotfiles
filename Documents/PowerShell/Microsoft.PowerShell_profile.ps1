[Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

# Token loader
$envLoader = "$HOME\Documents\PowerShell\env.ps1"
if (Test-Path $envLoader) {
    . $envLoader
}

# Prompt (Oh My Posh - P10K equivalent)
if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
    oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\powerlevel10k_rainbow.omp.json" | Invoke-Expression
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
