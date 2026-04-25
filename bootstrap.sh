#!/usr/bin/env sh
set -eu

REPO="${CHEZMOI_REPO:-BinaryMisfit}"

echo "bootstrap: starting"

# Ensure local bin paths are available.
export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"

# Install mise if missing.
if ! command -v mise >/dev/null 2>&1; then
  echo "mise: installing..."
  curl https://mise.run | sh
fi

export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"

MISE="$(command -v mise || true)"
if [ -z "$MISE" ]; then
  echo "mise: not found after install"
  exit 1
fi

echo "mise: using $MISE"

# Install core bootstrap tools.
echo "mise: installing core tools..."
"$MISE" use -g chezmoi@latest
"$MISE" use -g age@latest
"$MISE" install chezmoi@latest age@latest
"$MISE" reshim || true

export PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"

CHEZMOI="$(command -v chezmoi || true)"
AGE_KEYGEN="$(command -v age-keygen || true)"

if [ -z "$CHEZMOI" ]; then
  echo "chezmoi: not found after mise install"
  exit 1
fi

if [ -z "$AGE_KEYGEN" ]; then
  echo "age-keygen: not found after mise install"
  exit 1
fi

echo "chezmoi: using $CHEZMOI"
echo "age-keygen: using $AGE_KEYGEN"

# Configure chezmoi age encryption locally.
mkdir -p "$HOME/.config/chezmoi"

if [ ! -f "$HOME/.config/chezmoi/age.key" ]; then
  echo "age: generating machine-local key..."
  "$AGE_KEYGEN" -o "$HOME/.config/chezmoi/age.key"
  chmod 600 "$HOME/.config/chezmoi/age.key"
fi

AGE_RECIPIENT="$(
  sed -n 's/^# public key: //p' "$HOME/.config/chezmoi/age.key" | head -n 1
)"

if [ -z "$AGE_RECIPIENT" ]; then
  echo "age: failed to read public key from $HOME/.config/chezmoi/age.key"
  exit 1
fi

cat > "$HOME/.config/chezmoi/chezmoi.yaml" <<EOF
encryption: age

age:
  identities:
    - $HOME/.config/chezmoi/age.key
  recipients:
    - $AGE_RECIPIENT
EOF

chmod 600 "$HOME/.config/chezmoi/chezmoi.yaml"

# Clone chezmoi source without applying encrypted secrets yet.
if [ ! -d "$HOME/.local/share/chezmoi" ]; then
  echo "chezmoi: init $REPO"
  "$CHEZMOI" init "$REPO"
else
  echo "chezmoi: source already exists"
fi

# First pass: apply everything except encrypted files.
echo "chezmoi: applying public config only..."
"$CHEZMOI" apply --exclude=encrypted

cat <<EOF

bootstrap: public config applied.

age public key for this machine:
$AGE_RECIPIENT

=== SECRET ENROLLMENT REQUIRED ===

On an EXISTING trusted machine, run:

  chezmoi cd
  chezmoi edit-config   # ensure your own age recipient is already present

Then add this new recipient:
  $AGE_RECIPIENT

Re-encrypt secrets (example for env.zsh):

  chezmoi cd
  chezmoi decrypt private_dot_config/shell/env.zsh.age > /tmp/env.zsh
  chezmoi encrypt -o private_dot_config/shell/env.zsh.age /tmp/env.zsh
  rm -f /tmp/env.zsh

Commit + push:

  git add .
  git commit -m "Add new machine age recipient"
  git push

Back on THIS machine:

  chezmoi update
  chezmoi apply

EOF

echo "bootstrap: waiting for encrypted secrets to be configured..."
exit 0
