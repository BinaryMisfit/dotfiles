#!/usr/bin/env sh
set -eu

REPO="${CHEZMOI_REPO:-BinaryMisfit/dotfiles}"
ARCH="$(uname -m)"

echo "bootstrap: starting"
echo "bootstrap: repo=$REPO"
echo "bootstrap: arch=$ARCH"

export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"

if ! command -v mise >/dev/null 2>&1; then
  echo "mise: installing..."
  curl -fsLS https://mise.run | sh
fi

export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"

MISE="$(command -v mise || true)"

if [ -z "$MISE" ]; then
  echo "mise: not found after install"
  exit 1
fi

echo "mise: using $MISE"
echo "bootstrap: installing core tools..."

if [ "$ARCH" = "armv6l" ] || [ "$ARCH" = "armv7l" ]; then
  echo "$ARCH detected: using apt/manual fallback for bootstrap tools"

  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y age tar gzip
  else
    echo "apt-get not found; cannot install bootstrap tools on $ARCH"
    exit 1
  fi

  if ! command -v chezmoi >/dev/null 2>&1; then
    echo "chezmoi: resolving latest linux 32-bit ARM asset..."

    CHEZMOI_URL="$(
      curl -fsSL https://api.github.com/repos/twpayne/chezmoi/releases/latest |
        awk -F'"' '
          /browser_download_url/ &&
          /linux_arm/ &&
          !/linux_arm64/ &&
          /\.tar\.gz/ {
            print $4
            exit
          }
        '
    )"

    if [ -z "$CHEZMOI_URL" ]; then
      echo "chezmoi: failed to resolve linux 32-bit ARM release asset"
      exit 1
    fi

    echo "chezmoi: downloading $CHEZMOI_URL"

    tmpdir="$(mktemp -d)"
    curl -fsSL -o "$tmpdir/chezmoi.tar.gz" "$CHEZMOI_URL"
    tar -xzf "$tmpdir/chezmoi.tar.gz" -C "$tmpdir"
    mkdir -p "$HOME/.local/bin"
    install -m 755 "$tmpdir/chezmoi" "$HOME/.local/bin/chezmoi"
    rm -rf "$tmpdir"
  fi

  export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"
else
  "$MISE" use -g age@latest
  "$MISE" use -g chezmoi@latest
  "$MISE" install age@latest chezmoi@latest
  "$MISE" reshim || true

  export PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"
fi

if ! command -v zsh >/dev/null 2>&1; then
  echo "zsh: installing..."

  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y zsh
  elif command -v brew >/dev/null 2>&1; then
    brew install zsh
  else
    echo "zsh: no supported package manager found"
  fi
fi

if command -v zsh >/dev/null 2>&1; then
  if [ ! -f "$HOME/.iterm2_shell_integration.zsh" ]; then
    curl -fsSL https://iterm2.com/shell_integration/zsh \
      -o "$HOME/.iterm2_shell_integration.zsh"
  fi
fi

CHEZMOI="$(command -v chezmoi || true)"
AGE_KEYGEN="$(command -v age-keygen || true)"

if [ -z "$CHEZMOI" ]; then
  echo "chezmoi: not found after install"
  exit 1
fi

if [ -z "$AGE_KEYGEN" ]; then
  echo "age-keygen: not found after install"
  exit 1
fi

echo "chezmoi: using $CHEZMOI"
echo "age-keygen: using $AGE_KEYGEN"

CHEZMOI_DIR="$HOME/.config/chezmoi"
CHEZMOI_CONFIG="$CHEZMOI_DIR/chezmoi.yaml"
AGE_KEY="$CHEZMOI_DIR/age.key"
CHEZMOI_SOURCE="$HOME/.local/share/chezmoi"

mkdir -p "$CHEZMOI_DIR"

if [ ! -f "$AGE_KEY" ]; then
  echo "age: generating machine-local key..."
  "$AGE_KEYGEN" -o "$AGE_KEY"
  chmod 600 "$AGE_KEY"
fi

AGE_RECIPIENT="$(
  sed -n 's/^# public key: //p' "$AGE_KEY" | head -n 1
)"

if [ -z "$AGE_RECIPIENT" ]; then
  echo "age: failed to read public key"
  exit 1
fi

# Create chezmoi config only if missing.
# Do not overwrite: machine-local data such as git identity lives here.
if [ ! -f "$CHEZMOI_CONFIG" ]; then
  cat >"$CHEZMOI_CONFIG" <<EOF
encryption: age

age:
  identities:
    - $AGE_KEY
  recipients:
    - $AGE_RECIPIENT
EOF

  chmod 600 "$CHEZMOI_CONFIG"
  echo "chezmoi: created config at $CHEZMOI_CONFIG"
else
  echo "chezmoi: config already exists, leaving it untouched"
fi

if [ ! -d "$CHEZMOI_SOURCE" ]; then
  echo "chezmoi: init $REPO"
  "$CHEZMOI" init "$REPO"
else
  echo "chezmoi: source already exists at $CHEZMOI_SOURCE"
fi

HAS_GIT_IDENTITY=0
if grep -Eq '^[[:space:]]*git:[[:space:]]*$' "$CHEZMOI_CONFIG" 2>/dev/null; then
  HAS_GIT_IDENTITY=1
fi

cat <<EOF

bootstrap: setup complete

age public key for this machine:
$AGE_RECIPIENT

IMPORTANT:
  Back up this file:
    $AGE_KEY

  Losing it = losing access to encrypted secrets.

EOF

if [ "$HAS_GIT_IDENTITY" -ne 1 ]; then
  cat <<EOF
=== GIT IDENTITY REQUIRED ===

Edit:
  $CHEZMOI_CONFIG

Add:
data:
  git:
    name: Your Name
    email: you@example.com

EOF
fi

cat <<EOF
=== SECRET ENROLLMENT REQUIRED ===

On an EXISTING trusted machine:

  chezmoi edit-config

Add this recipient:

  age:
    recipients:
      - existing_recipient
      - $AGE_RECIPIENT

Re-encrypt secrets:

  chezmoi cd
  find . -name '*.age' | while read -r f; do
    tmp="\$(mktemp)"
    chezmoi decrypt "\$f" > "\$tmp"
    chezmoi encrypt -o "\$f" "\$tmp"
    rm -f "\$tmp"
  done

Commit + push:

  git add .
  git commit -m "Add new machine age recipient"
  git push

Back on THIS machine:

  chezmoi update
  chezmoi diff
  chezmoi apply

Next:
  chezmoi diff
  chezmoi apply

After apply, verify:
  chezmoi managed
  git config user.name
  git config user.email
  mise doctor

bootstrap: complete (apply pending)
EOF

exit 0
