# Todo Register

Concrete, actionable outstanding work for this repo. See
`~/.claude/rules/registers.instructions.md` for the convention: entries are one line
naming the action — real detail lives in the linked decision, doc, or design note, not
inline here.

| # | Item | Priority | Status | Type | Area | Raised | Touched |
|---|---|---|---|---|---|---|---|
| [TODO-1](#todo-1) | Build cross-platform uninstall script (Windows/macOS/Linux) | High | In progress | Targeted | chezmoi | 2026-08-30 | 2026-09-06 |
| [TODO-4](#todo-4) | Non-Windows chezmoi audit (macOS/Linux real parity check) | Normal | In progress | Targeted | chezmoi | 2026-09-02 | 2026-09-06 |
| [TODO-6](#todo-6) | Build a real machine inventory (8+ fleet) for Aphrodite's own domain to reference | Normal | Open | Targeted | domain | 2026-09-04 | 2026-09-04 |

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

**Real `--confirm` execution test, WSL2 Ubuntu, 2026-09-05 night, findings written up
2026-09-06:** first real (non-dry-run) run of `uninstall.sh --confirm` against a disposable
WSL2 Ubuntu instance. Misdiagnosed a slow WSL trigger as a hung process and killed it
prematurely; a reboot landed before the resumed second run finished, leaving the instance in
a genuine partial-uninstall state that survived the reboot untouched (WSL2 instances persist
disk state across a Windows reboot the same as any VM). Verified for real post-reboot:

- Chezmoi-managed dotfiles (`.zshrc`, `.tmux.conf`, `.wezterm.lua`, `.gitconfig`,
  `.p10k.zsh`) — fully removed, no partial state.
- `APT_PACKAGES` (10 targets) — 8 removed cleanly (`bat`, `fd-find`, `fzf`, `jq`, `neovim`,
  `python3-pip`, `ripgrep`, `shellcheck`). **2 genuinely did not remove: `python3`, `tmux`**
  — this is a real per-package failure, not the premature-kill misdiagnosis from the same
  night; every other package in the same list succeeded around them.
- `GITHUB_RELEASE_BINARIES` (`lazygit`, `stylua`, `lua-language-server`, `shfmt`) — all
  absent from `~/.local/bin`, removed cleanly.
- `APT_RISKY_SHARED` (`ca-certificates`, `curl`, `gnupg`) and `git` — still present, exactly
  as designed (never auto-removed / never a target).
- **Real observability gap, confirmed not just theorized:** `/var/log/apt/history.log` on
  this instance is empty and stale (last rotated May), so neither the successful removals
  nor the `python3`/`tmux` failures left any trace there — the `2>/dev/null` on the
  `apt-get remove` line in `uninstall.sh` hides the actual per-package error, and there's
  currently no other log to reconstruct it from after the fact. Root cause of the
  `python3`/`tmux` failure specifically is still unknown — didn't re-run the actual removal
  to avoid repeating the same live-system risk this finding is about.
- `NPM_GLOBAL_PACKAGES` and VS Code Server extension removal — **untested, not just
  "unreached."** This WSL2 distro has no native Linux `npm` at all (`npm` resolves through
  Windows interop to the host's own `npm.exe`) and never had a `~/.vscode-server` directory
  in the first place, so neither removal path is exercisable on this kind of instance —
  needs a host that actually has native Node + a real Remote-WSL/Remote-SSH extension
  install to test for real.

**Next action:** before the next real run, stop swallowing `apt-get remove`'s stderr on that
line so a `python3`/`tmux`-style failure is diagnosable instead of silent. Still need a real
`-Confirm` execution pass on a disposable macOS box, plus a Linux/WSL host with native
npm + real `vscode-server` state, to close out the two paths this run couldn't exercise at
all. Cross-reference against [`docs/inventory-register.md`](inventory-register.md)
periodically for drift, since the managed-file/package lists inside both scripts are
hand-maintained, not generated from that doc or from `run_onchange_install-tools.*.tmpl`
directly. Coordinate with [TODO-4](#todo-4)'s non-Windows audit — real execution testing on
macOS/Linux naturally belongs in that pass rather than duplicating the effort.

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

**Real execution data point, 2026-09-05/06 (WSL2 Ubuntu, `uninstall.sh` side, not
`apply`):** see [TODO-1](#todo-1)'s own write-up for the full findings — this doesn't
confirm or refute findings 2/3 above (those are `install-tools`/`bootstrap` concerns, this
run only exercised `uninstall.sh`), but it is this repo's first real non-Windows execution
evidence of any kind, and it already surfaced one new real gap TODO-1 didn't have before:
`apt-get remove`'s swallowed stderr hides genuine per-package failures (`python3`, `tmux`
both silently failed to remove).

**Next action:** Real execution testing on a disposable/VM macOS and Linux machine — a
fresh `chezmoi init`/`apply` end to end, not just reading the templates. Confirm or refute
findings 2 and 3 above against real behavior. Coordinate with
[TODO-1](#todo-1)'s own real-execution testing rather than running two separate disposable-
machine passes.

---

## TODO-6

Build a real machine inventory covering BinaryMisfit's actual fleet (8+ machines,
ignoring cloud ones separately) — hostname, role, OS, whether it's chezmoi-managed, and
anything domain-relevant (e.g. which machines run netctrl-style infra vs. daily-driver
desktops). Raised 2026-09-04, directly out of the Bitwarden Secrets Manager
investigation: the "make it part of chezmoi" recommendation had to be corrected live
because the actual fleet size and shape weren't accounted for going in — an inventory
would have caught that before the recommendation was made, not after.

**Status:** Open

**Priority:** Normal

**Type:** Targeted

**Area:** domain (Aphrodite's own — "anything needed on this machine or any other
BinaryMisfit uses" per `docs/persona-domain-register.md` in secretary-pool)

**Ownership, BinaryMisfit's own call:** he's building the actual inventory content
himself ("that's on me") — this entry tracks that it needs to land somewhere Aphrodite
can reference before making future cross-machine recommendations, not that she's the one
populating it from scratch.

**Next action:** BinaryMisfit provides the real fleet list; once it exists, decide where
it lives (this repo's own `docs/inventory-register.md` already tracks managed
files/packages — worth checking whether machine inventory belongs there as a new section,
or as its own file, before creating a duplicate structure).
