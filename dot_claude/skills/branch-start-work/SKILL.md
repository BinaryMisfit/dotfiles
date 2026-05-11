---
name: branch-start-work
description: Create a feature, defect, or task branch from a JIRA ticket or local description. Invoke for actions like "start feature branch", "create defect branch", or "begin work on ticket".
user-invocable: true
---

# Skill: Branch Start Work

## Purpose
Create a new branch with the correct naming convention based on ticket type or description.

---

## Required Inputs

- ticket_id (JIRA key, e.g., `UA-1234`) OR description (PascalCase, short; if both provided, ticket_id takes precedence)

Optional:
- branch_type (auto-detected from ticket type; can override as `Feature`, `Defect`, `Other`, or `Release`)
- version (required if `branch_type=Release`)

---

## Integration & Authentication

**Try MCP first:** Use available Git MCP tools or direct CLI.

**Git requirements:** Repo must be initialized, clean (no uncommitted changes), and have origin tracking set.

Stop and report if any requirement is not met.

---

## Branch Naming Rules

**With JIRA ticket:**
- Feature ticket → `Feature/[TICKET]` (e.g., `Feature/UA-1234`)
- Defect ticket → `Defect/[TICKET]` (e.g., `Defect/UATD-5678`)
- Other/Task/Spike ticket → `Other/[TICKET]` (e.g., `Other/UA-9012`)

**Without JIRA (local description):**
- Format: `Other/[PascalCaseShortDesc]` (e.g., `Other/AddLoginButton`)
- Keep description short and clear; no spaces or special chars except hyphens.

---

## Release Branch Rules

- Format: `Release/[version]` (e.g., `Release/26.10`)
- Create locally only; do NOT push without explicit user confirmation (`Approve`).
- Once pushed, treated as protected; all further changes require PR.

---

## Required Flow

1. Validate input (ticket_id OR description provided; if both, use ticket_id).
2. If ticket_id provided: resolve ticket and determine branch type (Feature/Defect/Other). Stop if ticket not found.
3. Construct branch name per Branch Naming Rules.
4. Check that branch name does not already exist. Stop if it does.
5. Create branch locally from current HEAD.
6. Switch to new branch.
7. For Release branches: note that push requires explicit `Approve` confirmation.
8. Return created branch name and current checkout state.

---

## Guardrails

- Never push new branches to remote without explicit user confirmation.
- Branch names: alphanumeric + forward slashes + hyphens only; no spaces or special chars.
- Do not create branches with names that already exist locally or on remote.
- Working directory must be clean before branch creation.

---

## Output Contract

Return:
- branch_name
- branch_type
- created_successfully (true/false)
- current_branch_after_creation
- next_action_note (e.g., "Ready to commit" or "Push requires 'Approve' confirmation")

---

## Failure Handling

- If working directory is dirty, stop and report uncommitted changes.
- If branch name already exists, stop and report name + location (local/remote).
- If JIRA ticket not found, stop and report ticket ID.
- If branch creation fails, stop and report cause.
