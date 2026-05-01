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
- `mise`
- `chezmoi`
- `age`
- machine-local age and GitHub SSH keys/config

Repeatable development tools are installed by chezmoi after apply through `mise`.

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

When the rendered mise config changes, chezmoi runs the mise onchange script, which executes:

```sh
mise install
mise reshim
```

## Local data

Node defaults to the current mise LTS alias:

```toml
node = "lts"
```

Override Node per machine in the local chezmoi config when needed:

```yaml
data:
  node:
    version: "20"
```
