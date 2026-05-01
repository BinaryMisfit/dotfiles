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

The installers manage runtime client config files and create timestamped backups before modifying existing files.

## Environment

Create the runtime env file from the example, then edit the key:

```text
~/.config/mcp/mcp-mem0.env
```

Required:

```text
MEM0_API_KEY=m0-your-api-key
```

Secrets stay in `.env` and are not committed.

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

## Client entries

VS Code and Copilot CLI receive HTTP JSON entries using Token auth:

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

Codex receives:

```toml
[mcp_servers.mem0]
url = "https://mcp.mem0.ai/mcp"
enabled = true

[mcp_servers.mem0.headers]
Authorization = "Token ${MEM0_API_KEY}"
```

## Backups and errors

Before changing an existing config, the installer writes:

```text
file.bak.<timestamp>
```

Unrelated config entries are preserved. Invalid JSON fails cleanly without overwriting the target file. Codex TOML patching replaces only the `mcp_servers.mem0` and `mcp_servers.mem0.headers` blocks.

## Test plan

Personal machine:

1. Run the Mem0 installer.
2. Verify VS Code shows Mem0 tools and `search_memories` works.
3. Verify Copilot CLI shows Mem0 tools.
4. Verify Codex shows Mem0 tools and the `Authorization` header works.
