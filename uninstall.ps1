#!powershell
# Reverses everything this repo's chezmoi source manages on a Windows machine,
# leaving chezmoi itself, its config, and this repo checkout untouched. See
# TODO-1 in docs/todo-register.md and ADR 0004 for the policy this implements.
#
# SAFE BY DEFAULT: prints a plan and touches nothing. Pass -Confirm to actually
# remove files. SSH keys and installed packages are never touched automatically
# -- see the "Risky / opt-in" and "Never touched" sections below.
#
# Usage:
#   .\uninstall.ps1                      # dry run -- prints the plan only
#   .\uninstall.ps1 -Confirm             # actually removes managed files
#   .\uninstall.ps1 -Confirm -IncludeSSHKeys   # also removes the GitHub SSH key

param(
    [switch]$Confirm,
    [switch]$IncludeSSHKeys
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

# Category C: risky / opt-in only -- never removed unless -IncludeSSHKeys is
# passed alongside -Confirm. A real credential, not just chezmoi-managed state.
$SshKeyFiles = @(".ssh\id_ed25519_github", ".ssh\id_ed25519_github.pub")

Write-Host "=== binary-dotfiles uninstall (Windows) ===" -ForegroundColor Cyan
if (-not $Confirm) {
    Write-Host "DRY RUN -- nothing will be removed. Pass -Confirm to actually uninstall.`n" -ForegroundColor Yellow
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

Write-Host "`n--- Risky / opt-in (SSH keys) ---"
if ($IncludeSSHKeys) {
    foreach ($rel in $SshKeyFiles) {
        $full = Resolve-Home $rel
        if (Test-Path $full) {
            if ($Confirm) {
                Write-Host "removing: $full"
                Remove-Item -Force -Path $full -ErrorAction SilentlyContinue
            } else {
                Write-Host "would remove: $full"
            }
        }
    }
} else {
    Write-Host "skipped ($($HomeDir)\.ssh\id_ed25519_github and .pub) -- pass -IncludeSSHKeys to remove. This key may still be registered with GitHub; removing it locally does not revoke it there."
}

Write-Host "`n--- Never touched by this script ---"
Write-Host "chezmoi.exe itself, chezmoi's own config (~/.config/chezmoi), the ~/.local/share/chezmoi source clone, this repo checkout, .claude/settings.local.json, .claude/persona-registry.json, .claude/projects/** (session history), .claude/memory/**."

Write-Host "`n--- Not automated: installed packages ---"
Write-Host "run_onchange_install-tools.ps1.tmpl installed dev tools via winget. This script does NOT uninstall them -- reversing package installs can affect software unrelated to this dotfiles setup. Review the tool list at run_onchange_install-tools.ps1.tmpl and 'winget uninstall <id>' manually for anything you actually want removed."

if (-not $Confirm) {
    Write-Host "`nDry run complete. Re-run with -Confirm to actually remove the files listed above." -ForegroundColor Yellow
} else {
    Write-Host "`nUninstall complete." -ForegroundColor Green
}
