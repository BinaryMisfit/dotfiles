#!/usr/bin/env sh
set -eu

REPO="https://github.com/BinaryMisfit/dotfiles.git"

export PATH="$HOME/.local/bin:$HOME/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required but not installed."
  exit 1
fi

if ! command -v mise >/dev/null 2>&1; then
  curl https://mise.run | sh
fi

export PATH="$HOME/.local/bin:$HOME/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v chezmoi >/dev/null 2>&1; then
  mise use -g chezmoi@latest
fi

chezmoi init --apply "$REPO"
