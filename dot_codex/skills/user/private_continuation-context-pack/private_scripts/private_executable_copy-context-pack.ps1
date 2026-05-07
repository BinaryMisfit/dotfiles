#!powershell
param(
    [Parameter(Mandatory = $true)]
    [string]$Text
)

$ErrorActionPreference = "Stop"

try {
    Set-Clipboard -Value $Text
    Write-Output "Context pack copied to clipboard."
} catch {
    $Text | clip.exe
    Write-Output "Context pack copied to clipboard."
}
