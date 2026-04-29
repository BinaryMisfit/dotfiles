---
name: feature-workflow
description: >-
  Start feature development from a ticket. Invoke when the user says things like
  "start feature [ticket]", "work on [ticket]", "implement [ticket]", "kick off [ticket]",
  "begin feature development", or provides a ticket ID (e.g. UA-1234, PROJ-567).
  Runs phases 1–4 of the feature workflow: load ticket, analyse repo, compile gap analysis,
  surface blockers and assumptions.
user-invocable: true
---

# Feature Workflow Skill

You are executing the feature development workflow. Your job is to complete **Phases 1–4** and present a structured briefing. Do not start implementing anything.

---

## Step 0 — Get the ticket

If the user has not provided a ticket ID, ask: *"Which ticket are we working on?"* Then proceed.

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
- Summary, type, status
- Full description — read everything, do not skim
- Acceptance criteria (check for custom fields)
- Labels / components — identify which platform, service, or module is in scope
- All linked issues — fetch clones, "implements", and "is implemented by" links immediately; they often contain the reference implementation

**1.3 Extract the spec**

Produce a structured summary based on project type:

| Project type | What to extract |
|---|---|
| UI / mobile / web | Screens, flows, interactions, navigation, error states, edge cases, design links |
| API / backend | Endpoints, request/response contracts, auth, error codes, side effects |
| Pipeline / CI-CD / infra | Triggers, steps, inputs/outputs, env dependencies, failure modes |
| Cross-cutting | Integration points, contracts with callers, rollback/fallback behaviour |

**Copy error messages and specified values verbatim — do not paraphrase them.**

---

## Phase 2 — Analyse the Repo

**2.1 Search for existing work**

Grep the codebase for feature keywords: feature name, domain terms, error types, screen/endpoint names. Note every file that already exists and what it does.

**2.2 Find the reference implementation**

If a linked ticket references work in another module, branch, or platform — read that implementation fully before anything else. It is the ground truth for model shapes, contracts, flow logic, error handling, and naming conventions.

**2.3 Map the layers**

Use the table that fits this project type. Fill in what exists and what is missing.

**Mobile / frontend**

| Layer | Exists | Missing |
|---|---|---|
| API / OpenAPI spec | | |
| Generated/network models | | |
| Domain models | | |
| Repository interface | | |
| Repository implementation | | |
| Use cases / services | | |
| ViewModel / state | | |
| Screens / components | | |
| Navigation | | |
| Shared resources | | |
| Tests | | |

**Backend / API service**

| Layer | Exists | Missing |
|---|---|---|
| API contract | | |
| Controllers / handlers | | |
| Service / business logic | | |
| Domain models / DTOs | | |
| Data access / repository | | |
| DB schema / migrations | | |
| Auth / middleware | | |
| Config / feature flags | | |
| Tests | | |

**Pipeline / CI-CD / infrastructure**

| Layer | Exists | Missing |
|---|---|---|
| Pipeline definition files | | |
| Triggers / conditions | | |
| Reusable templates | | |
| Env / variable group dependencies | | |
| Secrets / key vault references | | |
| Artifact publishing / consumption | | |
| Notifications / failure handling | | |

---

## Phase 3 — Gap Analysis

Present three sections:

**3.1 What the ticket requires**
Concise structured summary: flows, screens/endpoints, error states, constraints. Quote error messages exactly.

**3.2 What the repo already has**
List existing files and what they provide. Note if a reference implementation is complete and usable as a direct guide.

**3.3 Gap table**
Every missing piece grouped by layer. Name the specific files, methods, and fields that don't exist yet.

---

## Phase 4 — Blockers and Assumptions

**Blockers** — things where the answer changes what gets built. Do not proceed to planning until these are resolved:
- Missing API spec or endpoint not yet available
- Ambiguous or contradictory requirements between ticket and existing code
- Architectural decision required that would break existing callers

**Assumptions** — reasonable defaults exist but intent is unclear:
- Incorrect data in the ticket (wrong URLs, wrong IDs, copy-paste errors)
- UI or behaviour not specified for an edge case
- New component vs. extending an existing one

**Questions** — do not block starting but must be answered before the PR merges.

---

## Deliverable

Present the full briefing to the user:
1. Spec summary (Phase 1)
2. Gap table (Phase 3)
3. Blockers / assumptions / questions (Phase 4)

Then **stop**. Tell the user: *"Answer the blockers above and I'll build the plan."*

Do not start Phase 5 (planning) or any implementation until the user has responded to the blockers.
