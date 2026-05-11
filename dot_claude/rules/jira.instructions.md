## Skill Routing

| Trigger | Skill |
|---|---|
| Investigating, triaging, or fixing a defect | `defect-workflow` |
| Starting, implementing, or kicking off a feature | `feature-workflow` |
| Creating a branch | `branch-start-work` |
| Checking commit readiness / committing | `commit-ready-check` |
| Preparing or submitting a PR | `pr-prep-and-submit` |
| Posting fix update comment | `jira-post-fix-update-comment` |
| Posting QA test plan comment | `jira-post-qa-test-plan` |
| Transitioning ticket status | `jira-transition-status` |
| Unassigning a ticket | `jira-unassign-ticket` |
| Cleaning up branches after PR | `post-pr-cleanup` |

---

## JIRA

Auth env vars: `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`

---

## Ticket Workflow Sequencing

### Starting Work
When beginning work on a ticket (branch created, investigation started, or implementation begun):
- Invoke `jira-transition-status` → **"In Progress Dev"**

### On PR Creation
Run in order — complete and verify each step before moving to the next:
1. Invoke `jira-post-fix-update-comment`
2. Invoke `jira-post-qa-test-plan`
3. Invoke `jira-transition-status` → **"In Code Review"**

Stop and report if any step fails. If this flow starts and PR-creation comments are missing, run the missing steps first.

### On PR Completion
When PR completion is confirmed (check via ADO MCP only when requested — do not poll autonomously):
1. Invoke `jira-transition-status` → **"Ready for QA"**
2. Invoke `jira-unassign-ticket`
3. Invoke `post-pr-cleanup`
