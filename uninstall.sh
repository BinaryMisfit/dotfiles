#!/usr/bin/env bash
# Reverses everything this repo's chezmoi source manages on a macOS/Linux
# machine, leaving chezmoi itself, its config, and this repo checkout
# untouched. See TODO-1 in docs/todo-register.md and ADR 0004 for the policy
# this implements.
#
# SAFE BY DEFAULT: prints a plan and touches nothing. Pass --confirm to
# actually remove files. SSH keys and installed packages are never touched
# automatically -- see the "risky / opt-in" and "never touched" sections below.
#
# Usage:
#   ./uninstall.sh                        # dry run -- prints the plan only
#   ./uninstall.sh --confirm              # actually removes managed files
#   ./uninstall.sh --confirm --include-ssh-keys   # also removes the GitHub SSH key

set -u

CONFIRM=false
INCLUDE_SSH_KEYS=false
for arg in "$@"; do
    case "$arg" in
        --confirm) CONFIRM=true ;;
        --include-ssh-keys) INCLUDE_SSH_KEYS=true ;;
    esac
done

UNAME="$(uname -s)"
IS_DARWIN=false
[ "$UNAME" = "Darwin" ] && IS_DARWIN=true

# Category A: files chezmoi fully owns the content of on this machine --
# safe to delete outright, nothing but chezmoi ever writes to these.
MANAGED_FILES=(
    ".gitconfig"
    ".ssh/config"
    ".npmrc"
    ".tmux.conf"
    ".wezterm.lua"
    ".zshrc"
    ".zshenv"
    ".p10k.zsh"
    ".config/shell/aliases.zsh"
    ".config/shell/fzf.zsh"
    ".config/shell/helpers.zsh"
    ".config/atuin/config.toml"
    ".vscode/extensions.txt"
    ".local/bin/audit-env.sh"
    ".claude/CLAUDE.md"
    ".claude/mcp.json"
    ".claude/settings.json"
    ".claude/rules/registers.instructions.md"
    ".claude/rules/home/preferences.instructions.md"
    ".claude/rules/work/branches.instructions.md"
    ".claude/rules/work/external-services.instructions.md"
    ".claude/rules/work/jira.instructions.md"
    ".claude/rules/work/pull-requests.instructions.md"
    ".claude/scripts/pick-persona.js"
    ".claude/output-styles/k1ra.md"
    ".claude/output-styles/hailey.md"
    ".claude/output-styles/alexia.md"
    ".claude/output-styles/aphrodite.md"
    ".claude/output-styles/callie.md"
    ".claude/rate-limit-statusline-bridge.py"
    ".copilot/settings.json"
)

if $IS_DARWIN; then
    MANAGED_FILES+=("Library/Application Support/Code/User/settings.json")
fi

# Category A2: directories chezmoi fully owns -- safe to remove recursively.
MANAGED_DIRS=(
    ".config/nvim"
    ".claude/skills/decision-register"
    ".claude/skills/session-start"
    ".claude/skills/scratchpad-check"
    ".claude/skills/persona"
    ".claude/skills/nsfw-comment-audit"
    ".claude/skills/security-audit"
    ".claude/skills/branch-start-work"
    ".claude/skills/commit-ready-check"
    ".claude/skills/continuation-context-pack"
    ".claude/skills/defect-workflow"
    ".claude/skills/feature-workflow"
    ".claude/skills/jira-post-fix-update-comment"
    ".claude/skills/jira-post-qa-test-plan"
    ".claude/skills/jira-transition-status"
    ".claude/skills/jira-unassign-ticket"
    ".claude/skills/post-pr-cleanup"
    ".claude/skills/pr-prep-and-submit"
    ".claude/skills/project-setup"
    ".copilot/instructions"
    ".copilot/skills"
)

# Category C: risky / opt-in only -- never removed unless --include-ssh-keys
# is passed alongside --confirm. A real credential, not just chezmoi-managed state.
SSH_KEY_FILES=(".ssh/id_ed25519_github" ".ssh/id_ed25519_github.pub")

echo "=== binary-dotfiles uninstall ($UNAME) ==="
if ! $CONFIRM; then
    echo "DRY RUN -- nothing will be removed. Pass --confirm to actually uninstall."
    echo
fi

echo
echo "--- Managed files ---"
for rel in "${MANAGED_FILES[@]}"; do
    full="$HOME/$rel"
    if [ -f "$full" ]; then
        if $CONFIRM; then
            echo "removing: $full"
            rm -f "$full"
        else
            echo "would remove: $full"
        fi
    fi
done

echo
echo "--- Managed directories ---"
for rel in "${MANAGED_DIRS[@]}"; do
    full="$HOME/$rel"
    if [ -d "$full" ]; then
        if $CONFIRM; then
            echo "removing: $full"
            rm -rf "$full"
        else
            echo "would remove: $full"
        fi
    fi
done

echo
echo "--- One-time side effects (run_once scripts) ---"
if $IS_DARWIN; then
    ITERM_INTEGRATION="$HOME/.iterm2_shell_integration.zsh"
    if [ -f "$ITERM_INTEGRATION" ]; then
        echo "iTerm2 shell integration (created by run_once_install-iterm2-shell-integration.sh.tmpl): $ITERM_INTEGRATION"
        if $CONFIRM; then
            echo "removing: $ITERM_INTEGRATION"
            rm -f "$ITERM_INTEGRATION"
        else
            echo "would remove: $ITERM_INTEGRATION"
        fi
    fi
else
    echo "(none tracked for Linux)"
fi

echo
echo "--- Risky / opt-in (SSH keys) ---"
if $INCLUDE_SSH_KEYS; then
    for rel in "${SSH_KEY_FILES[@]}"; do
        full="$HOME/$rel"
        if [ -f "$full" ]; then
            if $CONFIRM; then
                echo "removing: $full"
                rm -f "$full"
            else
                echo "would remove: $full"
            fi
        fi
    done
else
    echo "skipped (\$HOME/.ssh/id_ed25519_github and .pub) -- pass --include-ssh-keys to remove. This key may still be registered with GitHub; removing it locally does not revoke it there."
fi

echo
echo "--- Never touched by this script ---"
echo "chezmoi itself, chezmoi's own config (~/.config/chezmoi), the ~/.local/share/chezmoi source clone, this repo checkout, .claude/settings.local.json, .claude/persona-registry.json, .claude/projects/** (session history), .claude/memory/**."

echo
echo "--- Not automated: installed packages ---"
echo "run_onchange_install-tools.sh.tmpl installed dev tools via Homebrew/apt. This script does NOT uninstall them -- reversing package installs can affect software unrelated to this dotfiles setup. Review the tool list at run_onchange_install-tools.sh.tmpl and 'brew uninstall <name>' / 'apt remove <name>' manually for anything you actually want removed."

echo
if ! $CONFIRM; then
    echo "Dry run complete. Re-run with --confirm to actually remove the files listed above."
else
    echo "Uninstall complete."
fi
