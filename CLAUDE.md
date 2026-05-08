# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository-Specific Overrides

These override any global Claude Code or git configuration:

- **Commit author email:** always `diagoza@me.com` (local git config is set; do not change it)
- **Branching:** all changes committed directly to `main` — no feature branches, no PRs
- **Push:** push directly to `main`

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

After changing `private_dot_config/mise/config.toml.tmpl`, chezmoi triggers the mise onchange script automatically on next apply:
```sh
mise install && mise reshim
```

## Architecture

This is a chezmoi-managed dotfiles repo. Chezmoi file prefixes:
- `dot_*` → `~/.` (plain dotfiles)
- `private_dot_*` → encrypted with age
- `run_once_*` → execute once on first apply
- `run_onchange_*` → execute when file content changes
- `.chezmoitemplates/` → reusable partials included by `.tmpl` files

### Template Data

Template variables come from the local `~/.config/chezmoi/chezmoi.yaml` (not in this repo). Common variables:

| Variable | Purpose |
|---|---|
| `.chezmoi.os` | `windows`, `darwin`, `linux` |
| `.chezmoi.username` | Current user |
| `.vscode.profile` | `work` or `home` — gates extensions |
| `.vscode.layout` | `large` or `small` |
| `.node.version` | Defaults to `"lts"` |
| `.git.name` / `.git.email` | Git identity |

### Cross-Platform Gating

`.chezmoiignore` is a template that excludes files by OS and machine context. When adding platform-specific files, gate them there — don't create duplicate files.

### VS Code Extensions

Extension list lives in `.chezmoitemplates/vscode/extensions.txt.tmpl` and is profile-aware (`.vscode.profile`). The `run_onchange_install-vscode-extensions` script diffs against `.vscode/extensions.managed.txt` to install/uninstall on apply.

### Encrypted Files

Files under `private_dot_*` are age-encrypted. To add a new encrypted file:
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

## Key Files

| File | Target | Notes |
|---|---|---|
| `dot_gitconfig.tmpl` | `~/.gitconfig` | Credential helper is OS-specific |
| `dot_zshrc.tmpl` | `~/.zshrc` | Znap plugin manager, mise, fzf, atuin, zoxide |
| `dot_zshenv` | `~/.zshenv` | Minimal env — sourced even for non-interactive shells |
| `dot_tmux.conf` | `~/.tmux.conf` | Prefix is `Ctrl+\`, vi mode |
| `private_dot_config/mise/config.toml.tmpl` | `~/.config/mise/config.toml` | All tool versions |
| `.chezmoitemplates/vscode/settings.json.tmpl` | VS Code settings | Rendered per profile |
| `.chezmoitemplates/vscode/extensions.txt.tmpl` | VS Code extension list | Profile-gated |
