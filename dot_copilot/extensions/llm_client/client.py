"""Lightweight LLM client scaffold.
Do not include provider-specific code here. Instead, read environment variables to decide provider and keep a single summarize(text, max_tokens) function.
"""
from __future__ import annotations
import os

def summarize(text: str, max_tokens: int=512) -> str:
    # placeholder: naive truncation
    lines = text.splitlines()
    approx_tokens = sum(len(l.split()) for l in lines)
    if approx_tokens <= max_tokens:
        return '\n'.join(lines)
    # naive truncation
    truncated = []
    count = 0
    for l in lines:
        count += len(l.split())
        if count > max_tokens:
            break
        truncated.append(l)
    return '\n'.join(truncated)
