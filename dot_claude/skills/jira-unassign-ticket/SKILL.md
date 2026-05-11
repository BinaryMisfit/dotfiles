---
name: jira-unassign-ticket
description: Remove the assignee from a Jira ticket with preview-first confirmation. Invoke for actions like "unassign ticket", "remove assignee", or "clear ticket owner".
user-invocable: true
---

# Skill: Jira Unassign Ticket

## Purpose
Unassign a single Jira ticket as a standalone action.

---

## Required Inputs

- ticket_id

Optional:
- expected_current_assignee

---

## Integration & Authentication

**Try MCP first:** Use available Jira MCP tools (e.g. `getJiraIssue`, `editJiraIssue`).

**Fallback to REST API** with basic auth. Required env vars: `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`.

Stop and report if any env var is missing.

---

## Required Flow

1. Perform the integration and authentication checks defined above. Stop and report if requirements are not met.
2. Resolve ticket and read current assignee.
3. If `expected_current_assignee` is provided, verify it matches. Stop and report mismatch if it does not.
4. Preview assignee change.
5. Require `Approve` to proceed.
6. Remove assignee.
7. Verify and report final assignee state.

---

## Guardrails

- Always preview before write.
- This skill performs only one write action.

---

## Output Contract

Return:
- unassign_preview
- required_confirmation: `Approve`
- previous_assignee
- execution_result

---

## Failure Handling

- If ticket is already unassigned, return no-op result.
- If expected assignee does not match, stop and report mismatch.
- If unassign write fails, stop and report cause.
- If MCP fails during the write, stop, report the cause, and offer to retry using REST API.
