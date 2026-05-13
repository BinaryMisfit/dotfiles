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

You are executing the defect triage workflow. Your job is to complete **Phases 1–4** and present a structured briefing.

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

**Copy error messages, stack traces, and specified values verbatim — do not paraphrase them.**

---

## Phase 2 — Reproduce in Code

**2.1 Locate the crash or failure site**

Grep the codebase for the component name, error type, model fields, and API endpoints mentioned in the ticket. Map the call chain from the entry point through to the failure site.

**2.2 Read the reference platform (if applicable)**

If the ticket notes that another platform (iOS, web) handles this correctly — read that implementation fully. It is the ground truth for how null/missing data should be handled.

**2.3 Map the affected layers**

Use the format matching the project type. Mark each layer Affected, Clean, or Unknown.

**Mobile:** Generated models · Domain models · Repository · Use cases · ViewModel · Screens · Navigation
**Backend:** API contract · Controllers · Service · Domain/DTOs · Data access · Auth · Middleware
**Pipeline:** Definition · Triggers · Env/variables · Artifact publishing · Failure handling

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

## Phase 3.5 — Confidence Assessment

After root cause analysis, assess your confidence level in the identified cause:

**High Confidence (90–100%)**
- You found the exact line of code that's broken (typo, logic error, null dereference)
- The root cause is obvious and deterministic
- No ambiguity in reproduction steps
- **Recommendation:** Fix the code. Test after the fix to confirm it resolves the issue.

**Medium Confidence (60–89%)**
- Root cause is plausible but not 100% certain
- The logic *looks* wrong based on code review, but replication criteria don't perfectly match
- Multiple possible causes exist
- **Recommendation:** Reproduce and test first to narrow down root cause before fixing.

**Low Confidence (<60%)**
- Multiple theories; unclear which is correct
- Runtime signals (logs, memory, timing, race conditions) suggest a deeper issue
- Code review inconclusive
- **Recommendation:** Gather runtime logs, reproduce, then revisit root cause analysis.

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
- *If confidence is <100%: suggest reproduction test before fix to avoid false positives.*

**Questions** — do not block starting but must be answered before the PR merges.

---

## Deliverable

Present the full briefing to the user:
1. Defect profile (Phase 1)
2. Root cause + fix table + confidence assessment (Phase 3 + 3.5)
3. Blast radius / regression risk / approach (Phase 4)

State the confidence level and recommended next step per Phase 3.5. Then stop and wait for the user to confirm the fix approach before beginning implementation planning.
