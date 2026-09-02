#!/usr/bin/env bash
# Reverses everything this repo's chezmoi source manages on a macOS/Linux
# machine. Rule, BinaryMisfit's own: the ONLY thing this script never touches
# is whatever bootstrap.sh itself runs -- chezmoi's own install/config, the
# age key, and the GitHub SSH key (bootstrap generates both directly).
# Everything else this repo causes to exist on a machine gets reversed,
# including installed packages. See TODO-1 in docs/todo-register.md and
# ADR 0004/0020/0021 for the policy and its history.
#
# SAFE BY DEFAULT: prints a plan and touches nothing until --confirm is
# passed. Once --confirm is passed, this DOES uninstall real dev tools
# (Homebrew/apt packages, npm globals) -- not just config files. Read the
# plan before confirming.
#
# Usage:
#   ./uninstall.sh              # dry run -- prints the plan only
#   ./uninstall.sh --confirm    # actually removes everything listed

set -u

CONFIRM=false
for arg in "$@"; do
    case "$arg" in
        --confirm) CONFIRM=true ;;
    esac
done

UNAME="$(uname -s)"
IS_DARWIN=false
[ "$UNAME" = "Darwin" ] && IS_DARWIN=true
LOCAL_BIN="$HOME/.local/bin"

# Category A: files chezmoi fully owns the content of on this machine --
# safe to delete outright, nothing but chezmoi ever writes to these.
MANAGED_FILES=(
    ".gitconfig" ".ssh/config" ".npmrc" ".tmux.conf" ".wezterm.lua"
    ".zshrc" ".zshenv" ".p10k.zsh"
    ".config/shell/aliases.zsh" ".config/shell/fzf.zsh" ".config/shell/helpers.zsh"
    ".config/atuin/config.toml" ".vscode/extensions.txt" ".local/bin/audit-env.sh"
    ".claude/CLAUDE.md" ".claude/mcp.json" ".claude/settings.json"
    ".claude/rules/registers.instructions.md" ".claude/rules/home/preferences.instructions.md"
    ".claude/rules/work/branches.instructions.md" ".claude/rules/work/external-services.instructions.md"
    ".claude/rules/work/jira.instructions.md" ".claude/rules/work/pull-requests.instructions.md"
    ".claude/scripts/pick-persona.js"
    ".claude/output-styles/k1ra.md" ".claude/output-styles/hailey.md"
    ".claude/output-styles/alexia.md" ".claude/output-styles/aphrodite.md" ".claude/output-styles/callie.md"
    ".claude/rate-limit-statusline-bridge.py" ".copilot/settings.json"
)
$IS_DARWIN && MANAGED_FILES+=("Library/Application Support/Code/User/settings.json")

# Category A2: directories chezmoi fully owns -- safe to remove recursively.
MANAGED_DIRS=(
    ".config/nvim"
    ".claude/skills/decision-register" ".claude/skills/session-start" ".claude/skills/scratchpad-check"
    ".claude/skills/persona" ".claude/skills/nsfw-comment-audit" ".claude/skills/security-audit"
    ".claude/skills/branch-start-work" ".claude/skills/commit-ready-check" ".claude/skills/continuation-context-pack"
    ".claude/skills/defect-workflow" ".claude/skills/feature-workflow" ".claude/skills/jira-post-fix-update-comment"
    ".claude/skills/jira-post-qa-test-plan" ".claude/skills/jira-transition-status" ".claude/skills/jira-unassign-ticket"
    ".claude/skills/post-pr-cleanup" ".claude/skills/pr-prep-and-submit" ".claude/skills/project-setup"
    ".copilot/instructions" ".copilot/skills"
)

# Category C: package manager formulas -- mirrors
# run_onchange_install-tools.sh.tmpl's own lists exactly. Keep these in sync
# by hand; there's no shared source between a plain root script and a
# chezmoi .tmpl.
BREW_FORMULAS="bat fd fzf gh jq lazygit lua-language-server neovim node python@3.13 ripgrep stylua tree-sitter yq atuin shellcheck shfmt zoxide tmux eza"
APT_PACKAGES="bat fd-find fzf jq neovim python3 python3-pip ripgrep shellcheck tmux"
# curl/ca-certificates/gnupg are commonly relied on by other software and
# are frequently pre-existing system packages this repo didn't uniquely add
# -- printed as a flag, not auto-removed, even under --confirm.
APT_RISKY_SHARED="ca-certificates curl gnupg"
NPM_GLOBAL_PACKAGES="@anthropic-ai/claude-code vscode-langservers-extracted yaml-language-server @github/copilot"
GITHUB_RELEASE_BINARIES="lazygit stylua lua-language-server shfmt"
CURL_INSTALLED_BINARIES="atuin zoxide yq"

