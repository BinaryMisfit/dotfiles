## Branching Structure

- If JIRA is known and a new feature/addition/change - Feature/[JIRANUMBER]. No descriptions or other additions.
- If JIRA is known and a bug fix or tester reported problem - Defect/[JIRANUMBER]. No descriptions or other additions.
- If JIRA is known and work is investigative, task or a spike - Other/[JIRANUMBER]. No descriptions or other additions.
- If no JIRA then the branch is always Other/[PascalCaseShortDesc]. The description should not be a novel.
- Release branches: Release/[version] (e.g. Release/26.10). Created only on explicit user instruction.

---

## Release Branch Creation

- Create locally only. Do not push until user explicitly confirms.
- Once pushed, the branch is protected: all subsequent changes require a PR (never direct commits).
- Follow the Push & Protected Branches rules below for all further work on the branch.

---

## Push & Protected Branches

**Policy:** User request only. Never autonomous.

**Protected branches (`main`, `master`, `integration`, `develop`, `release/*`):**
- Matching is case-insensitive (e.g. `Main`, `Master`, `Integration`, `Develop`, `Release/*` are also protected).
- Branches not created by the user are treated as protected.
- ALL changes require PR from a new branch (never direct commits)
- PR must be approved before merge
- Require explicit `"Proceed"` confirmation

**Pre-flight:** CI/CD passes, conflicts resolved locally, target confirmed.

---

## Post-PR Cleanup

Trigger:
- Run only when PR completion is confirmed by user or explicitly checked via ADO.

Confirmation gate:
- Preview all branch actions first.
- Require `"Proceed"` before executing any local branch deletion.
- Require a second `"Proceed"` before executing any remote branch deletion.

Cleanup steps:
1. Switch to `main` and pull latest from origin.
2. Identify branches eligible for cleanup:
	- Ancestry-merged into `main`, OR
	- Patch-equivalent to `main` (for squash/cherry-pick/rewrite PR completion flows).
3. Preview deletion list:
	- Local branches merged into `main` (excluding current branch and `main`).
	- Remote branches merged into `main`.
	- For each candidate, include reason: `merged` or `patch-equivalent`.
4. On `"Proceed"`, delete listed branches:
	- Local: merged branches only.
	- Remote: merged branches only, with a second `"Proceed"`.
5. Ignore all unmerged branches (treated as work-in-progress by default).

Rules:
- Do not use broad prune-based cleanup as the primary mechanism.
- Exclude protected branches from deletion by default: `main`, `master`, `integration`, `develop`, `release/*` (case-insensitive).
- Exclude branches not created by the user from deletion by default.
- Do not delete protected/non-user branches unless user explicitly names each branch and confirms with `"Proceed"`.
- If ancestry shows not merged but patch-equivalence confirms branch changes are already on `main`, treat as cleanup-eligible.
- If branch contains unique (non-equivalent) patches vs `main`, do not delete.
- If merge status is ambiguous, skip deletion and report.
- Final target state: `main` plus active unmerged branches only.
