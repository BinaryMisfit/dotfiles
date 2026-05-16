[Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

$profileDir = Split-Path -Parent $PROFILE

# oh-my-posh
$ompTheme = Join-Path $profileDir "themes\pwsh10k.omp.json"

if ((Get-Command oh-my-posh -ErrorAction SilentlyContinue) -and (Test-Path $ompTheme)) {
    oh-my-posh init pwsh --config $ompTheme | Invoke-Expression
}

# mise
if (Get-Command mise -ErrorAction SilentlyContinue) {
    mise activate pwsh | Out-String | Invoke-Expression
}

# zoxide
if (Get-Command zoxide -ErrorAction SilentlyContinue) {
    zoxide init powershell | Out-String | Invoke-Expression
}

# User-local bin
$UserLocalBin = Join-Path $HOME ".local\bin"

if (Test-Path $UserLocalBin) {
    $PathParts = $env:Path -split [IO.Path]::PathSeparator

    if ($PathParts -notcontains $UserLocalBin) {
        $env:Path = ($PathParts + $UserLocalBin) -join [IO.Path]::PathSeparator
    }
}

# Clipboard helper
function clip {
    param(
        [Parameter(ValueFromPipeline = $true)]
        [object] $InputObject,

        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]] $Text
    )

    begin {
        $items = New-Object System.Collections.Generic.List[string]
    }

    process {
        if ($null -ne $InputObject) {
            $line = [string]$InputObject
            $items.Add($line)
            Write-Output $line
        }
    }

    end {
        if ($Text.Count -gt 0) {
            $joined = $Text -join " "
            $items.Add($joined)
            Write-Output $joined
        }

        $items -join [Environment]::NewLine | Set-Clipboard
    }
}

# basic aliases
Set-Alias g git

if (-not (Get-Command eza -ErrorAction SilentlyContinue)) {
    Set-Alias ll Get-ChildItem
}

if (Get-Command eza -ErrorAction SilentlyContinue) {
    function l  { eza --group-directories-first @args }
    function ll { eza -la --group-directories-first --git @args }
    function la { eza -la --group-directories-first @args }
    function lt { eza --tree --level=2 --group-directories-first @args }
}

if (Get-Command nvim -ErrorAction SilentlyContinue) {
    Set-Alias vim nvim
    Set-Alias vi nvim
}

function netctrl-tmux {
    ssh -t netctrl "tmux new -A -s ops"
}

Set-Alias nt netctrl-tmux

# PSReadLine defaults
Set-PSReadLineOption -BellStyle None
Set-PSReadLineOption -PredictionSource History

# Fallback history keys only when Atuin is unavailable.
if (-not (Get-Command atuin -ErrorAction SilentlyContinue)) {
    Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
    Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward
}

# Atuin owns history keybinds when available.
# Keep this last so it wins over PSReadLine bindings. Tiny keyboard coup.
if (Get-Command atuin -ErrorAction SilentlyContinue) {
    atuin init powershell | Out-String | Invoke-Expression
}
