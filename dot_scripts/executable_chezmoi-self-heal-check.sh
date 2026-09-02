#!/usr/bin/env bash
# TODO-5 (docs/todo-register.md) -- detects broken/drifted chezmoi state.
# DETECTION ONLY, same posture as TODO-3's chezmoi-update-check.sh: never
# fixes anything automatically. Prints a report; a human decides what to
# do with it. Manually invoked for now, not scheduled -- scheduling and
# any actual repair action are still open design questions.
set -u

echo "=== chezmoi self-heal check ($(uname -s)) ==="
issues=()

# --- Tier: drift (reuses the same pull+diff TODO-3 already established) ---
echo
echo "--- Checking for drift ---"
chezmoi update --apply=false >/dev/null 2>&1
diff_output="$(chezmoi diff 2>&1)"
if [ -n "$(printf '%s' "$diff_output" | tr -d '[:space:]')" ]; then
    file_count=$(printf '%s\n' "$diff_output" | grep -c '^diff --git')
    echo "DRIFT: $file_count file(s) differ from template. Run 'chezmoi diff' to review."
    issues+=("drift: $file_count file(s)")
else
    echo "clean -- no drift"
fi

# --- Tier: missing run_once side effects ---
# Cleanup scripts (run_once_after_remove-*) left out of this pass -- their
# "side effect" is an absence, a different and lower-priority check to add
# later, not skipped by oversight.
echo
echo "--- Checking run_once side effects ---"

check_effect() {
    name="$1"
    path="$2"
    if [ -e "$path" ]; then
        echo "present: $name"
    else
        echo "MISSING: $name"
        issues+=("missing: $name")
    fi
}

check_effect "GitHub SSH key" "$HOME/.ssh/id_ed25519_github"

if [ "$(uname -s)" = "Darwin" ]; then
    check_effect "iTerm2 shell integration" "$HOME/.iterm2_shell_integration.zsh"
    if [ -f "$HOME/Library/LaunchAgents/com.binarydotfiles.chezmoi-update-check.plist" ]; then
        echo "present: chezmoi update launchd job"
    else
        echo "MISSING: chezmoi update launchd job"
        issues+=("missing: chezmoi update launchd job")
    fi
else
    if command -v crontab >/dev/null 2>&1 && crontab -l 2>/dev/null | grep -qF "binary-dotfiles chezmoi-update-check"; then
        echo "present: chezmoi update cron job"
    else
        echo "MISSING: chezmoi update cron job"
        issues+=("missing: chezmoi update cron job")
    fi
fi

# --- Tier: interrupted apply ---
# NOT YET IMPLEMENTED. Same as the Windows side -- needs real research into
# chezmoi's own state tracking before a real check can be written.
echo
echo "--- Interrupted-apply detection ---"
echo "not yet implemented -- needs research into chezmoi's own state tracking before a real check can be written"

echo
echo "=== Summary ==="
if [ "${#issues[@]}" -eq 0 ]; then
    echo "No issues found in the tiers checked."
else
    echo "${#issues[@]} issue(s) found:"
    for issue in "${issues[@]}"; do
        echo "  - $issue"
    done
    echo
    echo "Nothing has been changed. Review and act manually."
fi
