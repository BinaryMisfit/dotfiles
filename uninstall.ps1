#!powershell
# Reverses everything this repo's chezmoi source manages on a Windows machine.
# Rule, BinaryMisfit's own: the ONLY thing this script never touches is
# whatever bootstrap.ps1 itself runs -- chezmoi's own install/config, the
# age key, and the GitHub SSH key (bootstrap generates both directly).
# Everything else this repo causes to exist on a machine gets reversed,
# including installed packages. See TODO-1 in docs/todo-register.md and
# ADR 0004/0020/0021 for the policy and its history.
#
# SAFE BY DEFAULT: prints a plan and touches nothing until -Confirm is
# passed. Once -Confirm is passed, this DOES uninstall real dev tools
# (winget packages, npm globals) -- not just config files. Read the plan
# before confirming.
#
# Usage:
#   .\uninstall.ps1              # dry run -- prints the plan only
#   .\uninstall.ps1 -Confirm     # actually removes everything listed

param(
    [switch]$Confirm
)

$ErrorActionPreference = "Continue"
$HomeDir = $HOME

function Resolve-Home {
    param([string]$RelativePath)
    return Join-Path $HomeDir $RelativePath
}

# Category A: files chezmoi fully owns the content of on this machine --
# safe to delete outright, nothing but chezmoi ever writes to these.
$ManagedFiles = @(
    ".gitconfig",
    ".ssh\config",
    ".npmrc",
    ".tmux.conf",
    ".wezterm.lua",
    ".p10k.zsh",
    ".config\atuin\config.toml",
    ".vscode\extensions.txt",
    ".local\bin\audit-env.ps1",
    "AppData\Roaming\Code\User\settings.json",
    "AppData\Local\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json",
    "Documents\PowerShell\Microsoft.PowerShell_profile.ps1",
    "Documents\PowerShell\themes\pwsh10k.omp.json",
    "OneDrive - Powerfleet\Documents\PowerShell\Microsoft.PowerShell_profile.ps1",
    "OneDrive - Powerfleet\Documents\PowerShell\themes\pwsh10k.omp.json",
    ".claude\CLAUDE.md",
    ".claude\mcp.json",
    ".claude\settings.json",
    ".claude\rules\registers.instructions.md",
    ".claude\rules\home\preferences.instructions.md",
    ".claude\rules\work\branches.instructions.md",
    ".claude\rules\work\external-services.instructions.md",
    ".claude\rules\work\jira.instructions.md",
    ".claude\rules\work\pull-requests.instructions.md",
    ".claude\scripts\pick-persona.js",
    ".claude\output-styles\k1ra.md",
    ".claude\output-styles\hailey.md",
    ".claude\output-styles\alexia.md",
    ".claude\output-styles\aphrodite.md",
    ".claude\output-styles\callie.md",
    ".claude\rate-limit-statusline-bridge.py",
    ".copilot\settings.json"
)

# Category A2: directories chezmoi fully owns -- safe to remove recursively.
$ManagedDirs = @(
    ".config\nvim",
    ".config\shell",
    ".claude\skills\decision-register",
    ".claude\skills\session-start",
    ".claude\skills\scratchpad-check",
    ".claude\skills\persona",
    ".claude\skills\nsfw-comment-audit",
    ".claude\skills\security-audit",
    ".claude\skills\branch-start-work",
    ".claude\skills\commit-ready-check",
    ".claude\skills\continuation-context-pack",
    ".claude\skills\defect-workflow",
    ".claude\skills\feature-workflow",
    ".claude\skills\jira-post-fix-update-comment",
    ".claude\skills\jira-post-qa-test-plan",
    ".claude\skills\jira-transition-status",
    ".claude\skills\jira-unassign-ticket",
    ".claude\skills\post-pr-cleanup",
    ".claude\skills\pr-prep-and-submit",
    ".claude\skills\project-setup",
    ".copilot\instructions",
    ".copilot\skills"
)

# Category B: one-time side effects from run_once scripts.
$OneTimeSideEffects = @(
    @{ Path = (Join-Path $env:LOCALAPPDATA "nvim"); Description = "nvim config junction (created by run_once_create_nvim_junction.ps1.tmpl)" }
)

# Category C: winget packages -- mirrors run_onchange_install-tools.ps1.tmpl's
# $Packages list exactly. Keep these two lists in sync by hand; there's no
# shared source between a plain root script and a chezmoi .tmpl.
$WingetPackages = @(
    "Microsoft.PowerShell", "Git.Git", "sharkdp.bat", "sharkdp.fd", "junegunn.fzf",
    "GitHub.cli", "jqlang.jq", "JesseDuffield.lazygit", "LuaLS.lua-language-server",
    "Neovim.Neovim", "OpenJS.NodeJS.LTS", "Python.Python.3.14", "BurntSushi.ripgrep.MSVC",
    "JohnnyMorganz.StyLua", "tree-sitter.tree-sitter-cli", "MikeFarah.yq", "Atuinsh.Atuin",
    "JanDeDobbeleer.OhMyPosh", "koalaman.shellcheck", "mvdan.shfmt", "ajeetdsouza.zoxide"
)
$NpmGlobalPackages = @(
    "@anthropic-ai/claude-code", "vscode-langservers-extracted", "yaml-language-server", "@github/copilot"
)
# Risk worth naming even though it proceeds: Git.Git, OpenJS.NodeJS.LTS, and
# Python.Python.3.14 are commonly relied on by software with no relation to
# this repo. Uninstalling them can break other things on this machine.
$HighRiskPackages = @("Git.Git", "OpenJS.NodeJS.LTS", "Python.Python.3.14")

