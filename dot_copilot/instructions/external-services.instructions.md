## Shared Patterns (External Service Integration)

When interacting with external services (JIRA, Azure DevOps, etc.):
1. **Integration Priority:** Test for MCP integration first; fallback to REST API.
2. **Authentication:** Always check environment variables for authentication details.
3. **Write Operations:** Always preview first. Requires `"Proceed"` confirmation (see Confirmation Gates in `pull-requests.instructions.md`).

---

## Azure DevOps

When requested to interact with Azure DevOps:
- Follow Shared Patterns (above)
- Auth env vars: `ADO_MCP_AUTH_TOKEN` (PR creation, API operations)
- Build feed token: `mixTelematicsDevopsAccessToken` (Maven feed only — not scoped for API)
