#!/usr/bin/env bash
set -u

tools=(
  git
  chezmoi
  age
  mise
  rg
  fd
  fzf
  bat
  jq
  lazygit
  node
  python
  nvim
  gcc
)

echo
echo "==> Environment audit"
echo "OS: $(uname -s)"
echo

for tool in "${tools[@]}"; do
  echo "==> $tool"

  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "MISSING: $tool"
    echo
    continue
  fi

  echo "Path: $(command -v "$tool")"

  if ! "$tool" --version; then
    echo "WARN: failed to run $tool --version"
  fi

  echo
done

echo "==> mise doctor"
if command -v mise >/dev/null 2>&1; then
  mise doctor
else
  echo "MISSING: mise"
fi
