# Todo Register

Concrete, actionable outstanding work for this repo. See
`~/.claude/rules/registers.instructions.md` for the convention: entries are one line
naming the action — real detail lives in the linked decision, doc, or design note, not
inline here.

| # | Item | Priority | Status | Type | Area |
|---|---|---|---|---|---|
| [TODO-1](#todo-1) | Build cross-platform uninstall script (Windows/macOS/Linux) | High | Open | Targeted | chezmoi |
| [TODO-2](#todo-2) | Capture 3 live-only customizations, then complete the paused first chezmoi apply on this machine | High | Open | Targeted | chezmoi |

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

---

## TODO-2

`chezmoi diff` on this machine (2026-08-30) surfaced three real, live-only customizations
that the repo's templates don't know about — applying as-is would silently delete them.
Paused before running `chezmoi apply` specifically to capture these first.

**Status:** Open

**Priority:** High

**Type:** Targeted

**Next action:** For each of the three, either fold it into the relevant template/source
so it survives an apply, or make a deliberate call to drop it — then run the apply this
was paused ahead of, with a real backup taken immediately before.

1. **`.gitconfig`** — live has two entries with no template equivalent:
   `[safe] directory = D:/Source/python-movie-tools` and
   `[credential "https://gitgud.io/binarymisfit/x-lifestyle-mcp.git"] provider = generic`.
2. **`.ssh/config`** — live has two `Host` blocks the template would delete: `ssh.gitgud.io`
   and `git.digitalmisfit.net` (port 10022) — the latter pairs with the GitGud credential
   entry above, so losing both breaks that remote entirely.
3. **`.claude/settings.json`** — live has settings the template doesn't carry: permission
   grant `Bash(ssh netctrl *)`, `"tui": "fullscreen"`, `"switchModelsOnFlag": true`,
   `"useAutoModeDuringPlan": false`, and `"inputNeededNotifEnabled": true` (template has
   `false`).

Also already fixed and pushed while investigating this (`d36af0a`): a `.chezmoiremove`
whitespace-trim bug that glued `scoop/` onto an unrelated comment line, corrupting it into
a bogus removal path — this no longer blocks the apply, just noting it happened here.
