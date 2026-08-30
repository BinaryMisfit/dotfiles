# Todo Register

Concrete, actionable outstanding work for this repo. See
`~/.claude/rules/registers.instructions.md` for the convention: entries are one line
naming the action — real detail lives in the linked decision, doc, or design note, not
inline here.

| # | Item | Priority | Status | Type | Area |
|---|---|---|---|---|---|
| [TODO-1](#todo-1) | Build cross-platform uninstall script (Windows/macOS/Linux) | High | Open | Targeted | chezmoi |

---

## TODO-1

Build an uninstall path for each of the three platforms this repo supports that reverses
everything chezmoi has applied to a machine, while leaving chezmoi itself and the cloned
repo intact. See [ADR 0004](adr/0004-scripted-cleanup-required-for-every-removal.md) for
the full policy and rationale.

**Status:** Open

**Priority:** High

**Type:** Targeted

**Next action:** Design and write `uninstall.ps1` (Windows), `uninstall.sh` (macOS +
Linux, or split if the two diverge enough to warrant it) — inventory every managed
dotfile, every `run_onchange_install-tools`-installed package, and every `run_once_*` side
effect (SSH keys, the nvim junction, shell integrations) using
[`docs/inventory-register.md`](inventory-register.md) as the source list, then reverse
each one. Do not touch the chezmoi binary, its config, or the repo checkout itself.
