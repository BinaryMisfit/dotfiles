# dotfiles

Cross-platform development environment managed with `chezmoi`.

This repo defines the *structure* of the environment.  
Machine-specific data (identity, secrets) is kept local.

---

## 🧠 Design Principles

- **Reproducible** – bootstrap a new machine with a single command
- **Separation of concerns**
  - structure → this repo
  - data → local (`chezmoi.yaml`)
- **Idempotent** – safe to re-run bootstrap
- **No secret leakage** – encryption via `age`

---

## 🚀 Bootstrap

```sh
sh -c "$(curl -fsLS https://raw.githubusercontent.com/BinaryMisfit/dotfiles/main/bootstrap.sh)"
