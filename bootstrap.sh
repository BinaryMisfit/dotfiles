#!/usr/bin/env sh
set -eu

REPO="${CHEZMOI_REPO:-BinaryMisfit/dotfiles}"

LOCAL_BIN="$HOME/.local/bin"
MISE_SHIMS="$HOME/.local/share/mise/shims"

CHEZMOI_DIR="$HOME/.config/chezmoi"
CHEZMOI_CONFIG="$CHEZMOI_DIR/chezmoi.yaml"

AGE_DIR="$HOME/.config/age"
AGE_KEY="$AGE_DIR/key.txt"

SOURCE_DIR="$HOME/.local/share/chezmoi"
SSH_REMOTE="git@github.com:${REPO}.git"

SSH_DIR="$HOME/.ssh"
SSH_KEY="$SSH_DIR/id_ed25519_github"

export PATH="$LOCAL_BIN:$MISE_SHIMS:$PATH"

section() {
  printf '\n==> %s\n' "$1"
}

info() {
  printf '  %s\n' "$1"
}

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

section "bootstrap"
info "repo: $REPO"

section "mise"

if ! command -v mise >/dev/null 2>&1; then
  info "installing mise"
  curl -fsLS https://mise.run | sh
else
  info "mise already installed"
fi

export PATH="$LOCAL_BIN:$MISE_SHIMS:$PATH"

MISE="$(command -v mise || true)"
[ -n "$MISE" ] || die "mise not found after install"

info "using: $MISE"

section "core tools"

"$MISE" use -g age@latest
"$MISE" use -g chezmoi@latest
"$MISE" install age@latest chezmoi@latest
"$MISE" reshim || true

export PATH="$MISE_SHIMS:$LOCAL_BIN:$PATH"

CHEZMOI="$(command -v chezmoi || true)"
AGE_KEYGEN="$(command -v age-keygen || true)"
SSH_KEYGEN="$(command -v ssh-keygen || true)"

[ -n "$CHEZMOI" ] || die "chezmoi not found after install"
[ -n "$AGE_KEYGEN" ] || die "age-keygen not found after install"
[ -n "$SSH_KEYGEN" ] || die "ssh-keygen not found"

info "chezmoi: $CHEZMOI"
info "age-keygen: $AGE_KEYGEN"

section "codex sandbox"

# Required for Codex sandboxing on Linux/WSL2.
# macOS uses Apple Seatbelt instead, so do not install bubblewrap there.
# https://developers.openai.com/codex/concepts/sandboxing#prerequisites
if [ "$(uname -s)" = "Darwin" ]; then
  info "macOS detected, skipping bubblewrap"
elif command -v bwrap >/dev/null 2>&1; then
  info "bubblewrap already installed"
elif command -v apt-get >/dev/null 2>&1; then
  info "installing bubblewrap via apt"
  sudo apt-get update
  sudo apt-get install -y bubblewrap
elif command -v dnf >/dev/null 2>&1; then
  info "installing bubblewrap via dnf"
  sudo dnf install -y bubblewrap
elif command -v pacman >/dev/null 2>&1; then
  info "installing bubblewrap via pacman"
  sudo pacman -S --needed --noconfirm bubblewrap
else
  info "no supported package manager found for bubblewrap"
fi

section "shell"

if ! command -v zsh >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    info "installing zsh via apt"
    sudo apt-get update
    sudo apt-get install -y zsh
  elif command -v brew >/dev/null 2>&1; then
    info "installing zsh via brew"
    brew install zsh
  else
    info "no supported package manager found for zsh"
  fi
else
  info "zsh already installed"
fi

if command -v zsh >/dev/null 2>&1; then
  if [ ! -f "$HOME/.iterm2_shell_integration.zsh" ]; then
    info "installing iTerm2 shell integration"
    curl -fsSL https://iterm2.com/shell_integration/zsh \
      -o "$HOME/.iterm2_shell_integration.zsh" || true
  else
    info "iTerm2 shell integration already exists"
  fi
