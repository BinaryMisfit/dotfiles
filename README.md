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

### Unix (macOS / Linux)

```sh
sh -c "$(curl -fsLS https://raw.githubusercontent.com/BinaryMisfit/dotfiles/main/bootstrap.sh)"
```

### Windows

```powershell
irm https://raw.githubusercontent.com/BinaryMisfit/dotfiles/main/bootstrap.ps1 | iex
```
