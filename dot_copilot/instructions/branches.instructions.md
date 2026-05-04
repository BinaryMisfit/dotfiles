## Branching Structure

- If JIRA is known and a new feature/addition/change - Feature/[JIRANUMBER]. No descriptions or other additions.
- If JIRA is known and a bug fix or tester reported problem - Defect/[JIRANUMBER]. No descriptions or other additions.
- If JIRA is known and work is investigative, task or a spike - Other/[JIRANUMBER]. No descriptions or other additions.
- If no JIRA then the branch is always Other/[PascalCaseShortDesc]. The description should not be a novel.

---

## Push & Protected Branches

**Policy:** User request only. Never autonomous.

**Protected branches (main, master, production, staging, protected/*, release/*):**
- ALL changes require PR from a new branch (never direct commits)
- PR must be approved before merge
- Require explicit "Proceed" confirmation

**Pre-flight:** CI/CD passes, conflicts resolved locally, target confirmed.