fi

section "age identity"

mkdir -p "$CHEZMOI_DIR" "$AGE_DIR"

if [ ! -f "$AGE_KEY" ]; then
  info "generating machine-local age key"
  "$AGE_KEYGEN" -o "$AGE_KEY"
  chmod 600 "$AGE_KEY"
else
  info "key already exists: $AGE_KEY"
fi

AGE_RECIPIENT="$(
  sed -n 's/^# public key: //p' "$AGE_KEY" | head -n 1
)"

[ -n "$AGE_RECIPIENT" ] || die "failed to read age public key"

section "chezmoi config"

if [ ! -f "$CHEZMOI_CONFIG" ]; then
  cat >"$CHEZMOI_CONFIG" <<EOF
encryption: age

age:
  identities:
    - $AGE_KEY
  recipients:
    - $AGE_RECIPIENT
EOF

  info "created: $CHEZMOI_CONFIG"
else
  info "config already exists, leaving untouched"
fi

HAS_GIT_IDENTITY=0
if grep -Eq '^[[:space:]]*git:[[:space:]]*$' "$CHEZMOI_CONFIG"; then
  HAS_GIT_IDENTITY=1
fi

section "github ssh key"

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

if [ ! -f "$SSH_KEY" ]; then
  info "generating machine-local GitHub SSH key"
  "$SSH_KEYGEN" -t ed25519 -C "github-dotfiles-$(hostname)" -f "$SSH_KEY" -N ""
  chmod 600 "$SSH_KEY"
  chmod 644 "$SSH_KEY.pub"
else
  info "key already exists: $SSH_KEY"
fi

SSH_PUBLIC_KEY="$(cat "$SSH_KEY.pub")"

section "chezmoi source"

if [ ! -d "$SOURCE_DIR" ]; then
  info "initializing source: $REPO"
  "$CHEZMOI" init "$REPO"
else
  info "source already exists: $SOURCE_DIR"
fi

section "git remote"

if [ -d "$SOURCE_DIR/.git" ]; then
  CURRENT_REMOTE="$(git -C "$SOURCE_DIR" remote get-url origin 2>/dev/null || true)"

  if [ "$CURRENT_REMOTE" != "$SSH_REMOTE" ]; then
    info "setting origin to SSH: $SSH_REMOTE"
    git -C "$SOURCE_DIR" remote set-url origin "$SSH_REMOTE"
  else
    info "origin already uses SSH"
  fi
else
  info "chezmoi source is not a git repo, skipping remote update"
fi

section "next steps"

REENC='chezmoi cd && chezmoi decrypt private_dot_config/shell/encrypted_private_env.age > /tmp/env && chezmoi encrypt < /tmp/env > private_dot_config/shell/encrypted_private_env.age && rm -f /tmp/env && git add . && git commit -m "Add new machine age recipient" && git push'
CHEZ='chezmoi update && chezmoi diff && chezmoi apply'

printf '\n'
printf 'Age Public Key:\n  %s\n\n' "$AGE_RECIPIENT"
printf 'GitHub SSH Key:\n  %s\n\n' "$SSH_PUBLIC_KEY"

if [ "$HAS_GIT_IDENTITY" -eq 0 ]; then
  printf 'Git username/email missing from %s\n' "$CHEZMOI_CONFIG"
  printf 'Add:\n'
  printf '  data:\n'
  printf '    git:\n'
  printf '      name: Your Name\n'
  printf '      email: you@example.com\n\n'
fi

printf 'To re-encrypt, add key to recipients in chezmoi config on source machine and run:\n'
printf '  %s\n\n' "$REENC"

printf 'When done run:\n'
printf '  %s\n\n' "$CHEZ"

printf 'Verify:\n'
printf '  ssh -T git@github.com\n'
printf '  git -C "$HOME/.local/share/chezmoi" remote -v\n'
printf '  mise doctor\n\n'

printf 'bootstrap: complete\n'
