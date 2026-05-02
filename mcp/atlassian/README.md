# mcp-atlassian local MCP installer

This repo stores the chezmoi-managed blueprints for installing `mcp-atlassian` as a work-machine-only, JIRA-only, per-user local HTTP MCP server using `uvx` and Streamable HTTP at:

```text
http://127.0.0.1:<port>/mcp
```

The installer configures:

- VS Code user/global MCP config
- GitHub Copilot CLI MCP config
- Codex MCP config
- Windows NSSM service named `MCP-Atlassian`
- macOS LaunchAgent named `dev.binarymisfit.mcp.atlassian`

Linux is intentionally out of scope for now.

Chezmoi only manages the installer scripts, this document, and the example environment file. Runtime state is created manually by the installer outside the source repo:

- Windows: `%LOCALAPPDATA%\MCP`
- macOS: `~/.local/share/mcp`

The installer is not run by `chezmoi apply`.

The installer does not auto-install dependencies. Install `uvx` and, on Windows, `nssm` before running it.

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
- Logs: `%LOCALAPPDATA%\MCP\atlassian\logs\mcp-atlassian.log`
- VS Code MCP config detection:
  1. `-McpVSCodeConfigPath`, when passed
  2. Scoop VS Code, when both `%USERPROFILE%\scoop\persist\vscode\data\user-data\User` and `%USERPROFILE%\scoop\apps\vscode\current\Code.exe` exist: `%USERPROFILE%\scoop\persist\vscode\data\user-data\User\mcp.json`
  3. Default VS Code: `%APPDATA%\Code\User\mcp.json`
- Copilot CLI default: `%USERPROFILE%\.copilot\mcp-config.json`
- Codex default: `%USERPROFILE%\.codex\config.toml`

macOS:

- Installer: `~/.local/bin/install-mcp-atlassian.sh`
- Env example: `~/.config/mcp/mcp-atlassian.env.example`
- Registry: `~/.local/share/mcp/registry.json`
- Server dir: `~/.local/share/mcp/atlassian`
- Logs: `~/.local/share/mcp/atlassian/logs`
- VS Code default: `~/Library/Application Support/Code/User/mcp.json`
- Copilot CLI default: `~/.copilot/mcp-config.json`
- Codex default: `~/.codex/config.toml`
- LaunchAgent: `~/Library/LaunchAgents/dev.binarymisfit.mcp.atlassian.plist`

`COPILOT_HOME` and `CODEX_HOME` are respected on both platforms.

## Environment

The generated runtime env file is copied from `~/.config/mcp/mcp-atlassian.env.example` on first install.

Required JIRA-only values:

```text
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=you@example.com
JIRA_API_TOKEN=your_api_token

TOOLSETS=jira_issues,jira_fields,jira_comments,jira_transitions
READ_ONLY_MODE=false

# Confluence disabled for now
```

Confluence variables are intentionally not required.

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

On Windows, NSSM writes both stdout and stderr to `mcp-atlassian.log` with rotation enabled. `mcp-atlassian` emits normal server logs on stderr, so stderr output is not automatically an error.

## Uninstall

Windows:

```powershell
uninstall-mcp-atlassian.ps1
```

Remove logs too:

```powershell
uninstall-mcp-atlassian.ps1 -RemoveLogs
```

Remove the `atlassian` runtime directory too:

```powershell
uninstall-mcp-atlassian.ps1 -RemoveRuntime
```

If VS Code uses a custom user data directory, pass:

```powershell
uninstall-mcp-atlassian.ps1 -McpVSCodeConfigPath "C:\path\to\mcp.json"
```

macOS:

```sh
uninstall-mcp-atlassian.sh
```

Remove logs too:

```sh
uninstall-mcp-atlassian.sh --remove-logs
```

Remove the `atlassian` runtime directory too:

```sh
uninstall-mcp-atlassian.sh --remove-runtime
```

If VS Code uses a custom user data directory, pass:

```sh
uninstall-mcp-atlassian.sh --vscode-mcp-config-path "/path/to/mcp.json"
```

Uninstall removes only the `mcp-atlassian` entries from VS Code, Copilot CLI, and the MCP registry. It preserves unrelated entries, renames `.env` to `.env.backup` by default, and leaves logs and the runtime directory unless the cleanup flags are passed.

## Backups and rollback

Before VS Code, Copilot CLI, Codex, registry, or other generated config files are changed, the scripts write a timestamped backup next to the original file only when the target already exists and the new content differs. The newest five backups are retained per file; older backups are pruned after a successful write. Backup cleanup warnings do not fail install or uninstall.

Logs and generated runtime start, stop, and status scripts are not backed up. `.env` is separate: install never overwrites an existing `.env`; uninstall renames it to `.env.backup`, or `.env.backup.YYYYMMDDHHMMSS` if that already exists.

On JSON parse errors, the installer does not overwrite the file. Fix the JSON or rerun with a clean config path override.

Codex receives:

```toml
[mcp_servers.atlassian]
url = "http://127.0.0.1:<port>/mcp"
enabled = true
tool_timeout_sec = 120
```

## Test plan

Do not test this on a personal machine.

Work machine only:

1. Run the `mcp-atlassian` installer.
2. Verify only JIRA tools are exposed; Confluence should not appear.
3. Verify JIRA create, update, and comment operations.
4. Verify Codex connects over HTTP at `http://127.0.0.1:<port>/mcp`.

## Adding future MCP servers

Use the same pattern:

1. Add a server key under `servers` in the registry.
2. Allocate a deterministic port from `9310-9399`.
3. Store only URL, port, and transport in client configs.
4. Keep secrets in the server-specific `.env`.
5. Generate client configs from the registry instead of hand-editing multiple files.
