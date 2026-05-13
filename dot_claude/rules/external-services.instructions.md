## External Service Integration

MCP first; fallback to REST API. Always check environment variables for auth.

---

## Azure DevOps

**Exception — REST API first; MCP fallback only.**

Auth env var: `ADO_MCP_AUTH_TOKEN` (PR creation, API operations)
