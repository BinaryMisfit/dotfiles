# Todo Register

Concrete, actionable outstanding work for this repo. See
`~/.claude/rules/registers.instructions.md` for the convention: entries are one line
naming the action — real detail lives in the linked decision, doc, or design note, not
inline here.

| # | Item | Priority | Status | Type | Area | Raised | Touched |
|---|---|---|---|---|---|---|---|
| [TODO-1](#todo-1) | Build cross-platform uninstall script (Windows/macOS/Linux) | High | In progress | Targeted | chezmoi | 2026-08-30 | 2026-09-02 |
| [TODO-2](#todo-2) | Capture 3 live-only customizations, then complete the paused first chezmoi apply on this machine | High | Closed | Targeted | chezmoi | 2026-08-30 | 2026-08-31 |
| [TODO-3](#todo-3) | Build scheduled `chezmoi update` automation | High | Closed | Targeted | chezmoi | 2026-09-02 | 2026-09-02 |
| [TODO-4](#todo-4) | Non-Windows chezmoi audit (macOS/Linux real parity check) | Normal | In progress | Targeted | chezmoi | 2026-09-02 | 2026-09-02 |
| [TODO-5](#todo-5) | Self-heal: detect and recover from broken/drifted chezmoi state | High | In progress | Targeted | chezmoi | 2026-09-02 | 2026-09-03 |

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

**v1 shipped 2026-09-02, rescoped same day:** `uninstall.ps1` and `uninstall.sh` at the
repo root, dry-run by default. Scope corrected per BinaryMisfit's own explicit rule (see
[ADR 0021](adr/0021-uninstall-reverses-everything-except-bootstrap.md), superseding
ADR 0020's original package exclusion): the **only** permanent exclusion is what
`bootstrap.ps1`/`bootstrap.sh` itself generates directly — chezmoi's own install/config,
the age key, and the GitHub SSH key. Everything else, including the full winget/Homebrew/
apt/npm package list and VS Code extensions, is reversed under a bare `-Confirm`/`--confirm`
— no separate flag tier anymore. Two named, deliberate exceptions stay flagged rather than
silent: `Git.Git`/`OpenJS.NodeJS.LTS`/`Python.Python.3.14` are removed but marked
"commonly relied on by other software" in the output; Linux's `ca-certificates`/`curl`/
`gnupg` are NOT auto-removed even under `--confirm`, printed as a manual-review item
instead — real system-package risk, not config file removal.

Verified via dry-run on this Windows machine (real state, including winget/npm package
enumeration) and a syntax-checked POSIX dry-run under git-bash. **Not yet run for real on
macOS or Linux, and never run with `-Confirm`/`--confirm` anywhere** — the stakes of that
first real run are now materially higher than v1's, since it uninstalls actual dev tools,
not just config files.

**Next action:** Real `-Confirm` execution testing, ideally on a disposable/VM machine per
platform, not this daily-driver machine. Cross-reference against
[`docs/inventory-register.md`](inventory-register.md) periodically for drift, since the
managed-file/package lists inside both scripts are hand-maintained, not generated from that
doc or from `run_onchange_install-tools.*.tmpl` directly. Coordinate with
[TODO-4](#todo-4)'s non-Windows audit — real execution testing on macOS/Linux naturally
belongs in that pass rather than duplicating the effort.

---

## TODO-3

Build the scheduled `chezmoi update` automation — investigated and approved 2026-08-30,
asked about twice in that session with no answer given, dropped without ever being logged.
Surfaced again during the 2026-09-02 session-history audit; built the same day once
cadence/safety were settled with BinaryMisfit.

**Status:** Closed (2026-09-02)

**Priority:** High

**Type:** Targeted

**Resolution:** Daily (09:00 local), pull + diff + notify only, never an unattended apply
— full reasoning in [ADR 0022](adr/0022-scheduled-chezmoi-update-check-pull-diff-notify-only.md).
`dot_scripts/chezmoi-update-check.{ps1,sh}` does the actual check;
`run_once_setup-chezmoi-update-schedule.{ps1,sh}.tmpl` registers the recurring job once
(Windows Task Scheduler / macOS `launchd` / Linux `cron`). Ran the Windows check script for
real on this machine — it found genuine pending drift (two xls-owned files this repo
hadn't caught up to yet, and a real `.chezmoiignore` gap the check itself surfaced: `uninstall.ps1`/
`uninstall.sh` had no root-only exclusion, so chezmoi wanted to deploy them into `~` — fixed
in the same pass) and wrote the marker file correctly. **Not yet verified**: the actual
Task Scheduler/launchd/cron registration firing on its own schedule (only the check
script's logic itself was exercised directly, not the scheduling mechanism) — real
macOS/Linux registration is untested entirely, same caveat as TODO-1/TODO-4.

---

## TODO-4

Non-Windows chezmoi audit — most of this repo's recent real, tested work (Windows
Terminal vendoring, the `pick-persona.js` regression/recovery, the CRLF investigation, the
scheduled-update design) has been Windows-specific, run and verified on this one Windows
machine. macOS/Linux paths exist as paired `.sh.tmpl` files per this repo's own convention,
but pairing a file doesn't mean it's actually been run for real anywhere.

**Status:** In progress (2026-09-02) — static read-through of every POSIX script done,
real-machine execution still outstanding

**Priority:** Normal

**Type:** Targeted

**Static audit findings, 2026-09-02** (read every `run_once_*`/`run_onchange_*` `.sh.tmpl`
in the repo plus the relevant `.chezmoiignore` OS-gates):

1. **Real gap:** `audit-env.sh` checks for a bare `python` binary, but the Linux install
   list (`run_onchange_install-tools.sh.tmpl`) only installs `python3`/`python3-pip` — no
   symlink, unlike the `bat`→`batcat` and `fd`→`fdfind` fixes that script already has for
   the same class of problem. Would report `python` MISSING on a clean Linux box that
   actually has it as `python3`.
2. **Fixed 2026-09-02, per BinaryMisfit's own call ("always check both, apt for Linux/brew
   for Mac"):** `bootstrap.sh`'s `git`/`curl` install now branches on `apt-get` or `brew`,
   matching the `age` install pattern two steps later that already did this correctly.
3. **Fixed 2026-09-02, per BinaryMisfit's own call ("SSH keys should be up"):**
   `dot_zshrc.tmpl` now reuses a saved `ssh-agent` across shells
   (`~/.ssh/agent.env`) and re-adds the GitHub key whenever the agent has none loaded —
   self-heals after a reboot too, since a dead agent socket surfaces as `ssh-add` exit code
   2, the same trigger as never having had an agent at all. Neither fix has run through a
   real `zsh` yet — no `zsh` on this machine to test with.
4. **False alarm, corrected on re-read — noted so it isn't re-investigated:** first pass
   flagged `run_once_install-iterm2-shell-integration.sh.tmpl` running on Linux (gated
   `ne .chezmoi.os "windows"`, i.e. darwin OR linux) as wrong, since iTerm2 is macOS-only
   software. Wrong call — the extension list includes `ms-vscode-remote.remote-ssh` and
   friends, confirming Linux machines in this fleet are remote SSH targets accessed from a
   Mac client, not local desktops. iTerm2 shell integration on the Linux *server* side is
   exactly what makes iTerm2's features work over that SSH session — intentional, not a
   bug. Same evidence explains `.chezmoiignore`'s "Linux-only targets" block (excludes
   `.vscode/`/the extensions installer *on* Linux, despite the confusing label) — no local
   VS Code needed on a remote-SSH target. Worth a comment-clarity fix on that misleading
   label at some point, not a functional one.

**Next action:** Real execution testing on a disposable/VM macOS and Linux machine — a
fresh `chezmoi init`/`apply` end to end, not just reading the templates. Confirm or refute
findings 2 and 3 above against real behavior. Coordinate with
[TODO-1](#todo-1)'s own real-execution testing rather than running two separate disposable-
machine passes.

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

**Status:** In progress (2026-09-02) — detection half built, repair action still undecided

**Scope, confirmed by BinaryMisfit:** three tiers picked (drift / missing `run_once` side
effect / interrupted apply), plus his own fourth idea — if drift is severe or the machine's
gone stale for months, offer a full uninstall→bootstrap→apply rebuild rather than trying to
patch individual files. That fourth tier isn't built yet; needs its own real decision on
thresholds and, given `uninstall` now removes actual packages, real caution before it's
ever offered as automatic.

**Built 2026-09-02:** `dot_scripts/chezmoi-self-heal-check.{ps1,sh}` — detection only, same
posture as TODO-3's check: never fixes anything, just reports. Covers drift (reuses TODO-3's
pull+diff) and missing `run_once` side effects (nvim junction, GitHub SSH key, iTerm2
integration, the TODO-3 scheduled job — cleanup scripts like
`run_once_after_remove-*` intentionally left out of this pass, a different check shape).
Interrupted-apply detection is explicitly **not implemented** — flagged honestly rather than
faked, needs real research into chezmoi's own state tracking (`chezmoistate.boltdb`) first.
Ran the Windows script for real — it caught two genuine drifted files (both pulled and
applied in the same pass) — and syntax-checked the POSIX side under git-bash.

**Progress 2026-09-03:** Interrupted-apply detection researched for real (not guessed) —
`chezmoi state dump`/`chezmoistate.boltdb` don't distinguish an interrupted apply from
ordinary unapplied drift; the only mechanism that actually answers the question is a
sentinel marker set/cleared by chezmoi's own native `hooks.apply.pre`/`hooks.apply.post`
config (confirmed against the real docs, not memory). [ADR 0023](adr/0023-scripted-toml-yaml-writes-are-additive-only.md)
settles the design blocker this raised — the installer script has to write into the
user's local `chezmoi.toml`/`.yaml`, additive-only, halting on any real key collision
rather than guessing.

**Built and tested 2026-09-03:** `run_once_configure-chezmoi-apply-hooks.{ps1,sh}.tmpl`
(the additive-only hooks installer) and `dot_scripts/chezmoi-apply-marker.{ps1,sh}`
(sets/clears `~/.chezmoi-apply-in-progress`). Tested against real copies of this machine's
own `chezmoi.yaml`, never the live file directly: a fresh append, a re-run against its own
prior output (idempotent, correctly no-ops), a genuine foreign `hooks:` collision (correctly
halts without touching the file), and the TOML format path — all four passed. One real bug
caught by testing and fixed before landing: the idempotency check was matching a string
(`chezmoi-apply-in-progress`, the marker *file* name) that never actually appears in the
written config — only the marker *script's* path does — so a second run misread its own
prior write as a foreign collision. Safe outcome either way (never overwrites), but wrong
and noisy; fixed to check for the right string. `chezmoi-self-heal-check.{ps1,sh}`'s
interrupted-apply tier is also now real (was a stub) — reads the marker if hooks are
configured, honestly reports "detection not active" if they aren't yet. Ran the Windows
self-heal check for real against live state: correctly reports hooks aren't configured yet
(the installer hasn't actually run against the real `chezmoi.yaml`, only tested copies).

**The installer hasn't executed against the real machine yet** — that happens on the next
real `chezmoi apply`, same review-the-diff-first discipline as any other apply. Detection
goes live the run after that (hooks are read once at the start of an apply, so the run that
adds them can't also be watched by them).

**Next action:** Run a real `chezmoi apply` to let the hooks installer fire for real, then
confirm the self-heal check reports "clean" instead of "not active." Separately, decide the
fourth tier's real trigger (what % drift, what "stale" means in months) and whether it's
ever automatic or always human-confirmed — given uninstall's own package-removal scope,
leaning toward "always confirmed, never automatic" but that's BinaryMisfit's call. Decide
whether/how this gets scheduled (daily alongside TODO-3's check?) once repair action exists.

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
