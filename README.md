# dotfiles

Cross-platform development environment managed with `chezmoi`.

This repo is the single source of truth for configuration across macOS, Linux, and Windows.

---

## Principles

- Reproducible: bootstrap any machine quickly
- Separation:
  - structure → this repo
  - secrets/data → local (`chezmoi.yaml`, age)
- Idempotent: safe to rerun
- No secret leakage
- Bootstrap installs tooling only
- Chezmoi owns config state

---

## Platforms

- macOS
- Linux
- Windows (PowerShell 7)

---

## Bootstrap

Bootstrap installs only the minimum local prerequisites needed to unlock the repo:

- `git` / `curl` where needed
- `chezmoi`
- `age`
- machine-local age and GitHub SSH keys/config

On Windows, prerequisites come from `winget`. On macOS/Linux, `chezmoi` installs via its
official install script and `age` via Homebrew or apt.

Repeatable development tools are installed by chezmoi after apply through native package
managers: `winget` on Windows, Homebrew on macOS, apt (plus a few upstream install scripts
for tools Debian/Ubuntu doesn't package) on Linux.

### Unix (macOS / Linux)

```sh
sh -c "$(curl -fsLS https://raw.githubusercontent.com/BinaryMisfit/dotfiles/main/bootstrap.sh)"
```

### Windows

```powershell
irm https://raw.githubusercontent.com/BinaryMisfit/dotfiles/main/bootstrap.ps1 | iex
```

## New machine flow

1. Run the platform bootstrap command above. Partway through, `chezmoi init` will prompt
   once for this machine's **profile** (`work`/`home`, defaults to `home`) and **git
   name/email** (defaulted per profile) — answered once, persisted in `chezmoi.yaml`,
   never asked again.
2. If this repo has encrypted files by then: add the generated age recipient to their
   recipients list from an existing trusted machine, and re-encrypt/push from there.
3. On the new machine, run:

```sh
chezmoi update
chezmoi diff
chezmoi apply
```

When the tool-install script's contents change, chezmoi re-runs it: `run_onchange_install-tools.ps1.tmpl` on Windows, `run_onchange_install-tools.sh.tmpl` on macOS/Linux.

Machines previously bootstrapped with scoop/mise get them actively uninstalled by a
one-time cleanup script (`run_once_after_remove-scoop-mise.ps1.tmpl` /
`run_once_after_remove-mise.sh.tmpl`) the first time they run `chezmoi apply` after
this change.

## Local data

Node and Python versions are whatever the native package manager resolves as
current/LTS — there is no per-machine version pinning or override (that was a
mise-specific feature that didn't carry over to winget/brew/apt).

---

## AI tooling

Profile-gated (`.profile` = `work` or `home`, set in local `chezmoi.yaml`):

- **Claude Code** (`dot_claude/`) — deploys on `home` profile. Global instructions,
  permissions, output styles, and skills. `dot_claude/rules/registers.instructions.md`
  defines the todo/idea/decision-record convention used by every repo that adopts it.
- **GitHub Copilot** (`dot_copilot/`) — deploys on `work` profile. Instructions and
  skills mirroring the Claude Code side, ported to Copilot's format.
- **Codex** (`dot_codex/`) — checked in, but both `.chezmoiignore` and `.chezmoiremove`
  currently exclude it on every profile. Not actively deployed anywhere right now.

## Decision records & registers

Non-obvious decisions in this repo live under [`docs/adr/`](docs/adr/) — one file per
decision, indexed in [`docs/adr/README.md`](docs/adr/README.md). A full catalog of what
this repo contains and what each part does lives in
[`docs/inventory-register.md`](docs/inventory-register.md); active registers are listed
in [`docs/tracking-index.md`](docs/tracking-index.md).

Start-of-session routine for this repo: [`docs/session-start-playbook.md`](docs/session-start-playbook.md).
