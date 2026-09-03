#!/usr/bin/env bash
# Sets/clears the sentinel marker chezmoi's own hooks.apply.pre/post use to
# flag a `chezmoi apply` in progress -- see
# run_once_configure-chezmoi-apply-hooks.sh.tmpl and ADR 0023 for why this
# exists (chezmoi's own state tracking can't distinguish an interrupted
# apply from ordinary unapplied drift; a marker set by pre and cleared by
# post is the only mechanism that actually answers the question).
set -eu

marker="$HOME/.chezmoi-apply-in-progress"

case "${1:-}" in
    set) touch "$marker" ;;
    clear) rm -f "$marker" ;;
    *)
        echo "usage: chezmoi-apply-marker.sh set|clear" >&2
        exit 1
        ;;
esac
