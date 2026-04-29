#!/usr/bin/env python3
"""gitflow-guard skill (cross-platform)
Usage examples:
  python skill.py check --files-changed 3 --diff-lines 42 --files file1.py file2.py
  python skill.py pr-summary --files file1.py file2.py --title "WIP" --body "Short"

This CLI is a lightweight orchestrator: it runs the policy-config validator, calls preflight checks, applies simple deterministic rules, and returns compact JSON results. LLM summarization is a placeholder (pluggable).
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path('.').resolve()
SKILLS_DIR = Path(__file__).parents[1]
VALIDATOR = (SKILLS_DIR / '..' / 'extensions' / 'policy-config' / 'validator.py').resolve()
PREFLIGHT = (SKILLS_DIR / '..' / 'hooks' / 'preflight.py').resolve()
CACHE_DIR = Path.home() / '.copilot' / 'cache' / 'gitflow-guard'


def run_cmd(cmd: List[str]) -> Dict[str, Any]:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        return {'rc': proc.returncode, 'stdout': proc.stdout, 'stderr': proc.stderr}
    except FileNotFoundError:
        return {'rc': 127, 'stdout': '', 'stderr': f'cmd not found: {cmd[0]}'}


def cache_get(key: str) -> Optional[Dict[str, Any]]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    p = CACHE_DIR / f"{key}.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding='utf-8'))
        except Exception:
            return None
    return None


def cache_set(key: str, value: Dict[str, Any]):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    p = CACHE_DIR / f"{key}.json"
    p.write_text(json.dumps(value), encoding='utf-8')


def compute_patch_hash(files: List[str], diff_lines: int) -> str:
    h = hashlib.sha256()
    for f in files:
        h.update(f.encode('utf-8'))
    h.update(str(diff_lines).encode('utf-8'))
    return h.hexdigest()[:16]


def run_validator() -> Dict[str, Any]:
    if not VALIDATOR.exists():
        return {'rc': 127, 'stderr': 'validator not found'}
    return run_cmd([sys.executable, str(VALIDATOR), 'validate'])


def run_preflight() -> Dict[str, Any]:
    if not PREFLIGHT.exists():
        return {'rc': 127, 'stderr': 'preflight hook not found'}
    return run_cmd([sys.executable, str(PREFLIGHT)])


def deterministic_check(files_changed: int, diff_lines: int, files: List[str], cfg: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {'allowed': True, 'reasons': []}
    ac = cfg.get('auto_commit', {})
    max_files = ac.get('max_files_changed', 5)
    max_lines = ac.get('max_diff_lines', 100)
    if files_changed > max_files:
        out['allowed'] = False
        out['reasons'].append(f'files_changed {files_changed} > max_files {max_files}')
    if diff_lines > max_lines:
        out['allowed'] = False
        out['reasons'].append(f'diff_lines {diff_lines} > max_diff_lines {max_lines}')
    # protected paths scan
    protected = cfg.get('protected_paths') or []
    touched_protected = [p for p in files for prot in protected if prot.replace('**','') in p]
    if touched_protected:
        out['allowed'] = False
        out['reasons'].append(f'touches protected paths: {touched_protected[:3]}')
    return out


def load_rules() -> Dict[str, Any]:
    # try validator locate
    res = run_cmd([sys.executable, str(VALIDATOR), 'locate'])
    path = res.get('stdout','').strip() if res.get('rc',1)==0 else ''
    if path and path != '<builtin>' and Path(path).exists():
        try:
            import yaml
            return yaml.safe_load(Path(path).read_text(encoding='utf-8')) or {}
        except Exception:
            return {}
    return {}


def pr_summary(files: List[str], title: str, body: str, cfg: Dict[str, Any], use_llm: bool=False) -> Dict[str, Any]:
    # Attempt to load diff_extractor module from extensions/token-cache
    diff_mod = None
    try:
        import importlib.util
        diff_path = Path(__file__).parents[2] / 'extensions' / 'token-cache' / 'diff_extractor.py'
        spec = importlib.util.spec_from_file_location('diff_extractor', str(diff_path))
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            diff_mod = mod
    except Exception:
        diff_mod = None

    # compute total lines across provided files for cache key
    total_lines = 0
    for f in files:
        p = Path(f)
        if p.exists():
            try:
                total_lines += len(p.read_text(encoding='utf-8').splitlines())
            except Exception:
                continue

    key = compute_patch_hash(files, total_lines)
    cached = cache_get(key)
    if cached:
        return {'cached': True, 'summary': cached}

    # extract hunks (capped) and estimate tokens
    hunks = {}
    if diff_mod:
        llm_cfg = cfg.get('llm', {}) if cfg else {}
        hunk_files = llm_cfg.get('hunk_cap_files', 3)
        max_lines = llm_cfg.get('max_tokens_per_file', 500)
        try:
            hunks = diff_mod.extract_hunks_from_files(files, max_files=hunk_files, max_lines_per_file=max_lines)
            estimated_tokens = diff_mod.estimate_tokens_for_hunks(hunks)
        except Exception:
            hunks = {}
            estimated_tokens = total_lines * 2
    else:
        estimated_tokens = total_lines * 2

    # enforce LLM caps from config
    llm_cfg = cfg.get('llm', {}) if cfg else {}
    max_tokens = llm_cfg.get('max_summary_tokens', 1500)
    if estimated_tokens > max_tokens:
        use_llm = False
        llm_note = f'LLM suppressed: estimated_tokens {estimated_tokens} > max {max_tokens}'
    else:
        llm_note = ''

    summary = {
        'title': title,
        'body': body,
        'files': list(hunks.keys())[:10] if hunks else files[:10],
        'note': 'deterministic summary',
        'estimated_tokens': estimated_tokens,
        'llm_note': llm_note,
    }

    if use_llm:
        summary['llm'] = 'LLM call placeholder'

    cache_set(key, summary)
    return {'cached': False, 'summary': summary}


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(prog='gitflow-guard')
    sub = parser.add_subparsers(dest='cmd')
    chk = sub.add_parser('check')
    chk.add_argument('--files-changed', type=int, default=0)
    chk.add_argument('--diff-lines', type=int, default=0)
    chk.add_argument('--files', nargs='*', default=[])

    prs = sub.add_parser('pr-summary')
    prs.add_argument('--files', nargs='*', default=[])
    prs.add_argument('--title', default='')
    prs.add_argument('--body', default='')
    prs.add_argument('--use-llm', action='store_true')

    args = parser.parse_args(argv[1:])
    if args.cmd == 'check':
        v = run_validator()
        if v.get('rc',1)!=0:
            print(json.dumps({'error':'validator_failed','details':v}, indent=2))
            return 2
        cfg = load_rules()
        res = deterministic_check(args.files_changed, args.diff_lines, args.files, cfg)
        print(json.dumps(res, indent=2))
        return 0 if res.get('allowed') else 3
    elif args.cmd == 'pr-summary':
        cfg = load_rules()
        res = pr_summary(args.files, args.title, args.body, cfg, use_llm=args.use_llm)
        print(json.dumps(res, indent=2))
        return 0
    else:
        parser.print_help()
        return 1

if __name__ == '__main__':
    rc = main(sys.argv)
    sys.exit(rc)
