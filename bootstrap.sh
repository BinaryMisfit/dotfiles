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

export PATH="$MISE_SHIMS:$LOCAL_BIN:$PATH"

section() { printf '\n==> %s\n' "$1"; }
info() { printf '  %s\n' "$1"; }
die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

ensure_update_apply_false() {
  [ -f "$CHEZMOI_CONFIG" ] || return 0

  TMP="${CHEZMOI_CONFIG}.tmp"

  if grep -Eq '^[[:space:]]*update:[[:space:]]*$' "$CHEZMOI_CONFIG"; then
    awk '
      BEGIN {
        in_update = 0
        saw_apply = 0
      }

      /^[^[:space:]][^:]*:[[:space:]]*$/ {
        if (in_update && !saw_apply) {
          print "  apply: false"
        }
        in_update = 0
        saw_apply = 0
      }

      /^[[:space:]]*update:[[:space:]]*$/ {
        in_update = 1
        saw_apply = 0
        print
        next
      }

      in_update && /^[[:space:]]*apply:[[:space:]]*/ {
        print "  apply: false"
        saw_apply = 1
        next
      }

      {
        print
      }

      END {
        if (in_update && !saw_apply) {
          print "  apply: false"
        }
      }
    ' "$CHEZMOI_CONFIG" >"$TMP"
    mv "$TMP" "$CHEZMOI_CONFIG"
  else
    cat >>"$CHEZMOI_CONFIG" <<'EOF'

update:
  apply: false
EOF
  fi
}

section "bootstrap"
info "repo: $REPO"

# --------------------------------------------------
# base deps
# --------------------------------------------------
if command -v apt-get >/dev/null 2>&1; then
  if ! command -v git >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
    section "base deps"
    info "installing git/curl"
    sudo apt-get update -y
    sudo apt-get install -y git curl ca-certificates
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

if [ -f "$HOME/.bashrc" ] && ! grep -q 'mise activate' "$HOME/.bashrc"; then
  info "persisting mise activation"
  echo 'eval "$($HOME/.local/bin/mise activate sh)"' >>"$HOME/.bashrc"
fi

export PATH="$MISE_SHIMS:$LOCAL_BIN:$PATH"

# --------------------------------------------------
# core tools
# --------------------------------------------------
section "core tools"

"$MISE" use -g age@latest
"$MISE" use -g chezmoi@latest

"$MISE" install age@latest chezmoi@latest
"$MISE" reshim || true

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

update:
  apply: false
EOF
  info "created: $CHEZMOI_CONFIG"
else
  info "config already exists, enforcing update.apply=false"
  ensure_update_apply_false
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
printf '  mise doctor\n'
printf '  chezmoi data | grep -A5 update\n\n'

printf 'bootstrap: complete\n'
