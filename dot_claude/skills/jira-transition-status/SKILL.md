---
name: jira-transition-status
description: Transition a Jira ticket to a single target status with preview-first and explicit confirmation. Invoke for actions like "move status", "change status", "set ticket to In Code Review", "transition ticket", or "update ticket status".
user-invocable: true
---

# Skill: Jira Transition Status

## Purpose
Execute one Jira status transition safely.

This skill handles exactly one status write per run.

---

## Required Inputs

- ticket_id
- target_status

---

## Integration & Authentication

**Try MCP first:** Use available Jira MCP tools (e.g. `getJiraIssue`, `transitionJiraIssue`).

**Fallback to REST API** with basic auth. Required env vars: `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`.

Stop and report if any env var is missing.

---

## Required Flow

1. Check for available MCP tools. If none, verify all required Jira REST API env vars (`JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`) are present and accessible. Stop and report if any are missing.
2. Resolve and validate `ticket_id`.
3. Read current ticket status.
4. Fetch available transitions for current status.
5. If `target_status` is not in available transitions:
   - Stop.
   - Present valid next statuses as a numbered list.
   - Wait for user to select before continuing.
6. Fetch required fields for the target transition.
7. For each required field not satisfied: stop, present field name and options, generate a suggestion if inferrable, require `Approve` on suggestions, and do not advance until resolved.
8. Once all required fields are satisfied, present a full transition summary:
   - Current status → target status
   - All field values that will be written
9. Execute transition.
10. Verify and report final status.

---

## Guardrails

- Always preview before executing.
- Never batch multiple transitions in one run.
- Treat standard sequential transitions as executable after preview.
- Require `Approve` only when presenting a generated suggestion or warning for user review.

---

## Output Contract

Return:
- transition_preview (including all field values)
- required_confirmation: `Approve` (only when a generated suggestion is presented)
- execution_result
- final_ticket_status
- fields_written (list of field names and values applied)

---

## Failure Handling

- If transition fails, stop immediately and report cause.
- Do not trigger any additional Jira write action automatically.
- If a required field has no resolvable options, present an explicit free-text prompt and wait.
- If MCP fails during execution, stop, report the cause, and offer to retry using REST API for that operation only.
