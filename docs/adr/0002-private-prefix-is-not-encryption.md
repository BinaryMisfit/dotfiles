# 0002 — `private_` prefix means restrictive permissions, not encryption

A repo scan (2026-08-30) found `CLAUDE.md` claiming "Files under `private_dot_*` are
age-encrypted." That's not what chezmoi's `private_` prefix does — it only sets
restrictive file permissions (0600/0700). Verified by checking every `private_dot_*` path
in this repo (`private_dot_ssh/`, `private_dot_config/`, the former `private_dot_npmrc`):
none of them are actually encrypted, and no `encrypted_`-prefixed file — chezmoi's real
encryption marker — exists anywhere in the repo. The documented `chezmoi add --encrypt`
workflow has never actually been used here.

**Status:** Decided

**Decision:** Correct `CLAUDE.md` to state plainly that no file in this repo is currently
age-encrypted, and that `private_` only implies permissions, not encryption.

**Why:** documentation that overstates what's actually protected is worse than no
documentation — the moment someone trusts it with a real secret on the strength of the
`private_` prefix alone, it fails silently.

**How to apply:** don't assume any `private_dot_*` path in this repo is encrypted without
separately confirming an `encrypted_` component is present. When a genuine secret needs
protecting, use `chezmoi add --encrypt <path>` explicitly — the prefix alone does nothing.
