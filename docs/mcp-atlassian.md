# mcp-atlassian local MCP installer

This repo stores the chezmoi-managed blueprints for installing `mcp-atlassian` as a per-user local HTTP MCP server using `uvx` and Streamable HTTP at:

```text
http://127.0.0.1:<port>/mcp
```

The installer configures:

- VS Code user/global MCP config
- GitHub Copilot CLI MCP config
- Windows NSSM service named `MCP-Atlassian`
- macOS LaunchAgent named `dev.binarymisfit.mcp.atlassian`

Linux is intentionally out of scope for now.

Chezmoi only manages the installer scripts, this document, and the example environment file. Runtime state is created manually by the installer outside the source repo:

- Windows: `%LOCALAPPDATA%\MCP`
- macOS: `~/.local/share/mcp`

The installer is not run by `chezmoi apply`.

## Why HTTP instead of stdio

VS Code and Copilot CLI both point at the same local endpoint. The MCP server runs once as a local service, binds only to `127.0.0.1`, and avoids duplicating stdio process lifecycle management across clients.

## Windows install

Run PowerShell as Administrator:

```powershell
install-mcp-atlassian.ps1
```

Then edit:

```text
%LOCALAPPDATA%\MCP\atlassian\.env
```

Restart the service:

```powershell
& "$env:LOCALAPPDATA\MCP\atlassian\stop.ps1"
& "$env:LOCALAPPDATA\MCP\atlassian\start.ps1"
```

If VS Code uses a custom user data directory, pass:

```powershell
install-mcp-atlassian.ps1 -McpVSCodeConfigPath "C:\path\to\mcp.json"
```

## macOS install

```sh
install-mcp-atlassian.sh
```

Then edit:

```text
~/.local/share/mcp/atlassian/.env
```

Restart the LaunchAgent:

```sh
~/.local/share/mcp/atlassian/stop.sh
~/.local/share/mcp/atlassian/start.sh
```

If VS Code uses a custom user data directory, pass:

```sh
install-mcp-atlassian.sh --vscode-mcp-config-path "/path/to/mcp.json"
```

## Config paths

Windows:

- Installer: `%USERPROFILE%\.local\bin\install-mcp-atlassian.ps1`
- Env example: `%USERPROFILE%\.config\mcp\mcp-atlassian.env.example`
- Registry: `%LOCALAPPDATA%\MCP\registry.json`
- Server dir: `%LOCALAPPDATA%\MCP\atlassian`
- Logs: `%LOCALAPPDATA%\MCP\atlassian\logs`
- VS Code default: `%APPDATA%\Code\User\mcp.json`
- Copilot CLI default: `%USERPROFILE%\.copilot\mcp-config.json`

macOS:

- Installer: `~/.local/bin/install-mcp-atlassian.sh`
- Env example: `~/.config/mcp/mcp-atlassian.env.example`
- Registry: `~/.local/share/mcp/registry.json`
- Server dir: `~/.local/share/mcp/atlassian`
- Logs: `~/.local/share/mcp/atlassian/logs`
- VS Code default: `~/Library/Application Support/Code/User/mcp.json`
- Copilot CLI default: `~/.copilot/mcp-config.json`
- LaunchAgent: `~/Library/LaunchAgents/dev.binarymisfit.mcp.atlassian.plist`

`COPILOT_HOME` is respected on both platforms.

## Port policy

Ports are deterministic. `mcp-atlassian` prefers `9310`, then scans `9311-9399` if needed. The chosen port is persisted in the registry and the server `port` file.

Registry shape:

```json
{
  "range": {
    "start": 9310,
    "end": 9399
  },
  "servers": {
    "mcp-atlassian": {
      "port": 9310,
      "url": "http://127.0.0.1:9310/mcp",
      "transport": "streamable-http"
    }
  }
}
```

## Status

Windows:

```powershell
& "$env:LOCALAPPDATA\MCP\atlassian\status.ps1"
```

macOS:

```sh
~/.local/share/mcp/atlassian/status.sh
```

The status scripts check service state, configured URL, and whether the local port is listening. MCP health does not require `GET /mcp` to return success.

## Uninstall

Windows:

```powershell
& "$env:LOCALAPPDATA\MCP\atlassian\uninstall.ps1"
```

Remove logs too:

```powershell
& "$env:LOCALAPPDATA\MCP\atlassian\uninstall.ps1" -RemoveLogs
```

macOS:

```sh
~/.local/share/mcp/atlassian/uninstall.sh
```

Remove logs too:

```sh
~/.local/share/mcp/atlassian/uninstall.sh --remove-logs
```

Uninstall removes only the `mcp-atlassian` entries from VS Code, Copilot CLI, and the MCP registry. It renames `.env` to `.env.backup` and leaves unrelated registry entries alone.

## Backups and rollback

Before VS Code or Copilot CLI config files are changed, the installer writes a timestamped backup next to the original file. Backups are skipped if the target file would not change.

On JSON parse errors, the installer does not overwrite the file. Fix the JSON or rerun with a clean config path override.

## Adding future MCP servers

Use the same pattern:

1. Add a server key under `servers` in the registry.
2. Allocate a deterministic port from `9310-9399`.
3. Store only URL, port, and transport in client configs.
4. Keep secrets in the server-specific `.env`.
5. Generate client configs from the registry instead of hand-editing multiple files.
