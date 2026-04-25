#!/usr/bin/env sh
set -eu

REPO="${CHEZMOI_REPO:-BinaryMisfit}"

echo "bootstrap: starting"

# Base PATH
export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"

# Install mise if missing
if ! command -v mise >/dev/null 2>&1; then
  echo "mise: installing..."
  curl -fsLS https://mise.run | sh
fi

export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"

MISE="$(command -v mise || true)"
[ -n "$MISE" ] || { echo "mise: not found after install"; exit 1; }

echo "mise: using $MISE"

ARCH="$(uname -m)"

echo "bootstrap: installing core tools..."

if [ "$ARCH" = "armv6l" ]; then
  echo "armv6l detected: using apt/script fallback"

  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y age
  fi

  if ! command -v chezmoi >/dev/null 2>&1; then
    sh -c "$(curl -fsLS https://get.chezmoi.io)" -- -b "$HOME/.local/bin"
  fi
else
  "$MISE" use -g age@latest
  "$MISE" use -g chezmoi@latest
  "$MISE" install age@latest chezmoi@latest
fi

"$MISE" reshim || true

# Ensure PATH is correct after installs
export PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"

CHEZMOI="$(command -v chezmoi || true)"
AGE_KEYGEN="$(command -v age-keygen || true)"

[ -n "$CHEZMOI" ] || { echo "chezmoi: not found after install"; exit 1; }
[ -n "$AGE_KEYGEN" ] || { echo "age-keygen: not found after install"; exit 1; }

echo "chezmoi: using $CHEZMOI"
echo "age-keygen: using $AGE_KEYGEN"

# Setup chezmoi encryption config
mkdir -p "$HOME/.config/chezmoi"

if [ ! -f "$HOME/.config/chezmoi/age.key" ]; then
  echo "age: generating machine-local key..."
  "$AGE_KEYGEN" -o "$HOME/.config/chezmoi/age.key"
  chmod 600 "$HOME/.config/chezmoi/age.key"
fi

AGE_RECIPIENT="$(
  sed -n 's/^# public key: //p' "$HOME/.config/chezmoi/age.key" | head -n 1
)"

[ -n "$AGE_RECIPIENT" ] || {
  echo "age: failed to read public key"
  exit 1
}

cat > "$HOME/.config/chezmoi/chezmoi.yaml" <<EOF
encryption: age

age:
  identities:
    - $HOME/.config/chezmoi/age.key
  recipients:
    - $AGE_RECIPIENT
EOF

chmod 600 "$HOME/.config/chezmoi/chezmoi.yaml"

# Initialize repo if needed
if [ ! -d "$HOME/.local/share/chezmoi" ]; then
  echo "chezmoi: init $REPO"
  "$CHEZMOI" init "$REPO"
else
  echo "chezmoi: source already exists"
fi

# Apply non-encrypted config only
echo "chezmoi: applying public config..."
"$CHEZMOI" apply --exclude=encrypted

cat <<EOF

bootstrap: public config applied.

age public key for this machine:
$AGE_RECIPIENT

NOTE:
  Back up this file:
    ~/.config/chezmoi/age.key

  Losing it = losing access to encrypted secrets.

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
  chezmoi apply

bootstrap: complete (secrets pending)

EOF

exit 0
