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

## Integration

**Try MCP first:** Use available Git MCP tools or direct CLI.

**Git requirements:** Repo must be initialized, clean (no uncommitted changes), and have origin tracking set.

Stop and report if any requirement is not met.

---

## Branch Naming Rules

**With JIRA ticket:**
- Feature ticket → `Feature/[TICKET]` (e.g., `Feature/UA-1234`)
- Defect ticket → `Defect/[TICKET]` (e.g., `Defect/UATD-5678`)
- Other/Task/Spike → `Other/[TICKET]` (e.g., `Other/UA-9012`)
- Release → `Release/[version]` (e.g., `Release/26.10`) — requires `version` input

**Without JIRA (local description):**
- Format: `Other/[PascalCaseShortDesc]` (e.g., `Other/AddLoginButton`)
- Keep description short and clear; no spaces or special chars except hyphens.

---

## Required Flow

1. Validate input (ticket_id OR description provided; if both, use ticket_id).
2. If ticket_id provided: resolve ticket and determine branch type. Stop if ticket not found.
3. Construct branch name per Branch Naming Rules.
4. Check that branch name does not already exist locally or on remote. Stop if it does.
5. Create branch locally from current HEAD.
6. Switch to new branch.
7. Return created branch name and current checkout state.

---

## Output Contract

Return:
- branch_name
- branch_type
- created_successfully (true/false)
- current_branch_after_creation
- next_action_note

---

## Failure Handling

- If working directory is dirty, stop and report uncommitted changes.
- If branch name already exists, stop and report name + location (local/remote).
- If JIRA ticket not found, stop and report ticket ID.
- If branch creation fails, stop and report cause.
