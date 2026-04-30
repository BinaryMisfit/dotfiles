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

# Hard PATH (no magic, no guessing)
export PATH="$MISE_SHIMS:$LOCAL_BIN:$PATH"

section() { printf '\n==> %s\n' "$1"; }
info() { printf '  %s\n' "$1"; }
die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

section "bootstrap"
info "repo: $REPO"

# --------------------------------------------------
# base deps
# --------------------------------------------------
if command -v apt-get >/dev/null 2>&1; then
  if ! command -v git >/dev/null 2>&1; then
    section "base deps"
    info "installing git"
    sudo apt-get update -y
    sudo apt-get install -y git
  fi
fi

# --------------------------------------------------
# mise
# --------------------------------------------------
section "mise"

if [ ! -x "$LOCAL_BIN/mise" ]; then
  info "installing mise"
  curl -fsLS https://mise.run | sh
else
  info "mise already installed"
fi

MISE="$LOCAL_BIN/mise"
[ -x "$MISE" ] || die "mise not found after install"

info "using: $MISE"

# persist activation for future shells (not required for this run)
if [ -f "$HOME/.bashrc" ] && ! grep -q 'mise activate' "$HOME/.bashrc"; then
  info "persisting mise activation"
  echo 'eval "$($HOME/.local/bin/mise activate sh)"' >>"$HOME/.bashrc"
fi

# enforce PATH again after install
export PATH="$MISE_SHIMS:$LOCAL_BIN:$PATH"

# --------------------------------------------------
# core tools
# --------------------------------------------------
section "core tools"

section "core tools"

"$MISE" use -g age@latest
"$MISE" use -g chezmoi@latest
"$MISE" use -g node@lts

"$MISE" install age@latest chezmoi@latest node@lts
"$MISE" reshim || true

# hard PATH again (yes, again, because reality is annoying)
export PATH="$MISE_SHIMS:$LOCAL_BIN:$PATH"

CHEZMOI="$MISE_SHIMS/chezmoi"
AGE_KEYGEN="$MISE_SHIMS/age-keygen"
SSH_KEYGEN="$(command -v ssh-keygen || true)"

[ -x "$CHEZMOI" ] || die "chezmoi not found after install"
[ -x "$AGE_KEYGEN" ] || die "age-keygen not found after install"
[ -n "$SSH_KEYGEN" ] || die "ssh-keygen not found"

info "chezmoi: $CHEZMOI"
info "age-keygen: $AGE_KEYGEN"

# --------------------------------------------------
# codex sandbox
# --------------------------------------------------
section "codex sandbox"

if [ "$(uname -s)" = "Darwin" ]; then
  info "macOS detected, skipping bubblewrap"
elif command -v bwrap >/dev/null 2>&1; then
  info "bubblewrap already installed"
elif command -v apt-get >/dev/null 2>&1; then
  info "installing bubblewrap via apt"
  sudo apt-get update
  sudo apt-get install -y bubblewrap
else
  info "no supported package manager found for bubblewrap"
fi

# --------------------------------------------------
# shell
# --------------------------------------------------
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

# switch to zsh (Linux only)
if [ "$(uname -s)" != "Darwin" ] && command -v zsh >/dev/null 2>&1; then
  CURRENT_SHELL="$(getent passwd "$USER" 2>/dev/null | cut -d: -f7 || echo "")"
  ZSH_PATH="$(command -v zsh)"

  if [ "$CURRENT_SHELL" != "$ZSH_PATH" ]; then
    info "switching default shell to zsh"
    chsh -s "$ZSH_PATH" "$USER" || true
    info "note: logout/login required"
  else
    info "zsh already default shell"
  fi
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

# --------------------------------------------------
# age identity
# --------------------------------------------------
section "age identity"

mkdir -p "$CHEZMOI_DIR" "$AGE_DIR"

if [ ! -f "$AGE_KEY" ]; then
  info "generating machine-local age key"
  "$AGE_KEYGEN" -o "$AGE_KEY"
  chmod 600 "$AGE_KEY"
else
  info "key already exists: $AGE_KEY"
fi

AGE_RECIPIENT="$(sed -n 's/^# public key: //p' "$AGE_KEY" | head -n 1)"
[ -n "$AGE_RECIPIENT" ] || die "failed to read age public key"

# --------------------------------------------------
# chezmoi config
# --------------------------------------------------
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
grep -Eq '^[[:space:]]*git:[[:space:]]*$' "$CHEZMOI_CONFIG" && HAS_GIT_IDENTITY=1 || true

# --------------------------------------------------
# github ssh key
# --------------------------------------------------
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

# --------------------------------------------------
# chezmoi source
# --------------------------------------------------
section "chezmoi source"

if [ ! -d "$SOURCE_DIR" ]; then
  info "initializing source: $REPO"
  "$CHEZMOI" init "$REPO"
else
  info "source already exists: $SOURCE_DIR"
fi

# --------------------------------------------------
# git remote
# --------------------------------------------------
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

# --------------------------------------------------
# next steps
# --------------------------------------------------
section "next steps"

REENC='chezmoi cd && chezmoi decrypt private_dot_config/shell/encrypted_private_env.age > /tmp/env && chezmoi encrypt < /tmp/env > private_dot_config/shell/encrypted_private_env.age && rm -f /tmp/env && git add . && git commit -m "Add new machine age recipient" && git push'
CHEZ='chezmoi update && chezmoi diff && chezmoi apply'

printf '\nAge Public Key:\n  %s\n\n' "$AGE_RECIPIENT"
printf 'GitHub SSH Key:\n  %s\n\n' "$SSH_PUBLIC_KEY"

if [ "$HAS_GIT_IDENTITY" -eq 0 ]; then
  printf 'Git username/email missing from %s\n' "$CHEZMOI_CONFIG"
  printf 'Add:\n'
  printf '  data:\n'
  printf '    git:\n'
  printf '      name: Your Name\n'
  printf '      email: you@example.com\n\n'
fi

printf 'To re-encrypt:\n  %s\n\n' "$REENC"
printf 'When done run:\n  %s\n\n' "$CHEZ"
printf 'Verify:\n'
printf '  ssh -T git@github.com\n'
printf '  git -C "$HOME/.local/share/chezmoi" remote -v\n'
printf '  mise doctor\n\n'

printf 'bootstrap: complete\n'
