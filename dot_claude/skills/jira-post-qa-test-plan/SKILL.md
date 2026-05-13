---
name: jira-post-qa-test-plan
description: >-
  Generate and post a Jira QA Test Plan comment using a strict section format.
  Invoke for actions like "post QA plan", "add test plan comment", or "prepare QA handoff".
user-invocable: true
---

# Skill: Jira Post QA Test Plan

## Purpose
Create and post the required QA Test Plan comment for ticket validation.

---

## Required Inputs

Source data used to generate the QA plan:
- ticket_id
- scope
- preconditions
- test_case_inputs
- regression_risk_level
- regression_risk_justification
- pass_criteria

---

## Integration & Authentication

**Try MCP first:** Use available Jira MCP tools (e.g. `addCommentToJiraIssue`).

**Fallback to REST API** with basic auth. Required env vars: `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`.

Stop and report if any env var is missing.

---

## Required Section Order

1. `QA Test Plan`
2. `Test Objective`
3. `Scope`
4. `Test Data / Preconditions`
5. `Test Cases`
6. `Regression Risk`
7. `Pass Criteria`
8. `Evidence Required`

---

## Rules

- Keep output concise, formal, and execution-ready.
- `Test Cases` must be presented as a markdown table for fast reference.
- `Test Cases` table columns (in order): `ID`, `Scenario`, `Preconditions`, `Steps`, `Expected Result`, `Priority`.
- `Priority` values must be `P1` or `P2`.
- Every test case must include explicit pass/fail expected result wording.
- `Regression Risk` must include level (`Low`/`Medium`/`High`) and one-line justification.
- `Pass Criteria` must be measurable (e.g., "all P1/P2 test cases pass").
- `Evidence Required` must be presented as a markdown table with columns: `Evidence ID`, `Artifact`, `Mapped Test Case IDs`, `Notes`.

Required table header rows:
- Test Cases: `| ID | Scenario | Preconditions | Steps | Expected Result | Priority |`
- Evidence Required: `| Evidence ID | Artifact | Mapped Test Case IDs | Notes |`
- Use deterministic IDs for traceability (`TC-01`, `TC-02`, `EV-01`, etc.).
- Keep language focused: no filler, no implementation deep dive, no speculative statements.

---

## Required Flow

1. Perform the integration and authentication checks defined above. Stop and report if requirements are not met.
2. Generate the QA plan using the required headings in exact order and a formal test-plan tone.
3. Format `Test Cases` and `Evidence Required` as markdown tables with required columns.
4. Validate section completeness, exact section title order, table headers, explicit expected results, measurable pass criteria, and regression risk level + one-line justification.
5. Preview full comment and wait for affirmation before proceeding.
6. Post comment and return metadata.

---

## Output Contract

Return:
- comment_preview
- posted_comment_id
- execution_result

---

## Failure Handling

- If any required section is missing, block posting and return missing fields.
- If table headers are missing/incorrect, block posting and return the required header rows.
- If test cases are missing expected results or use non-`P1`/`P2` priorities, block posting.
- If posting fails, report error and stop.
- If MCP fails during posting, stop, report the cause, and offer to retry using REST API.
