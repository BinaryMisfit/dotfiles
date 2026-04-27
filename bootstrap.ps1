$ErrorActionPreference = "Stop"

$Repo = $env:CHEZMOI_REPO
if (-not $Repo) {
    $Repo = "BinaryMisfit/dotfiles"
}

$ChezmoiDir = "$HOME\.config\chezmoi"
$ChezmoiConfig = "$ChezmoiDir\chezmoi.yaml"

$AgeDir = "$HOME\.config\age"
$AgeKey = "$AgeDir\key.txt"

$SourceDir = "$HOME\.local\share\chezmoi"
$SshRemote = "git@github.com:$Repo.git"

$SshDir = "$HOME\.ssh"
$SshKey = "$SshDir\id_ed25519_github"

function Section {
    param([string]$Name)
    Write-Host ""
    Write-Host "==> $Name"
}

function Info {
    param([string]$Message)
    Write-Host "  $Message"
}

function Die {
    param([string]$Message)
    throw "ERROR: $Message"
}

Section "bootstrap"
Info "repo: $Repo"

Section "scoop"

if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) {
    Info "installing scoop"
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    irm get.scoop.sh | iex
} else {
    Info "scoop already installed"
}

Section "core tools"

$Tools = @("git", "chezmoi", "age", "mise", "oh-my-posh", "openssh", "mingw")

foreach ($Tool in $Tools) {
    Info "ensuring $Tool"
    scoop install $Tool
}

$Chezmoi = Get-Command chezmoi -ErrorAction SilentlyContinue
$AgeKeygen = Get-Command age-keygen -ErrorAction SilentlyContinue
$SshKeygen = Get-Command ssh-keygen -ErrorAction SilentlyContinue

if (-not $Chezmoi) { Die "chezmoi not found after install" }
if (-not $AgeKeygen) { Die "age-keygen not found after install" }
if (-not $SshKeygen) { Die "ssh-keygen not found after install" }

Info "chezmoi: $($Chezmoi.Source)"
Info "age-keygen: $($AgeKeygen.Source)"

Section "age identity"

New-Item -ItemType Directory -Force -Path $ChezmoiDir | Out-Null
New-Item -ItemType Directory -Force -Path $AgeDir | Out-Null

if (-not (Test-Path $AgeKey)) {
    Info "generating machine-local age key"
    age-keygen -o $AgeKey | Out-Null
} else {
    Info "key already exists: $AgeKey"
}

$AgeRecipient = Select-String "# public key:" $AgeKey |
    ForEach-Object { $_.Line -replace "# public key: ", "" } |
    Select-Object -First 1

if (-not $AgeRecipient) {
    Die "failed to read age public key"
}

Section "chezmoi config"

if (-not (Test-Path $ChezmoiConfig)) {
@"
encryption: age

age:
  identities:
    - $AgeKey
  recipients:
    - $AgeRecipient
"@ | Set-Content $ChezmoiConfig

    Info "created: $ChezmoiConfig"
} else {
    Info "config already exists, leaving untouched"
}

$HasGitIdentity = $false
if (Test-Path $ChezmoiConfig) {
    $HasGitIdentity = Select-String `
        -Path $ChezmoiConfig `
        -Pattern "^\s*git:\s*$" `
        -Quiet `
        -ErrorAction SilentlyContinue
}

Section "github ssh key"

New-Item -ItemType Directory -Force -Path $SshDir | Out-Null

if (-not (Test-Path $SshKey)) {
    Info "generating machine-local GitHub SSH key"
    ssh-keygen -t ed25519 -C "github-dotfiles-$env:COMPUTERNAME" -f $SshKey -N "" | Out-Null
} else {
    Info "key already exists: $SshKey"
}

$SshPublicKey = Get-Content "$SshKey.pub" -ErrorAction SilentlyContinue
if (-not $SshPublicKey) {
    Die "failed to read SSH public key"
}

Section "chezmoi source"

if (-not (Test-Path $SourceDir)) {
    Info "initializing source: $Repo"
    chezmoi init $Repo
} else {
    Info "source already exists: $SourceDir"
}

Section "git remote"

if (Test-Path "$SourceDir\.git") {
    $CurrentRemote = git -C $SourceDir remote get-url origin 2>$null

    if ($CurrentRemote -ne $SshRemote) {
        Info "setting origin to SSH: $SshRemote"
        git -C $SourceDir remote set-url origin $SshRemote
    } else {
        Info "origin already uses SSH"
    }
} else {
    Info "chezmoi source is not a git repo, skipping remote update"
}

Section "next steps"

$Reencrypt = 'chezmoi cd; chezmoi decrypt private_dot_config/shell/encrypted_private_env.age > $env:TEMP\env; Get-Content $env:TEMP\env | chezmoi encrypt > private_dot_config/shell/encrypted_private_env.age; Remove-Item $env:TEMP\env; git add .; git commit -m "Add new machine age recipient"; git push'
$ChezmoiNext = 'chezmoi update; chezmoi diff; chezmoi apply'

Write-Host ""
Write-Host "Age Public Key:"
Write-Host "  $AgeRecipient"
Write-Host ""

Write-Host "GitHub SSH Key:"
Write-Host "  $SshPublicKey"
Write-Host ""

if (-not $HasGitIdentity) {
    Write-Host "Git username/email missing from $ChezmoiConfig"
    Write-Host "Add:"
    Write-Host "  data:"
    Write-Host "    git:"
    Write-Host "      name: Your Name"
    Write-Host "      email: you@example.com"
    Write-Host ""
}

Write-Host "To re-encrypt, add key to recipients in chezmoi config on source machine and run:"
Write-Host "  $Reencrypt"
Write-Host ""

Write-Host "When done run:"
Write-Host "  $ChezmoiNext"
Write-Host ""

Write-Host "Verify:"
Write-Host "  ssh -T git@github.com"
Write-Host '  git -C "$HOME\.local\share\chezmoi" remote -v'
Write-Host "  mise doctor"
Write-Host ""

Write-Host "bootstrap: complete"
