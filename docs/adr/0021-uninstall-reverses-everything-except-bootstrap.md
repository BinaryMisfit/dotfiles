# 0021 — Uninstall reverses everything except what bootstrap runs

[ADR 0020](0020-uninstall-script-scope-and-safety-defaults.md) deliberately excluded
installed packages (winget/Homebrew/apt) from the uninstall scripts entirely, reasoning
that a package manager can't reliably tell "this repo installed it" from "already present,
chezmoi also wanted it," and that reversing package installs risks breaking software
unrelated to this dotfiles setup. BinaryMisfit reviewed that scoping directly and gave an
explicit rule instead: **the only thing uninstall doesn't reverse is what `bootstrap.*`
itself runs — everything else this repo causes to exist on a machine, including installed
packages, is uninstall's job.**

**Status:** Decided — supersedes the package-exclusion portion of ADR 0020 specifically;
ADR 0020's dry-run-by-default and "print installed-package list rather than guess at
reversal" framing otherwise still stands as the general safety posture.

**Decision:** `uninstall.ps1`/`uninstall.sh` now reverse the full winget/npm package list
(Windows) and the full Homebrew/apt/npm/GitHub-release-binary list (macOS/Linux) under
`-Confirm`/`--confirm` — no separate opt-in flag for packages. The **only** permanent
exclusion is what `bootstrap.ps1`/`bootstrap.sh` itself directly produces: chezmoi's own
install and config/state (`~/.config/chezmoi/`), the `~/.local/share/chezmoi` source
clone, the age key (`~/.config/age/key.txt`), and the GitHub SSH key
(`~/.ssh/id_ed25519_github` + `.pub`) — confirmed by reading `bootstrap.ps1` directly:
it generates both keys itself (`age-keygen`, `ssh-keygen`), not a `run_once_*` script, so
both fall under "what bootstrap runs" cleanly. `run_once_setup-github-ssh.*.tmpl`
duplicates that SSH-key generation as an idempotent safety net for machines that skip
bootstrap — worth a closer look later (does bootstrap still need to generate it directly
if the run_once script already does?) but out of scope for this ADR.

Also folded in while doing this pass: the age key was missing from the *original* v1
script's "never touched" list entirely (an oversight, not a deliberate exclusion — see
ADR 0020's own text, which named the SSH key but never the age key). Fixed here.

**Why:** BinaryMisfit's own framing is cleaner than ADR 0020's tiered-risk model: instead
of guessing which categories of removal are "safe enough" to automate, draw the line at
provenance — bootstrap's own output stays, because reversing it means re-running bootstrap
(a deliberate, human-run action, not something uninstall should silently redo); everything
chezmoi/its downstream scripts caused gets reversed, full stop, because that's genuinely
everything this repo is responsible for adding to a machine.

**What got cut/kept:** Real risk that remains, named explicitly in the script's own
output rather than hidden: `Git.Git`, `OpenJS.NodeJS.LTS`, `Python.Python.3.14` (Windows)
and `curl`/`ca-certificates`/`gnupg` (Linux apt) are commonly relied on by software with no
relation to this repo. The Windows/macOS paths uninstall these under `-Confirm` like
everything else, flagged with a `[commonly relied on by other software]` marker in the
output. The Linux apt path goes one step further and does NOT auto-remove
`ca-certificates`/`curl`/`gnupg` even under `--confirm` — these are frequently pre-existing
system packages this repo didn't uniquely add, and apt removing them has a materially
higher chance of breaking unrelated system function than winget removing a per-user tool
on Windows. This is a real, deliberate inconsistency between the two scripts' otherwise
matching "reverse everything" rule, not an oversight — flagged plainly in the script's own
output so it's visible, not silent.

**How to apply:** Real `-Confirm`/`--confirm` execution is still untested everywhere (same
caveat as ADR 0020) — this ADR changes what the script WOULD do, not confirmation that
doing it works cleanly. TODO-1's own next action (real execution testing, ideally on
disposable machines) now carries materially higher stakes than before, since a real run now
uninstalls actual dev tools, not just config files.
