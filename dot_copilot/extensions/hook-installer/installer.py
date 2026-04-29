#!/usr/bin/env python3
"""Hook-installer extension (cross-platform).
Installs OS-appropriate Git hooks into a repository when opt-in.
Usage: python installer.py install /path/to/repo
       python installer.py uninstall /path/to/repo

Behavior:
- Reads rules from .copilot/rules/gitflow.yml (repo) or user ~/.copilot/rules/gitflow.yml
- Creates hooks: .git/hooks/pre-commit, commit-msg, pre-push that invoke the corresponding .copilot/hooks/* wrappers
- On Windows writes PowerShell scripts; on POSIX writes shell scripts and sets executable bit
- Will not overwrite existing hooks unless --force is provided
"""
from __future__ import annotations
import argparse
import shutil
import sys
from pathlib import Path
from typing import List

HOOKS_DIR_NAME = '.copilot/hooks'
HOOK_TEMPLATES = {
    'pre-commit': {'posix': 'preflight.sh', 'windows': 'preflight.ps1'},
    'commit-msg': {'posix': 'msg-validator.sh', 'windows': 'msg-validator.ps1'},
    'pre-push': {'posix': 'preflight.sh', 'windows': 'preflight.ps1'},
}


def detect_platform() -> str:
    if sys.platform.startswith('win'):
        return 'windows'
    return 'posix'


def install_hooks(repo_path: Path, force: bool=False) -> List[str]:
    git_hooks = repo_path / '.git' / 'hooks'
    if not git_hooks.exists():
        raise FileNotFoundError('.git/hooks not found; ensure this is a Git repository')
    errors: List[str] = []
    platform = detect_platform()
    copilot_hooks_dir = repo_path / HOOKS_DIR_NAME
    if not copilot_hooks_dir.exists():
        errors.append(f'Copilot hooks dir not found: {copilot_hooks_dir}')
        return errors
    for hook_name, mapping in HOOK_TEMPLATES.items():
        src = copilot_hooks_dir / mapping[platform]
        dst = git_hooks / hook_name
        if not src.exists():
            errors.append(f'hook template not found: {src}')
            continue
        if dst.exists() and not force:
            errors.append(f'hook {dst} exists; use --force to overwrite')
            continue
        shutil.copyfile(src, dst)
        if platform == 'posix':
            dst.chmod(0o775)
    return errors


def uninstall_hooks(repo_path: Path) -> List[str]:
    git_hooks = repo_path / '.git' / 'hooks'
    errors: List[str] = []
    for hook_name in HOOK_TEMPLATES.keys():
        dst = git_hooks / hook_name
        if dst.exists():
            try:
                dst.unlink()
            except Exception as e:
                errors.append(str(e))
    return errors


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(prog='hook-installer')
    sub = parser.add_subparsers(dest='cmd')
    inst = sub.add_parser('install')
    inst.add_argument('repo')
    inst.add_argument('--force', action='store_true')
    un = sub.add_parser('uninstall')
    un.add_argument('repo')

    args = parser.parse_args(argv[1:])
    if args.cmd == 'install':
        repo = Path(args.repo)
        try:
            errs = install_hooks(repo, force=args.force)
            if errs:
                for e in errs:
                    print('ERROR:', e)
                return 2
            print('Hooks installed')
            return 0
        except FileNotFoundError as e:
            print('ERROR:', e)
            return 3
    elif args.cmd == 'uninstall':
        repo = Path(args.repo)
        errs = uninstall_hooks(repo)
        if errs:
            for e in errs:
                print('ERROR:', e)
            return 2
        print('Hooks uninstalled')
        return 0
    else:
        parser.print_help()
        return 1

if __name__ == '__main__':
    rc = main(sys.argv)
    sys.exit(rc)
