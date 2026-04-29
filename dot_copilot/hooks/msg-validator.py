#!/usr/bin/env python3
"""Commit message validator for Copilot hooks.
Usage: msg-validator.py <commit-msg-file>
Exits 0 if message valid, 1 on violation.
Checks:
 - required commit trailers from policy-config
 - ban lore tokens (configurable)
"""
from __future__ import annotations
import sys
from pathlib import Path
import re
import subprocess

LORE_TOKENS = [
    'Vault','Rad-Roaches','Feral Ghouls','Rust & Ruin','pwned','1337','sk1lls','n00b','0wned','pwn3d'
]


def load_rules():
    # locate rules via validator.py
    validator = Path(__file__).parents[1] / '..' / 'extensions' / 'policy-config' / 'validator.py'
    validator = validator.resolve()
    if not validator.exists():
        return {}
    try:
        res = subprocess.run([sys.executable, str(validator), 'locate'], capture_output=True, text=True, check=False)
        path = res.stdout.strip()
        if path and path != '<builtin>' and Path(path).exists():
            import yaml
            return yaml.safe_load(Path(path).read_text(encoding='utf-8')) or {}
    except Exception:
        return {}
    return {}


def main():
    if len(sys.argv) < 2:
        print('Usage: msg-validator.py <commit-msg-file>')
        return 1
    msgfile = Path(sys.argv[1])
    if not msgfile.exists():
        print('Commit message file not found', file=sys.stderr)
        return 1
    text = msgfile.read_text(encoding='utf-8')
    cfg = load_rules()
    ct = cfg.get('commit_trailers', {})
    required = ct.get('required_trailers', []) if isinstance(ct, dict) else []
    ban_lore = ct.get('ban_lore_in_commits', True) if isinstance(ct, dict) else True

    # check required trailers
    missing = []
    for trailer in required:
        if trailer not in text:
            missing.append(trailer)
    if missing:
        print('Missing required commit trailers:', missing, file=sys.stderr)
        return 1

    # check lore tokens
    if ban_lore:
        found = [t for t in LORE_TOKENS if re.search(r'\b' + re.escape(t) + r'\b', text, flags=re.IGNORECASE)]
        if found:
            print('Forbidden lore tokens found in commit message:', found, file=sys.stderr)
            return 1

    # all good
    return 0

if __name__ == '__main__':
    rc = main()
    sys.exit(rc)
