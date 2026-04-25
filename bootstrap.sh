#!/usr/bin/env sh
set -eu

REPO="https://github.com/BinaryMisfit/dotfiles.git"

if ! command -v mise >/dev/null 2>&1; then
  curl https://mise.run | sh
fi

export PATH="$HOME/.local/bin:$HOME/bin:$PATH"

if ! command -v chezmoi >/dev/null 2>&1; then
  mise use -g chezmoi@latest
fi

chezmoi init --apply "$REPO"
