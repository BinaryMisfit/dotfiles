#!/usr/bin/env bash
# Daily scheduled check for TODO-3 (docs/todo-register.md) -- pulls the
# chezmoi source and checks for a pending diff, but NEVER applies
# unattended. See ADR 0022 for why: a forced apply earlier the same day
# this was built silently regressed a live file, so an unattended job
# stays pull+diff+notify only, human applies.
set -u
MARKER="$HOME/CHEZMOI_UPDATE_AVAILABLE.txt"

chezmoi update --apply=false >/dev/null 2>&1
DIFF_OUTPUT="$(chezmoi diff 2>&1)"

if [ -n "$(printf '%s' "$DIFF_OUTPUT" | tr -d '[:space:]')" ]; then
    TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
    {
        echo "chezmoi update available -- checked $TIMESTAMP"
        echo
        echo "Run 'chezmoi diff' to review, 'chezmoi apply' to apply. Nothing has been applied automatically."
        echo
        echo "--- diff ---"
        echo "$DIFF_OUTPUT"
    } > "$MARKER"

    if [ "$(uname -s)" = "Darwin" ]; then
        osascript -e 'display notification "Run chezmoi diff to review." with title "chezmoi update available"' 2>/dev/null || true
    elif command -v notify-send >/dev/null 2>&1; then
        notify-send "chezmoi update available" "Run chezmoi diff to review." 2>/dev/null || true
    fi
else
    rm -f "$MARKER"
fi
