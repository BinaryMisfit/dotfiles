# Inventory Register

**Why this register exists:** none of todo (open work), idea (maturing concepts), or ADR
(settled decisions) fit a static catalog of what the repo currently contains and what each
part does. This is that catalog — reference, not action items. Update it when the repo's
composition changes structurally (a subsystem added/removed), not on every commit.

Listed in [`docs/tracking-index.md`](tracking-index.md).

## Bootstrap & one-time setup

| Path | Deploys to / runs where | Purpose |
|---|---|---|
| `.chezmoi.yaml.tmpl` | processed once by `chezmoi init` | Prompts once for `profile` (default home) and git `name`/`email` (defaulted per profile), generates the age encryption block from `CHEZMOI_AGE_RECIPIENT` — see [ADR 0008](adr/0008-interactive-bootstrap-and-finish-codex-removal.md) |
| `bootstrap.sh` / `bootstrap.ps1` | run manually, once, pre-chezmoi | Installs `git`/`curl`, `chezmoi`, `age`, local age/SSH prerequisites, then hands off to `chezmoi init` for profile/git prompts |
| `run_once_setup-github-ssh.{ps1,sh}.tmpl` | `~/.ssh/id_ed25519_github` | Generates a GitHub-specific ed25519 key if absent; POSIX side also does `ssh-add`/agent setup |
| `run_once_create_nvim_junction.ps1.tmpl` | Windows only | Junctions `%LOCALAPPDATA%\nvim` → `~/.config/nvim` (Neovim looks for config in the Windows-native path) |
| `run_once_install-iterm2-shell-integration.sh.tmpl` | macOS/Linux | Downloads iTerm2 shell integration if not already present |
| `run_once_after_remove-mise.sh.tmpl` | POSIX | One-time cleanup: removes an old `mise` install and its `.bashrc` activation line |
| `run_once_after_remove-scoop-mise.ps1.tmpl` | Windows | One-time cleanup: uninstalls scoop and everything scoop had installed (git, chezmoi, age, mise, openssh, gpg, psmux), then removes leftover mise data |
| `run_once_after_remove-codex.sh.tmpl` / `.ps1.tmpl` | POSIX / Windows respectively, self-gated | One-time cleanup: `npm uninstall -g @openai/codex` on machines that already have it — the install line was dropped, see [ADR 0008](adr/0008-interactive-bootstrap-and-finish-codex-removal.md). Windows counterpart added after the bare `.sh` crashed `chezmoi apply` there — see [ADR 0012](adr/0012-every-run-script-ships-as-a-pair.md) |
| `run_once_setup-chezmoi-update-schedule.{ps1,sh}.tmpl` | Windows Task Scheduler / macOS `launchd` / Linux `cron`, self-gated | Registers a daily job running `dot_scripts/chezmoi-update-check.{ps1,sh}` — pull + diff + notify only, never an unattended apply (TODO-3, [ADR 0022](adr/0022-scheduled-chezmoi-update-check-pull-diff-notify-only.md)) |
| `dot_scripts/chezmoi-self-heal-check.{ps1,sh}` | `~/.scripts/chezmoi-self-heal-check.{ps1,sh}` | Detection-only report on chezmoi drift and missing `run_once` side effects — never fixes anything automatically (TODO-5). Manually invoked, not scheduled yet |

Claude Code's work/home cleanup (old flat rule paths, gated skills/output-style) lives in
`.chezmoiremove` now, not a custom script — see [ADR 0008](adr/0008-interactive-bootstrap-and-finish-codex-removal.md)
for why that replaced the one-time script ADR 0007 originally shipped with.

## Tool & extension installation (`run_onchange_*`)

| Path | Runs where | Purpose |
|---|---|---|
| `run_onchange_install-tools.{ps1,sh}.tmpl` | Windows / macOS+Linux | Installs the pinned dev tool list via winget / Homebrew+apt; re-runs whenever the tool list changes |
| `run_onchange_install-mosh-client.sh.tmpl` | macOS | Installs `mosh` via Homebrew if absent |
| `run_onchange_install-vscode-extensions.{ps1,sh}.tmpl` | Windows / POSIX | Diffs desired vs. installed VS Code extensions, installs/uninstalls to match; re-runs via an embedded checksum of the extension list |

