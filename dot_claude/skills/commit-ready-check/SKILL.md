---
name: commit-ready-check
description: Validate that staged changes meet commit criteria before committing. Invoke for actions like "check commit readiness", "verify ready to commit", or "validate commit eligibility".
user-invocable: true
---

# Skill: Commit Ready Check

## Purpose
Assess whether staged changes meet single-concern, test-coverage, and protected-file criteria before auto-commit or manual commit.

---

## Required Inputs

- ticket_id (JIRA ticket for commit message, e.g., `UA-1234`)

Optional:
- run_tests (defaults to `true`)
- auto_commit (defaults to `false`; if `true`, auto-commit if all checks pass)

---

## Integration & Authentication

**Try MCP first:** Use available Git MCP tools.

**Fallback:** Direct Git CLI.

Stop and report if Git integration fails.

---

## Commit Readiness Criteria

**All of these must be TRUE to proceed:**

1. **Single concern:** Exactly one feature/fix/refactor across 1–5 files changed (no multi-concern mixes).
2. **Diff size:** ≤100 lines total diff (excludes: test files, auto-generated code, env-only configs).
3. **Tests:** Tests pass (if `run_tests=true`). New code must have test coverage (≥80% for new lines).
4. **No open TODOs:** No `TODO`, `FIXME`, `XXX`, `HACK` comments in changed code.
5. **Protected files:** Changes to protected files require explicit user review and approval.

**Protected files (auto-block without user approval):**
- Paths containing: `auth`, `crypto`, `secret`, `password`, `token`, `key`, `vault` (case-insensitive)
- `.github/workflows/`, `infrastructure/`, `deployment/`
- `.env`, `secrets.yml`, `credentials.json`, `.claude/settings.json`, `.claude/settings.local.json`, `CLAUDE.md`, `.claude/CLAUDE.md`
- Exported APIs, config schemas

**Commit message format (REQUIRED):**
```
JIRATICKET - Message
- Change 1
- Change 2
- Change 3
```
- JIRATICKET must be uppercase and match the active ticket (e.g., `UA-1234`).
- First line: concise summary (never generic like "fix stuff").
- Body: multiline bullets describing key implementation details (minimum 2 concrete bullets).
- If tests were run: include one bullet with test command and result.

---

## Required Flow

1. Perform Git integration checks. Stop if Git access fails.
2. Validate that staged changes exist.
3. Check file count (1–5 files).
4. Calculate diff size (exclude test, generated, env-only).
5. Check for protected files in changes.
   - If protected files found: pause and require explicit user approval before proceeding.
6. Scan for open TODOs/FIXMEs in changed code.
7. If `run_tests=true`: run test suite for affected modules.
8. Assess test coverage for new code (must be ≥80% for new lines).
9. Build readiness report (pass/fail per criterion).
10. If all criteria pass and `auto_commit=false`: return report + manual next step prompt.
11. If all criteria pass and `auto_commit=true`: generate commit message, preview, require user approval, then auto-commit.
12. If any criterion fails: return report + blocking reason.

---

## Guardrails

- Never auto-commit protected files without explicit user review.
- Always preview commit message before any auto-commit.
- If tests fail, block commit and report test failures.
- If TODOs found, block commit and list exact line numbers and comments.
- If criteria are ambiguous, ask user before proceeding.
- Tie-breaker: Apply most restrictive criterion.

---

## Output Contract

Return:
- readiness_report (pass/fail per criterion)
- blocking_issues (if any)
- protected_files_found (list if any; require approval)
- test_results (if run)
- coverage_summary (if checked)
- commit_message_preview (if ready)
- next_action (manual commit instruction or auto-commit executed)

---

## Failure Handling

- If tests fail, block commit and return test output.
- If diff size exceeds limit, report size and block.
- If >5 files changed, report file list and block.
- If protected files found, stop and require explicit user approval with `Proceed`.
- If TODOs found, block and list line numbers.
- If coverage <80% for new lines, block and report coverage percentage.
- If commit message format is invalid, block and show required format.
- If Git staging is empty, report and ask user to stage changes.
