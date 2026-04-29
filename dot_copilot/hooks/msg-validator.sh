#!/usr/bin/env bash
PYTHON="$(command -v python3 || command -v python)"
if [ -z "$PYTHON" ]; then
  echo "Python not found in PATH" >&2
  exit 127
fi
SCRIPT_DIR=$(dirname "$0")
"$PYTHON" "$SCRIPT_DIR/msg-validator.py" "$1"
