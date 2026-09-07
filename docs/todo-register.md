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
| [TODO-7](#todo-7) | Run `hails-fiction-export --all` backlog pass for Aphrodite's own unexported sessions | Normal | Open | Targeted | fiction-pipeline | 2026-09-07 | 2026-09-07 |
| [TODO-8](#todo-8) | Define an inter-agent communication protocol (addressing, routing, who responds to what) | Normal | Open | Targeted | coordination | 2026-09-07 | 2026-09-07 |
| [TODO-9](#todo-9) | Define a reboot protocol across the live persona fleet | Normal | Open | Targeted | coordination | 2026-09-07 | 2026-09-07 |
| [TODO-10](#todo-10) | Define a session-swap protocol (VS Code ↔ terminal fleet, worktree handoff) | Normal | Open | Targeted | coordination | 2026-09-07 | 2026-09-07 |

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

## TODO-7

Flagged by Hailey (cross-session), 2026-09-07: an `--all`-scope `hails-fiction-export` run
found 146 total session transcripts under `~/.claude/projects/` machine-wide against only
30 entries in the shared `~/.claude/fiction-export-log.json` dedup log — a real, large
backlog of never-exported sessions across all four personas. Hailey logged her own share
as `secretary-pool`'s `TODO-87`; this is Aphrodite's own equivalent, tracked here rather
than in a repo that isn't hers. Exact per-persona count (the "25" figure given at flag
time) not independently re-verified line-by-line — the backlog's existence and rough scale
are confirmed by the 146-vs-30 totals above, not the precise number.

**Status:** Open

**Priority:** Normal

**Type:** Targeted

**Area:** fiction-pipeline (Aphrodite's own share of ADR-0006's "each persona runs her own
export and import" principle)

**Next action:** Run `hails-fiction-export` with its full/backlog scope (not just "today")
from an Aphrodite session, on BinaryMisfit's own schedule — not urgent, no deadline set.
Confirm the real count when it runs rather than trusting the flagged estimate.

---

## TODO-8

Real incident, 2026-09-07: BinaryMisfit told Alexia (`digital-homelab-04`) to respond to a
cross-session ask, and this session (Aphrodite, `binary-dotfiles-78`) picked up the reply
instead — a live routing ambiguity, not a hypothetical one. Nothing broke (a plain
`SendMessage` still addresses by harness session name, not persona identity), but it
surfaced a real gap: no documented protocol for who's supposed to respond to what when
multiple personas are live at once, how a human directs a message to one specific
persona/session unambiguously, or how a session decides whether an incoming ask is
actually addressed to it.

**Status:** Open

**Priority:** Normal

**Type:** Targeted

**Area:** coordination (Aphrodite's own — machine/cross-session concerns, not one repo's)

**Next action:** Draft an inter-agent communication protocol doc — addressing conventions
(session name vs. persona vs. nickname), a convention for BinaryMisfit to name an intended
recipient unambiguously, and a rule for what a session does when a cross-session message
arrives that wasn't clearly meant for it. Coordinate with whoever else has hit this same
ambiguity (Hailey flagged TODO-87/TODO-83-style cross-session work already) rather than
designing it in isolation here.

## TODO-9

No defined protocol for what happens across the live persona fleet when this machine
reboots. Real precedent already on record: TODO-1's WSL2 test found a mid-execution reboot
can land a *sub-process* in a genuine partial state that survives the reboot untouched;
separately, this repo already has interrupted-*chezmoi-apply* detection (closed TODO-5,
`chezmoi-apply-marker.{ps1,sh}`) but nothing covering what a real Windows reboot does to
live Claude Code sessions, the persona registry's `sessionName` entries (stale the moment
the process dies), in-progress work across any of the four persona worktrees, or how a
session coming back up after a reboot should reconcile any of that.

**Status:** Open

**Priority:** Normal

**Type:** Targeted

**Area:** coordination

**Next action:** Define what "reboot protocol" actually needs to cover — likely at minimum:
(1) whether/how the persona registry self-heals stale `sessionName` entries after a reboot
rather than waiting for a peer's dead-peer sweep to catch it, (2) whether any in-progress
work needs a pre-reboot checkpoint convention, (3) what a session should check for on
first wake after a real reboot vs. a normal fresh start. Scope it before building anything.

## TODO-10

No defined protocol for swapping between session *surfaces* for the same persona/repo —
concretely, moving from individual VS Code windows to the "The Girls" Windows Terminal
fleet profile (now fully adopted, 2026-09-07) without leaving orphaned sessions, contested
`persona-registry.json` state, or unclear which surface is authoritative. The late-night
handoff scratchpad (`docs/scratchpad-2026-09-06-late-night-handoff.md`) already raised the
underlying coordination question — whether to run both surfaces at once or close one out
properly — and explicitly deferred it as BinaryMisfit's own call, not this session's to
make unilaterally. This TODO is that deferred question, tracked so it doesn't stay only in
a scratchpad meant to be temporary.

**Status:** Open

**Priority:** Normal

**Type:** Targeted

**Area:** coordination

**Next action:** Once the current VS Code→terminal-fleet swap actually finishes closing out
(see the three peers asked to run a real `hails-session-end` today), write down what
"closing properly" actually meant in practice as the first real worked example, then
generalize it into a repeatable session-swap protocol — worktree/session handoff, when a
nickname should be released vs. carried over, and how a human signals "this surface is now
authoritative" without it being inferred from context.
