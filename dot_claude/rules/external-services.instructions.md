## External Service Integration

MCP first; fallback to REST API. Always check environment variables for auth.

---

## Azure DevOps

**Auth order: REST API first; MCP fallback only.**

Auth env vars: `ADO_MCP_AUTH_TOKEN` (PR creation, API operations)
Build feed token: `mixTelematicsDevopsAccessToken` (Maven feed only — not scoped for API)
