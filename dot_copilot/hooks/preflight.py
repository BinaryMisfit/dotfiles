#!/usr/bin/env python3
"""Copilot preflight hook (cross-platform).
Runs deterministic checks on the workspace without requiring a Git repo:
 - Validates policy config via the policy-config validator
 - Runs tests (pytest) if present
 - Runs linters (flake8, eslint) if available
 - Scans for protected paths defined in the rules file
Outputs a compact JSON summary and uses exit code 0 for success, 2 for validation errors, 3 for failures.
"""
from __future__ import annotations
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path('.').resolve()
VALIDATOR = Path(__file__).parents[1] / '..' / 'extensions' / 'policy-config' / 'validator.py'
VALIDATOR = VALIDATOR.resolve()

def run_cmd(cmd: List[str], cwd: Path = ROOT) -> Dict[str, Any]:
    try:
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=False)
        return {'rc': proc.returncode, 'stdout': proc.stdout.strip(), 'stderr': proc.stderr.strip()}
    except FileNotFoundError:
        return {'rc': 127, 'stdout': '', 'stderr': f'command not found: {cmd[0]}'}


def run_validator() -> Dict[str, Any]:
    if not VALIDATOR.exists():
        return {'rc': 127, 'message': 'validator not found', 'path': str(VALIDATOR)}
    cmd = [sys.executable, str(VALIDATOR), 'validate']
    return run_cmd(cmd)


def run_pytests() -> Dict[str, Any]:
    if shutil.which('pytest') is None:
        return {'rc': 127, 'message': 'pytest not installed'}
    # run pytest in workspace root if tests exist
    if not (ROOT / 'tests').exists() and not any(ROOT.glob('**/test_*.py')):
        return {'rc': 0, 'message': 'no tests found, skipped'}
    return run_cmd([shutil.which('pytest'), '-q'])


def run_linters() -> Dict[str, Any]:
    results: Dict[str, Any] = {}
    # flake8 for python
    flake = shutil.which('flake8')
    if flake:
        results['flake8'] = run_cmd([flake, '.'])
    else:
        results['flake8'] = {'rc': 127, 'message': 'flake8 not installed'}
    # eslint for js
    eslint = shutil.which('eslint')
    if eslint:
        results['eslint'] = run_cmd([eslint, '.'])
    else:
        results['eslint'] = {'rc': 127, 'message': 'eslint not installed'}
    return results


def scan_protected(paths: List[str]) -> Dict[str, Any]:
    found: List[str] = []
    for p in paths:
        # naive glob
        for m in ROOT.glob(p.replace('**', '**')):
            found.append(str(m))
    return {'found': found}


def load_protected_from_rules() -> List[str]:
    # attempt to locate rules file using validator locate
    if not VALIDATOR.exists():
        return []
    res = run_cmd([sys.executable, str(VALIDATOR), 'locate'])
    if res.get('rc', 1) != 0:
        return []
    path = res.get('stdout', '').strip()
    if not path or path == '<builtin>':
        return []
    try:
        import yaml
        with open(path, 'r', encoding='utf-8') as f:
            cfg = yaml.safe_load(f) or {}
        return cfg.get('protected_paths') or []
    except Exception:
        return []


def main() -> int:
    out: Dict[str, Any] = {'checks': {}}
    v = run_validator()
    out['checks']['validator'] = v
    if v.get('rc', 1) != 0:
        print(json.dumps(out, indent=2))
        return 2

    t = run_pytests()
    out['checks']['pytest'] = t
    if t.get('rc', 0) not in (0,127):
        # test failures
        out['summary'] = 'tests_failed'
        print(json.dumps(out, indent=2))
        return 3

    l = run_linters()
    out['checks']['linters'] = l
    # determine if any linter errors (rc !=0 and !=127)
    for name, r in l.items():
        if r.get('rc', 0) not in (0,127):
            out['summary'] = 'linters_failed'
            print(json.dumps(out, indent=2))
            return 3

    protected = load_protected_from_rules()
    out['checks']['protected_paths'] = scan_protected(protected)

    out['summary'] = 'ok'
    print(json.dumps(out, indent=2))
    return 0

if __name__ == '__main__':
    rc = main()
    sys.exit(rc)
