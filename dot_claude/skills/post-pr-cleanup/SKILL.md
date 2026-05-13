---
name: post-pr-cleanup
description: Clean up local and remote branches after PR merge. Invoke for actions like "cleanup branches", "remove merged branches", or "cleanup after PR merge".
user-invocable: true
---

# Skill: Post-PR Cleanup

## Purpose
Identify and delete branches that have been merged into the configured default branch or are patch-equivalent, with a preview-first approval gate. Final target state: configured default branch plus only active (unmerged) branches.

---

## Required Inputs

- pr_completion_confirmed

---

## Integration & Repo Checks

**Try MCP first:** Use available Git MCP tools.

**Fallback:** Direct Git CLI.

**Git requirements:** Repo must be initialized, have `origin` tracking set, and allow checkout to the configured default branch.

Stop and report if any requirement is not met.

---

## Eligibility Rules

- Cleanup-eligible: ancestry-merged into the configured default branch, or patch-equivalent.
- Never eligible: protected branches (including the configured default branch, `integration`, `develop`, and `release/*`, case-insensitive), branches not created by the user, the current checked-out branch, branches with unique patches vs the configured default branch, or branches with ambiguous merge status.
- Always identify specific branches; never use broad prune-based cleanup.

---

## Required Flow

1. Perform the integration and repo checks defined above. Stop and report if requirements are not met.
2. If `pr_completion_confirmed` is false, stop and report.
3. Switch to the configured default branch and pull latest from origin.
4. Compute cleanup candidates (merged and patch-equivalent) using the Eligibility Rules above.
5. Preview local and remote deletion lists with reason (`merged` or `patch-equivalent`).
6. Require `Approve` to execute cleanup.
7. Delete local and remote branches.
8. Verify final state and report deleted and skipped branches.

---

## Output Contract

Return:
- cleanup_preview_local (branches to delete from local)
- cleanup_preview_remote (branches to delete from remote)
- required_confirmation: `Approve`
- local_branches_deleted
- remote_branches_deleted
- branches_skipped (with reason)
- execution_result

---

## Failure Handling

- If the configured default branch does not exist or is not accessible, stop and report.
- If push fails on remote deletion, stop and report; do not force-push.
