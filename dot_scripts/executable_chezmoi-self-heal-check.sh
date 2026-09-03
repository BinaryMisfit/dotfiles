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
# Implemented 2026-09-03 (TODO-5 / ADR 0023). chezmoi's own state tracking
# (chezmoistate.boltdb / `chezmoi state dump`) can't distinguish a genuinely
# interrupted apply from ordinary unapplied drift -- researched for real,
# not guessed. The actual answer is a sentinel marker set by chezmoi's
# native hooks.apply.pre and cleared by hooks.apply.post (see
# run_once_configure-chezmoi-apply-hooks.sh.tmpl): if the marker exists
# right now, a previous `chezmoi apply` started and never finished (killed,
# crashed, machine rebooted mid-apply).
echo
echo "--- Interrupted-apply detection ---"
marker_path="$HOME/.chezmoi-apply-in-progress"
config_file=""
for candidate in "$HOME/.config/chezmoi/chezmoi.yaml" "$HOME/.config/chezmoi/chezmoi.yml" "$HOME/.config/chezmoi/chezmoi.toml" "$HOME/.config/chezmoi/chezmoi.json"; do
    if [ -f "$candidate" ]; then
        config_file="$candidate"
        break
    fi
done

if [ -z "$config_file" ] || ! grep -q "chezmoi-apply-marker" "$config_file" 2>/dev/null; then
    echo "detection not active -- apply hooks aren't configured yet (run_once_configure-chezmoi-apply-hooks hasn't run, or its own real collision with an existing 'hooks' key is still unresolved)"
elif [ -f "$marker_path" ]; then
    echo "INTERRUPTED APPLY: marker found at $marker_path -- a previous 'chezmoi apply' started and never completed"
    issues+=("interrupted apply: marker present at $marker_path")
else
    echo "clean -- no interrupted apply detected"
fi

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
