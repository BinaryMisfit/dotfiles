$ErrorActionPreference = "Stop"

$Repo = "BinaryMisfit/dotfiles"

Write-Host "bootstrap: starting"
Write-Host "bootstrap: repo=$Repo"

# Ensure Scoop
if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) {
    Write-Host "scoop: installing..."
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    irm get.scoop.sh | iex
}

# Ensure Scoop shims are available in this session
$env:PATH = "$HOME\scoop\shims;$env:PATH"

# Install core tools
Write-Host "scoop: installing core tools..."
scoop install git chezmoi age mise starship

# Ensure paths for this session
$env:PATH = "$HOME\scoop\shims;$HOME\.local\share\mise\shims;$env:PATH"

# Verify tools
$chezmoi = Get-Command chezmoi -ErrorAction SilentlyContinue
$agekeygen = Get-Command age-keygen -ErrorAction SilentlyContinue
$sshkeygen = Get-Command ssh-keygen -ErrorAction SilentlyContinue

if (-not $chezmoi) { throw "chezmoi not found after install" }
if (-not $agekeygen) { throw "age-keygen not found after install" }
if (-not $sshkeygen) { throw "ssh-keygen not found" }

Write-Host "chezmoi: using $($chezmoi.Source)"
Write-Host "age-keygen: using $($agekeygen.Source)"
Write-Host "ssh-keygen: using $($sshkeygen.Source)"

# Paths
$chezmoiDir = "$HOME\.config\chezmoi"
$chezmoiConfig = "$chezmoiDir\chezmoi.yaml"

$ageDir = "$HOME\.config\age"
$keyPath = "$ageDir\key.txt"

$sshDir = "$HOME\.ssh"
$sshKeyPath = "$sshDir\id_ed25519_github"

New-Item -ItemType Directory -Force -Path $chezmoiDir | Out-Null
New-Item -ItemType Directory -Force -Path $ageDir | Out-Null
New-Item -ItemType Directory -Force -Path $sshDir | Out-Null

# Generate machine-local age key
if (-not (Test-Path $keyPath)) {
    Write-Host "age: generating machine-local key..."
    age-keygen -o $keyPath | Out-Null
} else {
    Write-Host "age: key already exists at $keyPath"
}

# Extract age public key
$recipient = Select-String "# public key:" $keyPath |
    ForEach-Object { $_.Line -replace "# public key: ", "" } |
    Select-Object -First 1

if (-not $recipient) {
    throw "age: failed to read public key from $keyPath"
}

# Create chezmoi config only if missing.
# Do not overwrite: local data such as git identity lives here.
if (-not (Test-Path $chezmoiConfig)) {
@"
encryption: age

age:
  identities:
    - $keyPath
  recipients:
    - $recipient
"@ | Set-Content $chezmoiConfig

    Write-Host "chezmoi: created config at $chezmoiConfig"
} else {
    Write-Host "chezmoi: config already exists, leaving it untouched"
}

# Generate machine-local SSH key for GitHub
if (-not (Test-Path $sshKeyPath)) {
    Write-Host "ssh: generating machine-local GitHub key..."
    ssh-keygen -t ed25519 -C "github-dotfiles-$env:COMPUTERNAME" -f $sshKeyPath -N "" | Out-Null
} else {
    Write-Host "ssh: GitHub key already exists at $sshKeyPath"
}

$sshPublicKey = Get-Content "$sshKeyPath.pub" -ErrorAction SilentlyContinue
if (-not $sshPublicKey) {
    throw "ssh: failed to read public key from $sshKeyPath.pub"
}

# Init repo using default chezmoi source path
$chezmoiSource = "$HOME\.local\share\chezmoi"

if (-not (Test-Path $chezmoiSource)) {
    Write-Host "chezmoi: init $Repo"
    chezmoi init $Repo
} else {
    Write-Host "chezmoi: source already exists at $chezmoiSource"
}

# Check local git identity data required by dot_gitconfig.tmpl
$hasGitIdentity = Select-String `
    -Path $chezmoiConfig `
    -Pattern "^\s*git:\s*$" `
    -Quiet `
    -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "bootstrap: setup complete"
Write-Host ""

Write-Host "age public key for this machine:"
Write-Host $recipient
Write-Host ""

Write-Host "ssh public key for GitHub:"
Write-Host $sshPublicKey
Write-Host ""

Write-Host "IMPORTANT:"
Write-Host " Back up this file:"
Write-Host " $keyPath"
Write-Host ""
Write-Host " Losing it = losing access to encrypted secrets."
Write-Host ""

Write-Host "Add SSH key to GitHub:"
Write-Host " GitHub -> Settings -> SSH and GPG keys -> New SSH key"
Write-Host ""

if (-not $hasGitIdentity) {
    Write-Host "=== GIT IDENTITY REQUIRED ==="
    Write-Host ""
    Write-Host "Edit:"
    Write-Host " $chezmoiConfig"
    Write-Host ""
    Write-Host "Add:"
    Write-Host "data:"
    Write-Host "  git:"
    Write-Host "    name: Your Name"
    Write-Host "    email: you@example.com"
    Write-Host ""
}

Write-Host "Next:"
Write-Host " chezmoi diff"
Write-Host " chezmoi apply"
Write-Host ""

Write-Host "After apply, verify:"
Write-Host " chezmoi managed"
Write-Host " git config user.name"
Write-Host " git config user.email"
Write-Host " mise doctor"
Write-Host " ssh -T git@github.com"
Write-Host ""

Write-Host "bootstrap: complete"
