#!/usr/bin/env bash
set -u

tools=(
  git
  chezmoi
  age
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

  # Debian/Ubuntu's apt packages install python3, not a bare `python` --
  # same class of naming mismatch install-tools.sh.tmpl already symlinks
  # around for bat/fd, just not this one yet.
  check_tool="$tool"
  if [ "$tool" = "python" ] && ! command -v python >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
    check_tool="python3"
  fi

  if ! command -v "$check_tool" >/dev/null 2>&1; then
    echo "MISSING: $tool"
    echo
    continue
  fi

  echo "Path: $(command -v "$check_tool")"

  if ! "$check_tool" --version; then
    echo "WARN: failed to run $check_tool --version"
  fi

  echo
done