Write-Host "=== binary-dotfiles uninstall (Windows) ===" -ForegroundColor Cyan
if (-not $Confirm) {
    Write-Host "DRY RUN -- nothing will be removed. Pass -Confirm to actually uninstall.`n" -ForegroundColor Yellow
} else {
    Write-Host "-Confirm passed -- this WILL uninstall real dev tools (winget/npm), not just config files.`n" -ForegroundColor Red
}

Write-Host "`n--- Managed files ---"
foreach ($rel in $ManagedFiles) {
    $full = Resolve-Home $rel
    if (Test-Path $full -PathType Leaf) {
        if ($Confirm) {
            Write-Host "removing: $full"
            Remove-Item -Force -Path $full -ErrorAction SilentlyContinue
        } else {
            Write-Host "would remove: $full"
        }
    }
}

Write-Host "`n--- Managed directories ---"
foreach ($rel in $ManagedDirs) {
    $full = Resolve-Home $rel
    if (Test-Path $full -PathType Container) {
        if ($Confirm) {
            Write-Host "removing: $full"
            Remove-Item -Force -Recurse -Path $full -ErrorAction SilentlyContinue
        } else {
            Write-Host "would remove: $full"
        }
    }
}

Write-Host "`n--- One-time side effects (run_once scripts) ---"
foreach ($effect in $OneTimeSideEffects) {
    if (Test-Path $effect.Path) {
        Write-Host "$($effect.Description): $($effect.Path)"
        if ($Confirm) {
            # A junction shows as a directory but must be removed without -Recurse
            # to avoid deleting the real target its Reparse Point points at.
            Write-Host "removing junction: $($effect.Path)"
            (Get-Item $effect.Path).Delete()
        } else {
            Write-Host "would remove junction: $($effect.Path)"
        }
    }
}

Write-Host "`n--- VS Code extensions ---"
$extFile = Resolve-Home ".vscode\extensions.txt"
$codeCmd = Get-Command code -ErrorAction SilentlyContinue
if ((Test-Path $extFile) -and $codeCmd) {
    foreach ($ext in (Get-Content $extFile | Where-Object { $_.Trim() -ne "" })) {
        if ($Confirm) {
            Write-Host "uninstalling extension: $ext"
            & code --uninstall-extension $ext 2>$null | Out-Null
        } else {
            Write-Host "would uninstall extension: $ext"
        }
    }
} elseif (Test-Path $extFile) {
    Write-Host "extensions.txt exists but 'code' CLI not on PATH -- skipping extension uninstall"
}

Write-Host "`n--- winget packages ---" -ForegroundColor $(if ($Confirm) { "Red" } else { "White" })
foreach ($pkg in $WingetPackages) {
    $riskNote = if ($HighRiskPackages -contains $pkg) { " [commonly relied on by other software]" } else { "" }
    if ($Confirm) {
        Write-Host "uninstalling: $pkg$riskNote"
        winget uninstall --id $pkg --silent --accept-source-agreements 2>$null | Out-Null
    } else {
        Write-Host "would uninstall: $pkg$riskNote"
    }
}

Write-Host "`n--- npm global packages ---"
foreach ($pkg in $NpmGlobalPackages) {
    if ($Confirm) {
        Write-Host "uninstalling: $pkg"
        npm uninstall -g $pkg 2>$null | Out-Null
    } else {
        Write-Host "would uninstall: $pkg"
    }
}

Write-Host "`n--- Never touched by this script (bootstrap.ps1's own domain) ---"
Write-Host "chezmoi.exe itself and its own config/state (~/.config/chezmoi/), the ~/.local/share/chezmoi source clone, this repo checkout, the age key (~/.config/age/key.txt), the GitHub SSH key (~/.ssh/id_ed25519_github + .pub) -- bootstrap.ps1 generates the chezmoi setup and both keys directly, so reversing them is bootstrap's own domain, not this script's. Also never touched: .claude/settings.local.json, .claude/persona-registry.json, .claude/projects/** (session history), .claude/memory/** -- none of these are chezmoi-managed at all."

if (-not $Confirm) {
    Write-Host "`nDry run complete. Re-run with -Confirm to actually remove everything listed above, including winget/npm packages." -ForegroundColor Yellow
} else {
    Write-Host "`nUninstall complete." -ForegroundColor Green
}
