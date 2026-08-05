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

1. Run the platform bootstrap command above.
2. Add the generated age recipient to the encrypted file recipients from an existing trusted machine.
3. Re-encrypt encrypted files and push the repo update.
4. On the new machine, run:

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
