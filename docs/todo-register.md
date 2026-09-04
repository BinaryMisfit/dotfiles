# Todo Register

Concrete, actionable outstanding work for this repo. See
`~/.claude/rules/registers.instructions.md` for the convention: entries are one line
naming the action — real detail lives in the linked decision, doc, or design note, not
inline here.

| # | Item | Priority | Status | Type | Area | Raised | Touched |
|---|---|---|---|---|---|---|---|
| [TODO-1](#todo-1) | Build cross-platform uninstall script (Windows/macOS/Linux) | High | In progress | Targeted | chezmoi | 2026-08-30 | 2026-09-02 |
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

**Status:** In progress (2026-09-03) — all three detection tiers built, tested, and
verified live; only the fourth tier's design decision remains

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

**Landed for real, 2026-09-03, same day:** ran `chezmoi apply` on this machine — the
installer fired, appended the `hooks.apply.pre`/`post` block into the real
`~/.config/chezmoi/chezmoi.yaml` (verified: only the hooks block added, `encryption`/
`age`/`update`/`data` untouched), and a second `chezmoi apply` right after confirmed the
whole loop works silently end to end — marker set, marker cleared, exit 0, no hang, no
error. Re-ran `chezmoi-self-heal-check.ps1` against live state one more time: it now
reports **"clean -- no interrupted apply detected"** instead of "not active." Detection is
genuinely live, not just built.

One more real drift caught in the same pass, worth recording honestly: `pick-persona.js`
had moved again while this installer was being built (a `primary`/`isPrimary` domain-anchor
feature) — pulled before applying, so nothing live got destroyed.

**Status:** Detection (all three tiers, including interrupted-apply) is fully built, tested,
and verified live. Only the fourth self-heal tier (rebuild offer) remains undecided —
downgrading this from "In progress" is BinaryMisfit's call once he weighs in on that.

**Next action:** Decide the fourth tier's real trigger (what % drift, what "stale" means in
months) and whether it's ever automatic or always human-confirmed — given uninstall's own
package-removal scope, leaning toward "always confirmed, never automatic" but that's
BinaryMisfit's call. Decide whether/how the self-heal check gets scheduled (daily alongside
the same cadence the now-archived `chezmoi update` check job uses) now that all three built
tiers are real.
