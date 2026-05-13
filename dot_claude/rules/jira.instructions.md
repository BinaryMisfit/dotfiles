## JIRA

## Ticket Workflow Sequencing

### Starting Work
After `branch-start-work` completes for a ticket:
- Invoke `jira-transition-status` → **"In Progress Dev"**

### On PR Creation
After PR is submitted — run in order, complete and verify each step before the next:
1. Invoke `jira-post-fix-update-comment`
2. Invoke `jira-post-qa-test-plan`
3. Invoke `jira-transition-status` → **"In Code Review"**

If this flow starts with PR-creation comments missing, run the missing steps first.

### On PR Completion
When user confirms PR completion (do not poll):
1. Invoke `jira-transition-status` → **"Ready for QA"**
2. Invoke `jira-unassign-ticket`
