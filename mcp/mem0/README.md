# Mem0 hosted MCP installer

This repo stores the chezmoi-managed installer blueprints for hosted Mem0 MCP over HTTPS:

```text
https://mcp.mem0.ai/mcp
```

Chezmoi manages only:

- `~/.local/bin/install-mcp-mem0.sh`
- `~/.local/bin/install-mcp-mem0.ps1`
- `~/.config/mcp/mcp-mem0.env.example`
- this document

Generated client config stays out of chezmoi. The installers patch runtime config files in place, preserve unrelated entries, create missing files, and write timestamped backups before modifying existing files.

## Auth paths

Mem0 supports two auth paths for hosted MCP.

### A. Browser login

No API key is required for initial config. If `~/.config/mcp/mcp-mem0.env` is missing or does not contain a key, the installers generate URL-only client entries so browser auth can happen on first MCP use.

Codex URL-only config:

```toml
[mcp_servers.mem0]
url = "https://mcp.mem0.ai/mcp"
enabled = true
```

### B. API key fallback

Create the runtime env file from the example when API key auth is needed:

```text
~/.config/mcp/mcp-mem0.env
```

Optional values:

```text
MEM0_API_KEY=m0-your-api-key
MEM0_AUTH_HEADER=Token m0-your-api-key
```

VS Code and Copilot CLI receive token-header JSON when `MEM0_API_KEY` is present:

```json
{
  "mem0": {
    "type": "http",
    "url": "https://mcp.mem0.ai/mcp",
    "headers": {
      "Authorization": "Token ${MEM0_API_KEY}"
    }
  }
}
```

Codex CLI 0.125.0 supports env-backed HTTP headers through `env_http_headers`. When auth is available, the installer generates:

```toml
[mcp_servers.mem0]
url = "https://mcp.mem0.ai/mcp"
enabled = true
env_http_headers = { Authorization = "MEM0_AUTH_HEADER" }
```

Use a full header value for Codex:

```text
MEM0_AUTH_HEADER=Token m0-your-api-key
```

Do not commit real secrets.

## Install

macOS:

```sh
install-mcp-mem0.sh
```

Windows:

```powershell
install-mcp-mem0.ps1
```

The installers patch:

- VS Code MCP config
- GitHub Copilot CLI MCP config
- Codex `~/.codex/config.toml`

## Backups and errors

Before changing an existing config, the installer writes:

```text
file.bak.<timestamp>
```

Invalid JSON fails cleanly without overwriting the target file. Codex TOML patching replaces only the generated Mem0 blocks and leaves unrelated config intact.

Do not use `zsh -x` after sourcing secret env files; shell tracing can print `MEM0_API_KEY` or `MEM0_AUTH_HEADER`.

Repeated auth and connector testing can hit Mem0 daily API key/auth limits. Treat a daily limit response after repeated testing as a Mem0 quota state, not a local config failure.

## Tested status

- VS Code: working
- Codex: working
- Copilot CLI: connected, but retest after the Mem0 daily limit resets

## Test plan

Personal machine:

1. Run the Mem0 installer.
2. Verify VS Code shows Mem0 tools and `search_memories` works.
3. Verify Codex shows Mem0 tools.
4. Verify Copilot CLI shows Mem0 tools after the Mem0 daily limit resets.
