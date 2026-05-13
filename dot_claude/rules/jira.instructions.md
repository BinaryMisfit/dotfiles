## JIRA

## Ticket Workflow Sequencing

### Starting Work
After `branch-start-work` completes for a ticket:
- Invoke `jira-transition-status` → **"In Progress Dev"**

### On PR Creation
After PR is submitted — run in order, complete and verify each step before the next:
1. Invoke `jira-post-fix-update-comment`
2. Infer QA requirement from changed files: if any regression or test files were added or modified, ask the operator "QA required? (yes/no)" and wait for response. If no test files changed, skip step 3.
3. If QA confirmed: invoke `jira-post-qa-test-plan`
4. Invoke `jira-transition-status` → **"In Code Review"**

If this flow starts with PR-creation comments missing, run the missing steps first.

### On PR Completion
When user confirms PR completion (do not poll):
1. Check the ticket for a QA test plan comment. If one exists: invoke `jira-transition-status` → **"Ready for QA"**. If none exists: invoke `jira-transition-status` → **"Done"**.
2. Invoke `jira-unassign-ticket`
