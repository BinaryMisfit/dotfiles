---
name: commit-ready-check
description: Validate that staged changes meet commit criteria before committing. Invoke for actions like "check commit readiness", "verify ready to commit", or "validate commit eligibility".
user-invocable: true
---

# Skill: Commit Ready Check

## Purpose
Assess whether staged changes meet single-concern, test-coverage, and protected-file criteria before committing.

---

## Inputs

Optional:
- ticket_id (JIRA ticket for commit message, e.g., `UA-1234` — omit for non-JIRA repos)
- run_tests (defaults to `true`)

---

## Integration

**Try MCP first:** Use available Git MCP tools.

**Fallback:** Direct Git CLI.

Stop and report if Git integration fails.

---

## Commit Readiness Criteria

**All of these must be TRUE to proceed:**

1. **Single concern:** Exactly one feature/fix/refactor (no multi-concern mixes). Hard block if mixed concerns detected.
2. **Diff size:** Advisory warning above 200 lines; hard block above 500 lines (excludes test files, generated code, env-only configs).
3. **Tests:** Tests pass if `run_tests=true` — hard block on failure. Coverage: warn below 60% only if coverage tooling is available; skip check if not.
4. **No open TODOs:** No `TODO`, `FIXME`, `XXX`, `HACK` comments in changed code.
5. **Protected files:** Changes to protected files require explicit user review before proceeding.

**Protected files (block without user review):**
- Paths containing: `auth`, `crypto`, `secret`, `password`, `token`, `key`, `vault` (case-insensitive)
- `.github/workflows/`, `infrastructure/`, `deployment/`
- `.env`, `secrets.yml`, `credentials.json`, `.claude/settings.json`, `.claude/settings.local.json`, `CLAUDE.md`, `.claude/CLAUDE.md`

**Commit message format:**

With `ticket_id`:
```
JIRATICKET - Summary
- Change 1
- Change 2
```

Without `ticket_id`:
```
Summary
- Change 1
- Change 2
```

- First line: concise summary (never generic like "fix stuff").
- Body: minimum 2 concrete bullets.
- If tests were run: include one bullet with test command and result.

---

## Required Flow

1. Perform Git integration checks. Stop if Git access fails.
2. Validate that staged changes exist.
3. Calculate diff size (exclude test, generated, env-only).
4. Check for protected files in changes. If found: show list and wait for affirmation before proceeding.
5. Scan for open TODOs/FIXMEs in changed code.
6. If `run_tests=true`: run test suite for affected modules.
7. Assess test coverage if tooling available; warn below 60%.
8. Build readiness report (pass/fail per criterion).
9. If all criteria pass: generate commit message, preview report + commit message, and wait for affirmation before committing.
10. If any criterion fails: return report + blocking reason.

---

## Output Contract

Return:
- readiness_report (pass/fail per criterion)
- blocking_issues (if any)
- protected_files_found (list if any)
- test_results (if run)
- coverage_summary (if checked)
- commit_message_preview (if ready)
- next_action (commit executed after affirmation, or blocked with reason)

---

## Failure Handling

- If tests fail, block commit and return test output.
- If diff size is 200–500 lines, warn but do not block.
- If diff size exceeds 500 lines, report size and block.
- If protected files found, show list and wait for affirmation before proceeding.
- If TODOs found, block and list line numbers.
- If coverage tooling available and coverage <60%, warn but do not block.
- If coverage tooling not available, skip coverage check.
- If commit message format is invalid, block and show required format.
- If Git staging is empty, report and ask user to stage changes.
