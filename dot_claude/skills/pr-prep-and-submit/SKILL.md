---
name: pr-prep-and-submit
description: Prepare and submit a pull request with generated title, body, and file list. Invoke for actions like "create PR", "prepare PR for review", or "submit pull request".
user-invocable: true
---

# Skill: PR Prep and Submit

## Purpose
Generate a ready-to-submit PR with metadata; user confirms before submission.

---

## Required Inputs

- head_branch (current/source branch)

Optional:
- base_branch (defaults to the repo default branch)
- title_override
- body_notes

---

## Integration & Authentication

**Azure DevOps auth order: REST API first.** Required env vars: `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_TOKEN`.

**MCP fallback:** Use available ADO MCP tools only if REST API is unavailable.

**Azure DevOps setup:** Repo must be a valid Azure DevOps project repo with origin configured.

Stop and report if integration fails.

---

## Branch Validation Rules

- `head_branch` must exist and must not be a protected branch.
- `base_branch` must exist.
- `head_branch` and `base_branch` must be different.
- Protected branches follow the repo policy (for example: `main`, `master`, `integration`, `develop`, `release/*`, case-insensitive).
- If `head_branch` does not match the standard branch naming rules (`Feature/*`, `Defect/*`, `Other/*`, `Release/*`), warn in the preview but do not block submission by default.

---

## PR Metadata Generation Rules

**Title:** Use `title_override` when provided. Otherwise generate a concise PR title from the branch intent and commit summary.

**Body:** 
- List all files changed (grouped by file type or folder).
- Include summary of changes.
- Include any `body_notes` provided by the user.

**Merge strategy:** Use `noFastForward` (merge commit) unless the target branch enforces squash.

**Delete source branch:** Always `true` on completion.

---

## Required Flow

1. Perform the integration and authentication checks defined above. Stop and report if requirements are not met.
2. Resolve and validate `head_branch` and `base_branch` using the Branch Validation Rules above.
3. Collect commits and changed files between base and head.
4. Generate PR title, body, and file list per metadata rules.
5. Determine merge strategy per metadata rules.
6. Present a full PR summary including title, body, head branch -> base branch, file list, merge strategy, delete source branch setting, and any branch naming warning.
7. Require `Approve` to submit.
8. Submit PR via ADO API.
9. Return PR ID, URL, and confirmation.

---

## Output Contract

Return:
- pr_preview (title, body, file_list, merge_strategy, delete_source_branch)
- required_confirmation: `Approve`
- pr_id
- pr_url
- execution_result

---

## Failure Handling

- If `head_branch` is protected, stop and report.
- If head and base branches are identical, stop and report.
- If either branch does not exist, stop and report.
- If ADO API submission fails, stop and report cause.
- If MCP fails during submission, stop and report cause.