echo "=== binary-dotfiles uninstall ($UNAME) ==="
if ! $CONFIRM; then
    echo "DRY RUN -- nothing will be removed. Pass --confirm to actually uninstall."
else
    echo "--confirm passed -- this WILL uninstall real dev tools (Homebrew/apt/npm), not just config files."
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
        echo "iTerm2 shell integration: $ITERM_INTEGRATION"
        if $CONFIRM; then rm -f "$ITERM_INTEGRATION"; else echo "would remove: $ITERM_INTEGRATION"; fi
    fi
    MOSH_INSTALLED=false
    command -v mosh >/dev/null 2>&1 && MOSH_INSTALLED=true
    if $MOSH_INSTALLED; then
        if $CONFIRM; then echo "uninstalling: mosh (brew)"; brew uninstall mosh 2>/dev/null; else echo "would uninstall: mosh (brew)"; fi
    fi
else
    echo "(none tracked for Linux beyond package/binary removal below)"
fi

echo
echo "--- VS Code extensions ---"
EXT_FILE="$HOME/.vscode/extensions.txt"
if [ -f "$EXT_FILE" ] && command -v code >/dev/null 2>&1; then
    while IFS= read -r ext; do
        [ -z "$ext" ] && continue
        if $CONFIRM; then
            echo "uninstalling extension: $ext"
            code --uninstall-extension "$ext" >/dev/null 2>&1
        else
            echo "would uninstall extension: $ext"
        fi
    done < "$EXT_FILE"
elif [ -f "$EXT_FILE" ]; then
    echo "extensions.txt exists but 'code' CLI not on PATH -- skipping extension uninstall"
fi

if $IS_DARWIN; then
    echo
    echo "--- Homebrew formulas ---"
    for pkg in $BREW_FORMULAS; do
        if $CONFIRM; then
            echo "uninstalling: $pkg"
            brew uninstall "$pkg" 2>/dev/null
        else
            echo "would uninstall: $pkg"
        fi
    done
else
    echo
    echo "--- apt packages ---"
    for pkg in $APT_PACKAGES; do
        if $CONFIRM; then
            echo "uninstalling: $pkg"
            sudo apt-get remove -y "$pkg" 2>/dev/null
        else
            echo "would uninstall: $pkg"
        fi
    done
    echo
    echo "--- apt packages commonly shared with other software (flagged, not auto-removed) ---"
    echo "$APT_RISKY_SHARED -- these are frequently pre-existing system packages unrelated software also depends on. Review and remove manually if you actually want them gone: sudo apt-get remove <pkg>"

    echo
    echo "--- GitHub-release / curl-installed binaries (in \$HOME/.local/bin or their own installer's path) ---"
    for bin in $GITHUB_RELEASE_BINARIES; do
        full="$LOCAL_BIN/$bin"
        if [ -f "$full" ]; then
            if $CONFIRM; then echo "removing: $full"; rm -f "$full"; else echo "would remove: $full"; fi
        fi
    done
    for bin in $CURL_INSTALLED_BINARIES; do
        # These installers vary where they land (some use $LOCAL_BIN, atuin
        # defaults to ~/.atuin/bin) -- best-effort, not exhaustively verified
        # on a real Linux machine yet (TODO-4).
        for candidate in "$LOCAL_BIN/$bin" "$HOME/.atuin/bin/$bin"; do
            if [ -f "$candidate" ]; then
                if $CONFIRM; then echo "removing: $candidate"; rm -f "$candidate"; else echo "would remove: $candidate"; fi
            fi
        done
    done
    ATUIN_DIR="$HOME/.atuin"
    if [ -d "$ATUIN_DIR" ]; then
        if $CONFIRM; then echo "removing: $ATUIN_DIR"; rm -rf "$ATUIN_DIR"; else echo "would remove: $ATUIN_DIR"; fi
    fi
fi

echo
echo "--- npm global packages ---"
for pkg in $NPM_GLOBAL_PACKAGES; do
    if $CONFIRM; then
        echo "uninstalling: $pkg"
        npm uninstall -g "$pkg" 2>/dev/null
    else
        echo "would uninstall: $pkg"
    fi
done

echo
echo "--- Never touched by this script (bootstrap.sh's own domain) ---"
echo "chezmoi itself and its own config/state (~/.config/chezmoi/), the ~/.local/share/chezmoi source clone, this repo checkout, the age key (~/.config/age/key.txt), the GitHub SSH key (~/.ssh/id_ed25519_github + .pub) -- bootstrap.sh generates the chezmoi setup and both keys directly, so reversing them is bootstrap's own domain, not this script's. Also never touched: .claude/settings.local.json, .claude/persona-registry.json, .claude/projects/** (session history), .claude/memory/** -- none of these are chezmoi-managed at all."

echo
if ! $CONFIRM; then
    echo "Dry run complete. Re-run with --confirm to actually remove everything listed above, including package installs."
else
    echo "Uninstall complete."
fi
