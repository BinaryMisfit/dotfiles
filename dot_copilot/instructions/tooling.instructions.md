## Branching Structure

- If JIRA is known and a new feature/addition/change - Feature/[JIRANUMBER]. No descriptions or other additions.
- If JIRA is known and a bug fix or tester reported problem - Defect/[JIRANUMBER]. No descriptions or other additions.
- If JIRA is known and work is investigative, task or a spike - Other/[JIRANUMBER]. No descriptions or other additions.
- If no JIRA then the branch is always Other/[PascalCaseShortDesc]. The description should not be a novel.

## Shared Patterns (External Service Integration)

When interacting with external services (JIRA, Azure DevOps, etc.):
1. **Integration Priority:** Test for MCP integration first; fallback to REST API.
2. **Authentication:** Always check environment variables for authentication details.
3. **Write Operations:** Always preview and confirm before proceeding.

## JIRA

When requested to interact with JIRA:
- Follow Shared Patterns (above)
- Specific details: [Add JIRA-specific guidance if needed]

## Azure DevOps

When requested to interact with Azure DevOps:
- Follow Shared Patterns (above)
- Specific details: [Add Azure DevOps-specific guidance if needed]