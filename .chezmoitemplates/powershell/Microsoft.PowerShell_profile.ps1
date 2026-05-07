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
