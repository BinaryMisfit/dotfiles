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
- State that a fix has been implemented and a PR raised.
- Do not include root cause, stack traces, or technical detail.
- Example tone: "A fix has been implemented for this issue and is currently in code review (PR #XXXXX)."

**2. JIRA Comment — Test Plan**
- Brief test plan covering: happy path, regression risk, and specific scenarios to verify.
- Highlight regression risk level (Low / Medium / High) with justification.
- List specific test cases or areas QA should focus on.
- Keep concise — bullet points preferred.

**3. Status Transition**
- Move ticket to **"In Code Review"**.

**Confirmation gate:** Preview all three items above. Requires `"Proceed"` before posting. Post in order: Comment 1 → Comment 2 → Status transition.

---

### On PR Completion
When the user reports PR completion, or explicitly asks the agent to check PR status via ADO:
- Check PR status via ADO MCP only when requested — do not poll autonomously.
- Move ticket status to **"Ready for QA"**. Requires `"Proceed"` before performing.
- Unassign the ticket (remove assignee). Requires a second `"Proceed"` before performing.
- Run Post-PR Cleanup flow per `branches.instructions.md`. Requires its own preview + `"Proceed"` before deletions.
