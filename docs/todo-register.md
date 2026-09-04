# Todo Register

Concrete, actionable outstanding work for this repo. See
`~/.claude/rules/registers.instructions.md` for the convention: entries are one line
naming the action — real detail lives in the linked decision, doc, or design note, not
inline here.

| # | Item | Priority | Status | Type | Area | Raised | Touched |
|---|---|---|---|---|---|---|---|
| [TODO-1](#todo-1) | Build cross-platform uninstall script (Windows/macOS/Linux) | High | In progress | Targeted | chezmoi | 2026-08-30 | 2026-09-02 |
| [TODO-4](#todo-4) | Non-Windows chezmoi audit (macOS/Linux real parity check) | Normal | In progress | Targeted | chezmoi | 2026-09-02 | 2026-09-02 |

---

## TODO-1

Build an uninstall path for each of the three platforms this repo supports that reverses
everything chezmoi has applied to a machine, while leaving chezmoi itself and the cloned
repo intact. See [ADR 0004](adr/0004-scripted-cleanup-required-for-every-removal.md) for
the full policy and rationale.

**Status:** In progress (2026-09-02) — v1 landed, real-machine testing outstanding

**Priority:** High

**Type:** Targeted

**Links to:** [TODO-5](todo-archive.md#todo-5-self-heal-detect-and-recover-from-brokendrifted-chezmoi-state)
(archived, closed 2026-09-04) — shared the same reverse-every-managed-thing inventory logic
this build needs; self-heal's own three tiers ended up built independently rather than
sharing code with uninstall's inventory walk, but the historical link is worth keeping.

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