## Shell (zsh)

| Path | Deploys to | Purpose |
|---|---|---|
| `dot_zshrc.tmpl` | `~/.zshrc` | Prompt, Znap plugin manager, fzf/atuin/zoxide init, sources the three shell partials below |
| `dot_zshenv` | `~/.zshenv` | Minimal env sourced even for non-interactive shells: PATH, LANG, Copilot env vars |
| `private_dot_config/shell/aliases.zsh` | `~/.config/shell/aliases.zsh` | Aliases: vi/vim→nvim, `t`→tmux, eza-based `ls`, mosh shortcuts |
| `private_dot_config/shell/fzf.zsh` | `~/.config/shell/fzf.zsh` | fzf shell integration, keybindings, defaults |
| `private_dot_config/shell/helpers.zsh` | `~/.config/shell/helpers.zsh` | Utility functions — `path_prepend`, an OSC52 `clip` for clipboard-over-SSH |
| `dot_p10k.zsh` | `~/.p10k.zsh` | Powerlevel10k prompt theme config |

## PowerShell (Windows)

| Path | Deploys to | Purpose |
|---|---|---|
| `.chezmoitemplates/powershell/Microsoft.PowerShell_profile.ps1` | included, not deployed directly | Shared profile source: oh-my-posh, zoxide init, `.local/bin` PATH, `clip` function, aliases |
| `Documents/PowerShell/Microsoft.PowerShell_profile.ps1.tmpl` + `themes/pwsh10k.omp.json` | work-profile machine path | One-line include of the shared template, plus its oh-my-posh theme |
| `OneDrive - Powerfleet/Documents/PowerShell/Microsoft.PowerShell_profile.ps1.tmpl` + `themes/pwsh10k.omp.json` | home-profile machine path | Same include, gated to the other profile by `.chezmoiignore`'s username check |

## Terminal emulators

