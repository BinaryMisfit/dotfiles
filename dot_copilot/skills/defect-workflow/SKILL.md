---
name: defect-workflow
description: >-
  Analyse a bug or defect ticket. Invoke when the user says things like
  "investigate [ticket]", "triage [ticket]", "fix [ticket]", "look into [ticket]",
  "defect [ticket]", or provides a defect/bug ticket ID (e.g. UATD-1234, BUG-567).
  Runs phases 1–4 of the defect workflow: load ticket, reproduce in code, root cause analysis,
  surface blast radius and fix approach.
user-invocable: true
---

# Defect Workflow Skill

You are executing the defect triage workflow. Your job is to complete **Phases 1–4** and present a structured briefing. Do not start fixing anything.

---

## Step 0 — Get the ticket

If the user has not provided a ticket ID, ask: *"Which defect are we triaging?"* Then proceed.

---

## Phase 1 — Load the Ticket

**1.1 Identify the tracker**

Check environment variables for credentials:
- JIRA: `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`
- Azure DevOps: `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_TOKEN`
- GitHub Issues: `GITHUB_TOKEN`

Use MCP integrations first; fall back to REST API.

**1.2 Fetch the primary ticket**

Pull the full ticket including rendered description. Extract:
- Summary, type, status, priority, severity
- Full description — read everything, do not skim
- **Reproduction steps** — copy verbatim, do not paraphrase
- **Observed vs expected behaviour** — quote exactly
- Environment details: app version, OS, device, account/org
- Attachments or linked recordings — note their existence
- All linked issues — fetch duplicates, regressions, and "caused by" links immediately

**1.3 Extract the defect profile**

| Field | Value |
|---|---|
| Observed behaviour | |
| Expected behaviour | |
| Reproduction steps | |
| Affected version(s) | |
| Affected platform(s) | |
| User/org scope (all users or specific?) | |
| iOS / other platform parity (does it crash there?) | |

**Copy error messages, stack traces, and specified values verbatim — do not paraphrase them.**

---

## Phase 2 — Reproduce in Code

**2.1 Locate the crash or failure site**

Grep the codebase for the screen name, error type, model fields, and API endpoints mentioned in the ticket. Map the call chain from UI tap → ViewModel → UseCase → Repository → API.

**2.2 Read the reference platform (if applicable)**

If the ticket notes that another platform (iOS, web) handles this correctly — read that implementation fully. It is the ground truth for how null/missing data should be handled.

**2.3 Map the affected layers**

Use the table that fits the project type. Mark each layer as Affected, Clean, or Unknown.

**Mobile / frontend**

| Layer | Status | Notes |
|---|---|---|
| Generated/network models | | |
| Domain models | | |
| Repository | | |
| Use cases / services | | |
| ViewModel / state | | |
| Screens / components | | |
| Navigation | | |

**Backend / API service**

| Layer | Status | Notes |
|---|---|---|
| API contract / spec | | |
| Controllers / handlers | | |
| Service / business logic | | |
| Domain models / DTOs | | |
| Data access / repository | | |
| Auth / middleware | | |

**Pipeline / CI-CD / infrastructure**

| Layer | Status | Notes |
|---|---|---|
| Pipeline definition | | |
| Triggers / conditions | | |
| Env / variable groups | | |
| Artifact publishing | | |
| Failure handling | | |

---

## Phase 3 — Root Cause Analysis

Present three sections:

**3.1 Root cause**
One precise statement of what is broken and why. Include the specific file, method, field, or condition responsible. Quote the failing code if possible.

**3.2 Why it is user/data-specific**
Explain what makes this user's data or environment trigger the bug when others are not affected. Name the specific condition (e.g. null field, missing config, race condition).

**3.3 Fix table**
Every change needed to resolve the defect, grouped by layer. Name the specific files, methods, and fields. Mark each as **Required** (fix is broken without it) or **Defensive** (prevents related future crashes).

| Layer | File | Change needed | Type |
|---|---|---|---|
| | | | Required / Defensive |

---

## Phase 4 — Blast Radius and Approach

**Blast radius** — who else could be affected right now or after the fix:
- Other users/orgs that may hit the same crash silently
- Other screens or flows that share the broken component
- Callers of the affected model/use case that may need the same defensive fix

**Regression risk** — what the fix could break:
- Existing callers that assume non-null values
- Tests that will need updating
- API contract changes required upstream (note as a separate ticket, do not block this fix)

**Fix approach** — recommend the safest, narrowest fix:
- Prefer defensive nullability over structural refactoring
- Note if a backend fix is also needed (separate ticket)
- Note if the fix should be backported to a release branch

**Questions** — do not block starting but must be answered before the PR merges.

---

## Deliverable

Present the full briefing to the user:
1. Defect profile (Phase 1)
2. Root cause + fix table (Phase 3)
3. Blast radius / regression risk / approach (Phase 4)

Then **stop**. Tell the user: *"Confirm the fix approach above and I'll build the plan."*

Do not start Phase 5 (planning) or any implementation until the user has confirmed.
