## Skill Integration

### When to Use Built-in Workflows

**Defect Triage:**
When you mention investigating, triaging, or fixing a defect (e.g., "UATD-1234", "bug", "crash", "defect"), invoke the **defect-workflow skill**:
- Automatically runs Phases 1–4 (load ticket, reproduce, root cause, blast radius)
- Saves 10–15 turns of manual investigation
- Structured briefing on fix approach before implementation

**Feature Development:**
When you mention starting, implementing, or kicking off a feature (e.g., "UA-1234", "feature", "implement", "start work on"), invoke the **feature-workflow skill**:
- Automatically runs Phases 1–4 (load ticket, analyze repo, gap analysis, blockers)
- Saves 10–15 turns of manual planning
- Structured briefing on gaps and blockers before implementation

**How to invoke:**
- Say: "Investigate [TICKET_ID]" or "Start feature [TICKET_ID]"
- Or explicitly: "Run defect-workflow for UATD-1234"

---

## JIRA

When requested to interact with JIRA:
- Follow Shared Patterns in `external-services.instructions.md`
- Auth env vars: `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`

---

## JIRA Ticket Workflow

### Starting Work
When beginning work on a ticket (branch created, investigation started, or implementation begun):
- Move ticket status to **"In Progress Dev"** via MCP.

### On PR Creation
After a PR is created, generate the following **previews** (do not post without user confirmation):

**1. JIRA Comment — PR Notification**
- Short, non-technical, human-readable summary.
- Include what user-visible behavior was fixed.
- Do not include root cause, stack traces, internal identifiers, or technical terms.
- Do not include PR links unless the user explicitly asks for them.
- Required format:
	- `Fix Update`
	- `- Issue behavior addressed: <plain-language description>`
	- `- Current state: <code review / ready for QA / etc.>`

**2. JIRA Comment — Test Plan**
- QA-formatted test plan is required.
- Include these headings in order:
	- `QA Test Plan`
	- `Scope`
	- `Test Data / Preconditions`
	- `Test Cases`
	- `Regression Risk`
	- `Pass Criteria`
- `Test Cases` must include numbered scenarios with explicit expected results.
- `Regression Risk` must include level (Low/Medium/High) and one-line justification.

**3. Status Transition**
- Move ticket to **"In Code Review"**.

**Confirmation gate:**
- Comment 1 (PR Notification): preview then requires `"Proceed"` to post.
- Comment 2 (Test Plan): preview then requires a second `"Proceed"` to post.
- Status transition (In Code Review): preview then requires a third `"Proceed"` to perform.
- Execute in order: Comment 1 → Comment 2 → Status transition.

**Execution checklist (mandatory):**
- Complete and verify each step before moving to the next.
- If any step fails or is skipped, stop and report before continuing.
- Before status transition, confirm both comments exist on the ticket.

**Missed-step recovery:**
- If PR completion flow starts and required PR-creation comments are missing, run the missing comment steps first with their own `"Proceed"` gates.

---

### On PR Completion
When the user reports PR completion, or explicitly asks the agent to check PR status via ADO:
- Check PR status via ADO MCP only when requested — do not poll autonomously.
- Move ticket status to **"Ready for QA"**. Requires `"Proceed"` before performing.
- Unassign the ticket (remove assignee). Requires a second `"Proceed"` before performing.
- Run Post-PR Cleanup flow per `branches.instructions.md`. Requires its own preview + `"Proceed"` before deletions.