| Path | Deploys to | Purpose |
|---|---|---|
| `dot_tmux.conf.tmpl` | `~/.tmux.conf` | Prefix `Ctrl+\`, vi mode, mouse on, 50K history, `psmux` override on Windows |
| `dot_wezterm.lua` | `~/.wezterm.lua` | MesloLGS font, OneDark theme, 100K scrollback |

## Editor — Neovim

| Path | Deploys to | Purpose |
|---|---|---|
| `private_dot_config/nvim/**` (init.lua, lazy-lock.json, `config/*`, `plugins/*`) | `~/.config/nvim/` | Full Neovim config: options, keymaps, autocmds, theme, lazy.nvim plugin specs (completion, formatting, LSP, treesitter, mini.nvim) |

## Editor — VS Code

| Path | Deploys to | Purpose |
|---|---|---|
| `.chezmoitemplates/vscode/settings.json.tmpl` | included, not deployed directly | Shared settings: theme, fonts, terminal, chat/AI gating (home = no built-in AI features, work = enabled) |
| `AppData/Roaming/Code/User/settings.json.tmpl` | Windows `%APPDATA%\Code\User\settings.json` | Includes the shared template |
| `private_Library/Application Support/Code/User/settings.json.tmpl` | macOS `~/Library/Application Support/Code/User/` | Includes the shared template |
| `.chezmoitemplates/vscode/extensions.txt.tmpl` / `dot_vscode/extensions.txt.tmpl` | `~/.vscode/extensions.txt` | Profile-aware extension list, consumed by the install script above |

## Git & SSH

| Path | Deploys to | Purpose |
|---|---|---|
| `dot_gitconfig.tmpl` | `~/.gitconfig` | Identity, editor, autocrlf, `push.autoSetupRemote`, OS-specific credential helper |
| `private_dot_ssh/config` | `~/.ssh/config` | GitHub key identity, global SSH defaults (`ServerAliveInterval`, `SendEnv`), includes `conf.d/*` for local overrides |

## Node / shell history

| Path | Deploys to | Purpose |
|---|---|---|
| `dot_npmrc` | `~/.npmrc` | `loglevel=error` — nothing sensitive (renamed from `private_dot_npmrc`, see [ADR 0003](adr/0003-drop-private-prefix-from-npmrc.md)) |
| `private_dot_config/private_atuin/private_config.toml` | `~/.config/atuin/config.toml` | Shell-history sync config — currently all defaults/commented out |

## Claude Code (`dot_claude/`)

Split common/work/home per [ADR 0006](adr/0006-capture-live-home-content-into-template.md)
and [ADR 0007](adr/0007-work-home-split-for-claude-code.md) — Claude Code now deploys on
both profiles, with content gated individually instead of one blanket switch.

| Path | Deploys to | Bucket | Purpose |
|---|---|---|---|
| `CLAUDE.md.tmpl` | `~/.claude/CLAUDE.md` | — | Global instructions; `@`-includes `rules/*` per profile |
| `mcp.json.tmpl` | `~/.claude/mcp.json` | — | MCP server config — currently always empty regardless of profile (see open finding below) |
| `settings.json.tmpl` | `~/.claude/settings.json` | — | Permissions/model settings; home- and work-only blocks inside |
| `rules/registers.instructions.md` | `~/.claude/rules/` | Common | The todo/idea/ADR register standard |
| `skills/decision-register/` | `~/.claude/skills/` | Common | Logs/supersedes/lists ADRs |
| `rules/work/{branches,external-services,jira,pull-requests}.instructions.md` | `~/.claude/rules/work/` | Work | Corporate branching/PR/Jira conventions |
| `output-styles/k1ra.md` | `~/.claude/output-styles/k1ra.md` | Work | K1ra output style — structurally excluded from home, not just overridden |
| `skills/{branch-start-work,commit-ready-check,continuation-context-pack,defect-workflow,feature-workflow,jira-post-fix-update-comment,jira-post-qa-test-plan,jira-transition-status,jira-unassign-ticket,post-pr-cleanup,pr-prep-and-submit,project-setup}/` | `~/.claude/skills/` (flat — Claude Code doesn't discover nested skill folders) | Work | Gated by name in `.chezmoiignore`, not by directory nesting |
| `rules/home/preferences.instructions.md` | `~/.claude/rules/home/` | Home | Preferred-name + work-priority-tier instructions, captured from live state |
| `scripts/executable_pick-persona.js` | `~/.claude/scripts/pick-persona.js` | Home | The persona-picker script the `SessionStart` hook runs (path corrected 2026-08-31, see [ADR 0017](adr/0017-fix-pick-persona-hook-path-mismatch.md) — the old `home/scripts/` path deployed to the wrong, unused location) |
| `output-styles/{hailey,alexia,aphrodite,callie}.md` | `~/.claude/output-styles/` | Home | Persona output-styles |
| `skills/{session-start,scratchpad-check,persona,nsfw-comment-audit,security-audit,fiction-export}/` | `~/.claude/skills/` | Home | Dev-session tooling — see ownership note below |
| `executable_rate-limit-statusline-bridge.py.tmpl` | `~/.claude/` (executable) | — | Status line helper script |

`run_once_after_restructure-claude-work-content.{sh,ps1}.tmpl` cleans up the old flat-path
rule files and (on non-work profiles) the now-gated work skills/output-style, per
[ADR 0004](adr/0004-scripted-cleanup-required-for-every-removal.md).

**Ownership of the Home-bucket Claude Code content, per [ADR 0018](adr/0018-canonical-home-profile-claude-source-and-full-skill-vendoring.md)
and [ADR 0024](adr/0024-home-profile-claude-config-ownership-moves-to-secretary-pool.md):**
`secretary-pool` (the Hailey session) authors and owns the content source for these files —
`xls` no longer does; its domain is now `xcl` and its own modules only. This machine's
`~/.claude/` is where her own sync script deploys them; this repo picks up that deployed
artifact — never `secretary-pool`'s internal repo layout — and distributes it to every
other machine via `chezmoi apply`. Any content change routes back to her source, never
edited here directly. This machine is the canonical source for the whole home-profile
surface, blanket, not an enumerated file list.

## GitHub Copilot (`dot_copilot/`) — undocumented until now

| Path | Deploys to | Purpose |
|---|---|---|
| `instructions/{branches,commits,external-services,jira,k1ra,pull-requests}.instructions.md` | `~/.copilot/instructions/` | Work-profile Copilot instructions — `k1ra.instructions.md` mirrors `dot_claude/output-styles/k1ra.md` near-verbatim |
| `settings.json` | `~/.copilot/settings.json` | Model (gpt-5-mini), effort level, telemetry |
| `skills/{defect-workflow,feature-workflow,jira-*}/SKILL.md` | `~/.copilot/skills/` | Same work-skill set as the Claude side, ported to Copilot's format |

Deployed on work profile only. Never referenced in the root `CLAUDE.md` — this whole subsystem existed undocumented until this inventory pass.

## OpenAI Codex — removed (2026-08-30)

`dot_codex/` was fully inert (excluded by `.chezmoiignore`/`.chezmoiremove` on every
profile) and its `@openai/codex` npm install line was the one part of it still actually
running. Both are gone now — see [ADR 0008](adr/0008-interactive-bootstrap-and-finish-codex-removal.md).
`.chezmoiremove`'s `.codex/` entry stays, cleaning up any machine that still has a live
`~/.codex/` from before.

## Diagnostics

| Path | Deploys to | Purpose |
|---|---|---|
| `dot_scripts/audit-env.ps1` / `executable_audit-env.sh` | `~/.local/bin/audit-env.{ps1,sh}` | Checks presence/path/version of 13 expected dev tools |

## Chezmoi & repo meta

| Path | Purpose |
|---|---|
| `.chezmoiignore` | OS/profile gating template — see Flags for stale entries |
| `.chezmoiremove` | Profile-aware forced removal list — strips `~/.codex/` entirely, `~/.copilot/` on non-work profiles, and the granular common/work/home Claude paths on the non-matching profile (fixed 2026-08-30, see [ADR 0008](adr/0008-interactive-bootstrap-and-finish-codex-removal.md)) |
| `.gitattributes` | Forces LF line endings on shell/config/text file types |
| `.gitignore` | Standard ignores (node_modules, `__pycache__`, `.env`, venv, dist/build) |
| `.vscode/` | Untracked (2026-09-03, BinaryMisfit's direct call — standard practice not to track editor workspace state) and gitignored. Still present locally with the same `*.tmpl` → go-template syntax highlighting + autofetch settings, just no longer version-controlled — not a chezmoi target either way |
| `.claude/settings.local.json` | This repo's own local Claude Code permission overrides (not a chezmoi target, explicitly excluded in `.chezmoiignore` as runtime-only state) |

## Documentation & registers

| Path | Purpose |
|---|---|
| `docs/session-start-playbook.md` | This repo's session-start routine (bootstrapped 2026-08-30, see [ADR 0001](adr/0001-bootstrap-session-start-playbook.md)) |
| `docs/adr/` | Decision records — see [`docs/adr/README.md`](adr/README.md) |
| `docs/inventory-register.md` | This file |
| `docs/tracking-index.md` | Index of active registers |
| `uninstall.ps1` / `uninstall.sh` | Reverses everything chezmoi manages on a machine (TODO-1) — dry-run by default, see [ADR 0020](adr/0020-uninstall-script-scope-and-safety-defaults.md) |

## Flags — found during this pass, not yet actioned

1. **`.chezmoiignore`'s "Bootstrap / root-only files" section references `install-core.ps1`, `install-core.sh`, `setup-github-ssh.ps1`, `setup-github-ssh.sh`** — none of these exist on disk, and git history shows no trace of them ever existing under those names. Likely superseded by `run_once_setup-github-ssh.*.tmpl` and left stale. Candidate for cleanup.
2. **`dot_claude/mcp.json.tmpl` has no profile branching** — always `{"mcpServers": {}}` — while root `CLAUDE.md` documents a work-profile `amaza-core` server that isn't in the template. Unresolved from the earlier repo scan.
3. **PowerShell profile-location gating keys off a hardcoded Windows username (`willier`)** to decide work vs. home — functionally fine today, fragile if that account name ever changes.

Resolved since the last pass: `dot_codex/` dead weight (removed, [ADR 0008](adr/0008-interactive-bootstrap-and-finish-codex-removal.md)); bootstrap's stale `encrypted_private_env.age` re-encrypt instructions (fixed, same ADR); `.chezmoiremove`'s blanket `.claude/` removal on non-home profiles (fixed, same ADR — this one was actively dangerous, not just stale).
