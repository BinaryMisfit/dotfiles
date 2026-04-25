# Ensure mise is available
export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"

MISE="$(command -v mise || true)"
if [ -z "$MISE" ]; then
  echo "mise not found after install"
  exit 1
fi

# Install chezmoi via mise if missing
if ! command -v chezmoi >/dev/null 2>&1; then
  echo "chezmoi: installing via mise..."
  "$MISE" use -g chezmoi@latest
  "$MISE" install chezmoi@latest
  "$MISE" reshim || true
fi

CHEZMOI="$(command -v chezmoi || true)"
if [ -z "$CHEZMOI" ]; then
  echo "chezmoi: still not found after mise install"
  exit 1
fi

echo "chezmoi: using $CHEZMOI"
"$CHEZMOI" init --apply BinaryMisfit
