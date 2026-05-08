# Claude Code Context

## Pending: VSCode Extension Profile Separation

Split `dot_vscode/extensions.txt` into profile-aware home/work sets using chezmoitemplates — the same pattern already used for `settings.json`.

### Implementation Steps

1. **Create** `.chezmoitemplates/vscode/extensions.txt.tmpl` — master template with three sections (common, home-only, work-only). Use `$profile := get $vscode "profile" | default "home"` (same pattern as settings.json.tmpl).

2. **Replace** `dot_vscode/extensions.txt` with `dot_vscode/extensions.txt.tmpl` containing just:
   `{{ template "vscode/extensions.txt.tmpl" . -}}`

3. **Update hash comments** in both install scripts so the hash reflects rendered (profile-filtered) output, ensuring `run_onchange_` fires correctly on profile switches:
   - `run_onchange_install-vscode-extensions.sh.tmpl` (line 4)
   - `run_onchange_install-vscode-extensions.ps1.tmpl` (line 11)
   - Change `include "dot_vscode/extensions.txt"` → `template "vscode/extensions.txt.tmpl" .`

### Proposed Extension Split

**Common (10):**
- Anthropic.claude-code
- akamud.vscode-theme-onedark
- avidAnson.vscode-markdownlint
- github.vscode-github-actions
- ms-vscode-remote.remote-ssh
- ms-vscode-remote.remote-ssh-edit
- ms-vscode.remote-explorer
- pkief.material-icon-theme
- romantomjak.go-template
- vscodevim.vim

**Home-only:**
- openai.chatgpt

**Work-only:** TBD — confirm Powerfleet stack tooling before implementing.
