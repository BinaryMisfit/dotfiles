token-cache extension

Provides utilities to extract diff hunks, compute patch-hash cache keys, and estimate token usage for LLM requests.

Functions:
- compute_patch_hash(file_paths, diff_lines)
- extract_hunks_from_text(text, max_files=3, max_lines_per_file=500)
- extract_hunks_from_files(file_paths, ...)
- cache_get/cache_set
- estimate_tokens_for_hunks

Integration:
- Used by gitflow-guard skill before making LLM calls to limit tokens sent.
