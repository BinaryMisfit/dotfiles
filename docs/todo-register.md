# Todo Register

Concrete, actionable outstanding work for this repo. See
`~/.claude/rules/registers.instructions.md` for the convention: entries are one line
naming the action — real detail lives in the linked decision, doc, or design note, not
inline here.

| # | Item | Priority | Status | Type | Area |
|---|---|---|---|---|---|
| [TODO-1](#todo-1) | Build cross-platform uninstall script (Windows/macOS/Linux) | High | Open | Targeted | chezmoi |
| [TODO-2](#todo-2) | Capture 3 live-only customizations, then complete the paused first chezmoi apply on this machine | High | Closed | Targeted | chezmoi |

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

**Status:** Closed (2026-08-31)

**Priority:** High

**Type:** Targeted

**Resolution:** All three customizations resolved, then the apply itself run to
completion:

1. **`.gitconfig`** — `safe.directory` and the GitGud credential override left
   live-only (origin unclear, user chose not to fold either in); the repo itself dropped
   the `python-movie-tools` local clone that `safe.directory` pointed at, so that entry is
   gone for good, not just untemplated.
2. **`.ssh/config`** — folded in: `ssh.gitgud.io` and `git.digitalmisfit.net` (port 10022)
   `Host` blocks added, plus new `[url] insteadOf` rewrite rules in `.gitconfig` forcing
   SSH for github/gitgud/digitalmisfit regardless of URL form used.
3. **`.claude/settings.json`** — folded in: `tui`, `switchModelsOnFlag` (flipped to
   `false` after research showed it governs silent Fable/Opus safety-classifier
   escalation), `useAutoModeDuringPlan`, `inputNeededNotifEnabled` (flipped to `true`),
   and the `permissions.allow` grants. The `Bash(ssh netctrl *)` grant specifically moved
   to `~/.claude/settings.local.json` instead, since that file isn't chezmoi-managed at
   all — apply-proof without needing a template entry.

Also fixed along the way: the `.chezmoiremove` whitespace-trim bug (`d36af0a`, already
noted here); a second, unrelated `remove-codex.sh` crash on Windows (bare POSIX script
with no `.ps1` counterpart, `fork/exec`-failed outright) — fixed by adding
`remove-codex.ps1` and documenting "every run script ships as a pair, no exceptions" in
`CLAUDE.md`; and a real machine-level gotcha where `chezmoi`'s actual source dir
(`~/.local/share/chezmoi`) turned out to be a separate, staler clone from whichever
working copy was being edited — now documented in `CLAUDE.md` as "commit + push +
`git pull` the source dir before any live test."

Final `chezmoi apply` completed clean, verified via empty `chezmoi status`/`chezmoi diff`.
A full backup of every touched file was taken immediately before applying, at
`C:\Users\diago\chezmoi-apply-backups\20260831-090912\`.
