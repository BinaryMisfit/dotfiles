#!/usr/bin/env python3
"""Policy-config validator and loader for gitflow-guard.
Cross-platform: run on Windows/macOS/Linux. Minimal dependencies: PyYAML recommended.
Usage:
  python validator.py validate [path]
  python validator.py locate
"""
from __future__ import annotations
import os
import sys
import stat
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Tuple

try:
    import yaml
except Exception:
    yaml = None

DEFAULT_LOCATIONS = [
    Path('.').resolve() / '.copilot' / 'rules' / 'gitflow.yml',
    Path.home() / '.copilot' / 'rules' / 'gitflow.yml',
]

# Minimal builtin defaults (used if no file found)
BUILTIN_DEFAULT: Dict[str, Any] = {
    'protected_branches': ['main', 'master', 'production'],
    'protected_paths': ['.github/workflows/**'],
    'auto_commit': {'max_files_changed': 5, 'max_diff_lines': 100, 'require_tests_passing': True},
    'commit_trailers': {'required_trailers': [], 'ban_lore_in_commits': True},
    'llm': {'max_summary_tokens': 1500, 'hunk_cap_files': 3, 'max_tokens_per_file': 500},
    'hook_installer': {'opt_in': True, 'install_on_repo_present': True},
}


def load_yaml(path: Path) -> Dict[str, Any]:
    if not yaml:
        print('ERROR: PyYAML not installed. Please pip install pyyaml', file=sys.stderr)
        raise SystemExit(3)
    with path.open('r', encoding='utf-8') as f:
        return yaml.safe_load(f) or {}


def find_config() -> Tuple[Path, Dict[str, Any]]:
    for p in DEFAULT_LOCATIONS:
        if p.exists():
            try:
                return p, load_yaml(p)
            except SystemExit:
                raise
            except Exception as e:
                print(f'Error loading {p}: {e}', file=sys.stderr)
                raise SystemExit(2)
    return Path('<builtin>'), BUILTIN_DEFAULT


