# Repo security audit playbook

**Starter template, copied in automatically by the `hails-security-audit` skill on this repo's
first run** (see that skill's own Step 0). This is a generic seed, not a finished
methodology — extend it with this project's own real credential/API naming as it turns
up, the same way X-Lifestyle's own copy of this file grew out of a real first run.

Methodology for a sweep of this repo (and its submodules, if any) for accidentally
committed secrets, credentials, or other sensitive data.

**Run this whenever external eyes are about to see source that haven't before**, not
just once. A clean result today doesn't mean a clean result after the next dozen commits
— this is a repeatable check, not a one-time certification.

## Scope

This repo, plus every submodule actually checked out under it, enumerated fresh each run
(`git submodule status` or `.gitmodules` from the repo root — don't hardcode a list). A
repo with no submodules just audits itself. An upstream/third-party read-only reference
submodule (if this repo has one) isn't ours to audit for leaks — skip it, but confirm
which submodules (if any) fall into that category before assuming.

## What to check, per repo

1. **Tracked secret-shaped files.**
   ```
   git ls-files | grep -iE "\.env$|\.env\.|\.pem$|\.key$|credentials|\.p12$"
   ```
   Expect only `.env.example`-style files (placeholders, never real values) — anything
   else needs the actual file content read before deciding it's a problem. A filename
   match is not proof by itself (a real false positive elsewhere: a filename containing
   "secretary" matching a "secret" substring search).

2. **A real `.env` (or similar) ever committed, even if since removed** — a file deleted
   later is still in history unless the repo's history was rewritten.
   ```
   git log --all --diff-filter=A --name-only | grep -E "^\.env$"
   ```
   Extend the pattern to other credential-shaped filenames as they come up.

3. **Hardcoded token/key literals in source**, as distinct from an env-var *name* used as
   a lookup key or a mapping-table entry (both fine, and both will false-positive on a
   naive grep — verify every hit's actual line before flagging it).
   ```
   grep -rniE "api[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9]|secret\s*[:=]\s*['\"][a-zA-Z0-9]|password\s*[:=]\s*['\"][a-zA-Z0-9]|token\s*[:=]\s*['\"][a-zA-Z0-9]" \
     --include="*.ts" --include="*.js" --include="*.py" --include="*.go" .
   ```
   Add this project's own actual token/env-var names to the pattern once known (an
   env-var-name-to-CI-var-name mapping table is a real false-positive shape to expect).

4. **Leftover debug artifacts** that could carry sensitive runtime data (stack traces,
   internal paths, request contents) into a shipped build:
   ```
   grep -rn "console\.log\|debugger\|print(" --include="*.ts" --include="*.js" --include="*.py" .
   ```
   Exclude any build-generated file once identified — generated output can legitimately
   contain matching strings as embedded documentation, not an actual leftover statement.

5. **Accidentally committed session transcripts or chat logs** — a much worse leak than
   any of the above, since it would carry full conversation content, not just a stray
   credential.
   ```
   git ls-files | grep -iE "\.jsonl$|transcript|chatlog|session-log"
   ```

## What NOT to flag

- A submodule's own gitlink pointing at a commit — that's normal state, not a leak.
- This project's own tracking-number scheme (ticket IDs, decision-log references, etc.)
  matching a "credentials" or "key" substring by accident.
- Real credential *names* (env var names, CI variable names) appearing as plain text in
  scripts, docs, or `.env.example` — the name is not the secret.

## Run log

| Date | Repos covered | Findings | Notes |
|---|---|---|---|
| | | | First run — populate this row. |

## Expanding this playbook

Add a new numbered check above when a new secret *shape* is identified (a new API
provider's key format, a new credential file convention, a new CI system's variable
naming), not a one-off grep run in chat that never makes it back here. Append a row to the
run log every time this is actually executed, even if the result is "still clean."
