#!/usr/bin/env python3
"""Diff extractor and token-cache for gitflow-guard.
Provides:
 - diff hunk extraction from file paths or unified diff
 - patch-hash cache keyed by file list + diff size
 - token-meter helper to estimate token usage

Cross-platform Python module.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
from typing import Dict, List, Tuple

CACHE_DIR = Path.home() / '.copilot' / 'cache' / 'gitflow-llm'


def compute_patch_hash(file_paths: List[str], diff_lines: int) -> str:
    h = hashlib.sha256()
    for p in file_paths:
        h.update(p.encode('utf-8'))
    h.update(str(diff_lines).encode('utf-8'))
    return h.hexdigest()[:16]


def extract_hunks_from_text(text: str, max_files: int=3, max_lines_per_file: int=500) -> Dict[str, List[str]]:
    # naive split by file markers if unified diff provided
    hunks: Dict[str, List[str]] = {}
    current_file = None
    lines = text.splitlines()
    for ln in lines:
        if ln.startswith('+++ b/') or ln.startswith('+++ '):
            current_file = ln.split('+++')[-1].strip()
            hunks[current_file] = []
            continue
        if current_file is None:
            continue
        if len(hunks) >= max_files and current_file not in hunks:
            continue
        if len(hunks[current_file]) >= max_lines_per_file:
            continue
        hunks[current_file].append(ln)
    return hunks


def extract_hunks_from_files(file_paths: List[str], max_files: int=3, max_lines_per_file: int=500) -> Dict[str, List[str]]:
    hunks: Dict[str, List[str]] = {}
    for p in file_paths[:max_files]:
        path = Path(p)
        if not path.exists():
            continue
        lines = path.read_text(encoding='utf-8').splitlines()
        hunks[path.name] = lines[:max_lines_per_file]
    return hunks


def cache_get(key: str) -> Dict | None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    p = CACHE_DIR / f'{key}.json'
    if p.exists():
        try:
            return json.loads(p.read_text(encoding='utf-8'))
        except Exception:
            return None
    return None


def cache_set(key: str, value: Dict):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    p = CACHE_DIR / f'{key}.json'
    p.write_text(json.dumps(value), encoding='utf-8')


def estimate_tokens_for_hunks(hunks: Dict[str, List[str]], avg_token_per_line: int=2) -> int:
    total_lines = sum(len(lines) for lines in hunks.values())
    return total_lines * avg_token_per_line
