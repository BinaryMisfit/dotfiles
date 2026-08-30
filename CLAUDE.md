# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository-Specific Overrides

These override any global Claude Code or git configuration:

- **Commit author email:** always `diagoza@me.com` (local git config is set; do not change it)
- **Branching:** all changes committed directly to `main` — no feature branches, no PRs
- **Push:** push directly to `main`
- **Removal policy:** any change that removes a tool, config file, target path, or setting
  must ship with a scripted cleanup (`run_once_after_remove-*` or equivalent) in the same
  change — never leave cleanup as a manual, ad hoc step. Applies to `bootstrap.*` changes
  too. See [ADR 0004](docs/adr/0004-scripted-cleanup-required-for-every-removal.md).

## Common Commands

```sh
chezmoi diff              # Preview pending changes before applying
chezmoi apply             # Apply managed files to the home directory
chezmoi update            # Pull latest + apply
chezmoi add <file>        # Start tracking a new file
chezmoi edit <file>       # Edit a managed file
chezmoi re-add <file>     # Sync a tracked file after manual edits
chezmoi cd                # Open shell in source directory
```

For encrypted files, age is required. Key lives at `~/.config/age/key.txt`.

After changing the tool list in `run_onchange_install-tools.ps1.tmpl` / `run_onchange_install-tools.sh.tmpl`, chezmoi re-runs the changed script automatically on next apply (winget / Homebrew / apt, depending on OS).

## Architecture

This is a chezmoi-managed dotfiles repo. Chezmoi file prefixes:
- `dot_*` → `~/.` (plain dotfiles)
- `private_dot_*` → restrictive file permissions (0600/0700) — **not** encryption; see [Encrypted Files](#encrypted-files)
- `run_once_*` → execute once on first apply
- `run_onchange_*` → execute when file content changes
- `.chezmoitemplates/` → reusable partials included by `.tmpl` files

### Template Data

Template variables come from the local `~/.config/chezmoi/chezmoi.yaml` (not in this repo). Common variables:

| Variable | Purpose |
|---|---|
| `.chezmoi.os` | `windows`, `darwin`, `linux` |
| `.chezmoi.username` | Current user |
| `.profile` | `work` or `home` — gates VS Code extensions, copilot instructions and skills |
| `.vscode.layout` | `large` or `small` |
| `.git.name` / `.git.email` | Git identity |

### Cross-Platform Gating

`.chezmoiignore` is a template that excludes files by OS and machine context. When adding platform-specific files, gate them there — don't create duplicate files.

### VS Code Extensions

Extension list lives in `.chezmoitemplates/vscode/extensions.txt.tmpl` and is profile-aware (top-level `.profile`, the same `work`/`home` value everything else in this repo uses — not a separate `.vscode.profile` key). The `run_onchange_install-vscode-extensions` script diffs against `.vscode/extensions.managed.txt` to install/uninstall on apply. `settings.json.tmpl`'s AI/Copilot gating reads the same `.profile` value (fixed 2026-08-30 — it previously read a dead `.vscode.profile` key that nothing ever set, so Copilot was silently force-disabled on every profile including work; see ADR 0010).

### Encrypted Files

**No file in this repo is currently age-encrypted.** `private_dot_*` (e.g. `private_dot_ssh/`,
`private_dot_config/`) only marks restrictive permissions in chezmoi — it does not imply
encryption. An actually-encrypted source file gets an `encrypted_` prefix component instead,
and none exist here yet. To add a new encrypted file:
```sh
chezmoi add --encrypt <path>
```

To add a new age recipient (new machine):
```sh
# On new machine: get the recipient from ~/.config/age/key.txt
# On trusted machine: add recipient to .chezmoi.yaml.tmpl and re-encrypt
chezmoi encrypt --recipients-file <file>
```

### Run Scripts

Scripts ending in `.ps1.tmpl` run on Windows; `.sh.tmpl` run on POSIX. They are paired — if you modify behavior, update both. All run scripts are idempotent.

### Claude Code Config

Managed under `dot_claude/` → `~/.claude/`. Profile-gated via `.chezmoiignore`:
- `CLAUDE.md.tmpl` — global instructions; `@rules` includes work-only rules on work profile
- `mcp.json.tmpl` — work profile gets amaza-core MCP server; home gets empty `mcpServers`
- `settings.json.tmpl` — Claude Code permissions and model settings
- `output-styles/k1ra.md` — K1ra output style definition
- `rules/` — instruction files `@`-included from `CLAUDE.md.tmpl`; work-only files gated in `.chezmoiignore`
- `skills/` — slash-command skill definitions; work-only skills gated in `.chezmoiignore`

## Decision Records

Non-obvious decisions live under [docs/adr/](docs/adr/) — one file per decision, indexed in
`docs/adr/README.md`. This follows the global ADR convention (see
`dot_claude/rules/registers.instructions.md`, deployed to `~/.claude/rules/`).

## Key Files

| File | Target | Notes |
|---|---|---|
| `dot_gitconfig.tmpl` | `~/.gitconfig` | Credential helper is OS-specific |
| `dot_zshrc.tmpl` | `~/.zshrc` | Znap plugin manager, fzf, atuin, zoxide |
| `dot_zshenv` | `~/.zshenv` | Minimal env — sourced even for non-interactive shells |
| `dot_tmux.conf.tmpl` | `~/.tmux.conf` | Prefix is `Ctrl+\`, vi mode |
| `dot_p10k.zsh` | `~/.p10k.zsh` | Powerlevel10k theme config |
| `dot_wezterm.lua` | `~/.wezterm.lua` | WezTerm terminal config |
| `dot_codex/config.toml.tmpl` | `~/.codex/config.toml` | Codex telemetry config |
| `dot_claude/CLAUDE.md.tmpl` | `~/.claude/CLAUDE.md` | Claude Code global instructions (profile-gated) |
| `dot_claude/settings.json.tmpl` | `~/.claude/settings.json` | Claude Code permissions |
| `dot_claude/mcp.json.tmpl` | `~/.claude/mcp.json` | MCP server config (work profile only) |
| `run_onchange_install-tools.ps1.tmpl` | n/a (script) | Dev tool list via winget (Windows) |
| `run_onchange_install-tools.sh.tmpl` | n/a (script) | Dev tool list via Homebrew/apt (macOS/Linux) |
| `.chezmoitemplates/vscode/settings.json.tmpl` | VS Code settings | Rendered per profile |
| `.chezmoitemplates/vscode/extensions.txt.tmpl` | VS Code extension list | Profile-gated |