def validate_schema(cfg: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    errors: List[str] = []
    warnings: List[str] = []

    # protected_branches
    pb = cfg.get('protected_branches')
    if pb is None:
        warnings.append('protected_branches missing; using defaults')
    elif not isinstance(pb, list):
        errors.append('protected_branches must be a list')

    # protected_paths
    pp = cfg.get('protected_paths')
    if pp is not None and not isinstance(pp, list):
        errors.append('protected_paths must be a list')

    # auto_commit
    ac = cfg.get('auto_commit')
    if ac is None:
        warnings.append('auto_commit missing; using defaults')
    else:
        if not isinstance(ac, dict):
            errors.append('auto_commit must be a mapping')
        else:
            mfc = ac.get('max_files_changed')
            if mfc is not None and (not isinstance(mfc, int) or mfc < 0):
                errors.append('auto_commit.max_files_changed must be a non-negative integer')
            mdl = ac.get('max_diff_lines')
            if mdl is not None and (not isinstance(mdl, int) or mdl < 0):
                errors.append('auto_commit.max_diff_lines must be a non-negative integer')

    # commit_trailers
    ct = cfg.get('commit_trailers')
    if ct is not None:
        if not isinstance(ct, dict):
            errors.append('commit_trailers must be a mapping')
        else:
            rt = ct.get('required_trailers')
            if rt is not None and not isinstance(rt, list):
                errors.append('commit_trailers.required_trailers must be a list')
            bl = ct.get('ban_lore_in_commits')
            if bl is not None and not isinstance(bl, bool):
                errors.append('commit_trailers.ban_lore_in_commits must be boolean')

    # llm caps
    llm = cfg.get('llm')
    if llm is not None:
        if not isinstance(llm, dict):
            errors.append('llm must be a mapping')
        else:
            mst = llm.get('max_summary_tokens')
            if mst is not None and (not isinstance(mst, int) or mst <= 0):
                errors.append('llm.max_summary_tokens must be positive int')
            hcf = llm.get('hunk_cap_files')
            if hcf is not None and (not isinstance(hcf, int) or hcf <= 0):
                errors.append('llm.hunk_cap_files must be positive int')

    # hook_installer
    hi = cfg.get('hook_installer')
    if hi is not None:
        if not isinstance(hi, dict):
            errors.append('hook_installer must be a mapping')
        else:
            oi = hi.get('opt_in')
            if oi is not None and not isinstance(oi, bool):
                errors.append('hook_installer.opt_in must be boolean')

    return errors, warnings


def check_acl(path: Path) -> Tuple[List[str], List[str]]:
    """Best-effort ACL checks. Returns (errors, warnings)."""
    errors: List[str] = []
    warnings: List[str] = []

    try:
        if os.name == 'posix':
            mode = stat.S_IMODE(path.stat().st_mode)
            # check world-readable or world-writable bits
            if mode & stat.S_IROTH:
                warnings.append(f'{path}: world-readable (others have read permission)')
            if mode & stat.S_IWOTH:
                warnings.append(f'{path}: world-writable (others have write permission)')
        elif os.name == 'nt':
            # Use PowerShell Get-Acl for more accurate ACL inspection
            try:
                ps_cmd = [
                    "powershell", "-NoProfile", "-Command",
                    "try {{ (Get-Acl -Path \"{p}\" | Select-Object -ExpandProperty Access | ConvertTo-Json -Compress) }} catch {{ Write-Error $_; exit 2 }}".format(p=str(path))
                ]
                result = subprocess.run(ps_cmd, capture_output=True, text=True, check=False)
                out = result.stdout.strip()
                if result.returncode == 2 or not out:
                    # fallback to icacls if PowerShell JSON failed
                    raise FileNotFoundError
                import json as _json
                try:
                    entries = _json.loads(out)
                except Exception:
                    # JSON parse failed, fallback to icacls
                    raise FileNotFoundError
                entries_list = entries if isinstance(entries, list) else [entries]
                for e in entries_list:
                    # Access objects from Get-Acl may include IdentityReference or nested objects
                    ident = ''
                    if isinstance(e, dict):
                        ident = e.get('IdentityReference') or e.get('IdentityReference', '')
                        if isinstance(ident, dict):
                            ident = ident.get('Value') or ''
                    else:
                        ident = str(e)
                    if str(ident) in ('Everyone', 'BUILTIN\\Users', 'Users'):
                        warnings.append(f'{path}: ACL contains broad principals ({ident})')
                        break
            except FileNotFoundError:
                # fallback to icacls if PowerShell/Get-Acl not available or parsing failed
                try:
                    result = subprocess.run(['icacls', str(path)], capture_output=True, text=True, check=False)
                    out = result.stdout + result.stderr
                    # only warn on explicit Everyone or BUILTIN\Users, avoid partial matches
                    if 'Everyone' in out or 'BUILTIN\\Users' in out:
                        warnings.append(f'{path}: ACL contains broad principals (Everyone/BUILTIN\\Users)')
                except FileNotFoundError:
                    warnings.append('PowerShell/Get-Acl and icacls not available to check Windows ACLs; please verify ACLs manually')
    except Exception as e:
        warnings.append(f'Failed to check ACLs: {e}')

    return errors, warnings


def main(argv: List[str]) -> int:
    if len(argv) >= 2 and argv[1] == 'locate':
        p, cfg = find_config()
        print(p)
        return 0

    # default action: validate
    config_path, cfg = find_config()
    print(f'Config source: {config_path}')
    errors, warnings = validate_schema(cfg)

    # ACL checks only if file exists on filesystem
    if config_path.exists():
        a_errs, a_warns = check_acl(config_path)
        errors.extend(a_errs)
        warnings.extend(a_warns)

    if errors:
        print('\nERRORS:')
        for e in errors:
            print(' -', e)
        print('\nFix errors before proceeding.')
        return 2

    if warnings:
        print('\nWARNINGS:')
        for w in warnings:
            print(' -', w)
        print('\nProceeding with warnings.')

    print('\nValidation OK')
    return 0


if __name__ == '__main__':
    try:
        rc = main(sys.argv)
    except SystemExit as e:
        rc = e.code if isinstance(e.code, int) else 1
    sys.exit(rc)
