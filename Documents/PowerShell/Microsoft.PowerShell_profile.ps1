[Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

# starship
if (Get-Command starship -ErrorAction SilentlyContinue) {
    Invoke-Expression (&starship init powershell)
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
