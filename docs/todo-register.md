# Todo Register

Concrete, actionable outstanding work for this repo. See
`~/.claude/rules/registers.instructions.md` for the convention: entries are one line
naming the action — real detail lives in the linked decision, doc, or design note, not
inline here.

| # | Item | Priority | Status | Type | Area | Raised | Touched |
|---|---|---|---|---|---|---|---|
| [TODO-1](#todo-1) | Build cross-platform uninstall script (Windows/macOS/Linux) | High | In progress | Targeted | chezmoi | 2026-08-30 | 2026-09-02 |
| [TODO-2](#todo-2) | Capture 3 live-only customizations, then complete the paused first chezmoi apply on this machine | High | Closed | Targeted | chezmoi | 2026-08-30 | 2026-08-31 |
| [TODO-3](#todo-3) | Build scheduled `chezmoi update` automation | High | Open | Targeted | chezmoi | 2026-09-02 | 2026-09-02 |
| [TODO-4](#todo-4) | Non-Windows chezmoi audit (macOS/Linux real parity check) | Normal | Open | Targeted | chezmoi | 2026-09-02 | 2026-09-02 |
| [TODO-5](#todo-5) | Self-heal: detect and recover from broken/drifted chezmoi state | High | Open | Targeted | chezmoi | 2026-09-02 | 2026-09-02 |

---

## TODO-1

Build an uninstall path for each of the three platforms this repo supports that reverses
everything chezmoi has applied to a machine, while leaving chezmoi itself and the cloned
repo intact. See [ADR 0004](adr/0004-scripted-cleanup-required-for-every-removal.md) for
the full policy and rationale.

**Status:** In progress (2026-09-02) — v1 landed, real-machine testing outstanding

**Priority:** High

**Type:** Targeted

**Links to:** [TODO-5](#todo-5) — the same reverse-every-managed-thing inventory logic this
build needs is exactly what a self-heal/repair pass needs too; design the inventory-walk
once, share it between both rather than duplicating it later.

**v1 shipped 2026-09-02:** `uninstall.ps1` and `uninstall.sh` at the repo root — dry-run by
default, tiered risk (managed files/dirs → one-time `run_once_*` side effects → SSH keys
opt-in-only → installed packages never automated). Full scoping rationale in
[ADR 0020](adr/0020-uninstall-script-scope-and-safety-defaults.md). Verified via dry-run on
this Windows machine (real state) and a syntax-checked POSIX dry-run under git-bash — **not
yet run for real on macOS or Linux**, and never run with `-Confirm`/`--confirm` anywhere.

**Next action:** Real `-Confirm` execution testing, ideally on a disposable/VM machine per
platform, not this daily-driver machine. Cross-reference against
[`docs/inventory-register.md`](inventory-register.md) periodically for drift, since the
managed-file lists inside both scripts are hand-maintained, not generated from that doc.
Coordinate with [TODO-4](#todo-4)'s non-Windows audit — real execution testing on
macOS/Linux naturally belongs in that pass rather than duplicating the effort.

---

## TODO-3

Build the scheduled `chezmoi update` automation — investigated and approved 2026-08-30,
asked about twice in that session with no answer given, dropped without ever being logged.
Surfaced again during the 2026-09-02 session-history audit; deliberately not built in that
same session (a recurring system-level scheduled task shouldn't get stood up right as the
person who'd verify it works is stepping away).

**Status:** Open

**Priority:** High

**Type:** Targeted

**Next action:** Decide cadence (daily vs. every N hours) with BinaryMisfit, then write
`run_once_setup-chezmoi-update-schedule.ps1.tmpl` (Windows Task Scheduler,
`Register-ScheduledTask`) and `run_once_setup-chezmoi-update-schedule.sh.tmpl` (launchd on
macOS, cron or a systemd `--user` timer on Linux) per this repo's own run-script-pair
convention. Verify the job actually fires and applies clean before calling it done — don't
just assume a scheduled task registered successfully because the registration command
didn't error.

---

## TODO-4

Non-Windows chezmoi audit — most of this repo's recent real, tested work (Windows
Terminal vendoring, the `pick-persona.js` regression/recovery, the CRLF investigation, the
scheduled-update design) has been Windows-specific, run and verified on this one Windows
machine. macOS/Linux paths exist as paired `.sh.tmpl` files per this repo's own convention,
but pairing a file doesn't mean it's actually been run for real anywhere.

**Status:** Open

**Priority:** Normal

**Type:** Targeted

**Next action:** Audit every `run_once_*`/`run_onchange_*` `.sh.tmpl` and every
`.chezmoiignore`/`.chezmoitemplates` OS-gate for macOS and Linux — confirm each one is
still accurate against current tooling (Homebrew/apt package names, path assumptions,
shell-specific syntax), and where possible actually exercise a fresh `chezmoi apply` on a
real or disposable macOS/Linux environment rather than reasoning about it from the
Windows-side template alone.

---

## TODO-5

Self-heal: detect and automatically recover from broken or drifted chezmoi-managed state
— a partial/interrupted `chezmoi apply`, a stray untemplated live-only customization
(TODO-2's own pattern), or a managed file that's drifted from what the template says it
should be. Raised 2026-09-02 alongside TODO-1, which it shares real design surface with.

**Status:** Open

**Priority:** High

**Type:** Targeted

**Links to:** [TODO-1](#todo-1) — shares the same "inventory everything chezmoi manages,
compare against live state" logic; design once, use for both reversal (uninstall) and
repair (self-heal).

**Next action:** Scope what "broken state" actually means concretely (interrupted apply
mid-write? a file that's been hand-edited off-template? a missing `run_once_*` side
effect that should exist but doesn't?) before writing any recovery logic — this needs a
real definition, not an assumed one, given how easily a self-heal mechanism can make things
worse by "fixing" something that was actually a deliberate live-only customization (see
TODO-2's own history).

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
