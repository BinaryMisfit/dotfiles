# 0020 — Uninstall script scope and safety defaults

TODO-1 asked for a real uninstall path reversing everything chezmoi manages on a machine.
Building it raised real scope questions: should it also uninstall the dev tools
`run_onchange_install-tools.*` installed via winget/Homebrew/apt? Should it delete the
GitHub SSH key `run_once_setup-github-ssh.*` generates? Getting either wrong is a real
data-loss or breakage risk, not a cosmetic one.

**Status:** Decided

**Decision:** `uninstall.ps1` / `uninstall.sh` (v1) are dry-run by default — they print
exactly what would be removed and touch nothing until `-Confirm`/`--confirm` is passed.
Three tiers:

1. **Managed dotfiles/directories** (git config, shell config, editor config, the whole
   chezmoi-owned slice of `~/.claude/`, etc.) — removed on `-Confirm`, since chezmoi is
   their sole owner and nothing else ever writes to them.
2. **One-time `run_once_*` side effects** (currently just the Windows nvim junction; the
   macOS iTerm2 integration file) — same, removed on `-Confirm`.
3. **The GitHub SSH key** (`~/.ssh/id_ed25519_github`) — a real credential, not
   chezmoi-managed state. Requires a *second*, explicit `-IncludeSSHKeys`/`--include-ssh-keys`
   flag on top of `-Confirm`. Never removed by a bare `-Confirm`.

**Installed packages (winget/Homebrew/apt) are explicitly NOT automated at all** — the
script only prints where the tool list lives and the manual uninstall command shape.
Reversing package installs can remove software the user relies on for reasons unrelated to
this dotfiles setup (a tool installed via the pinned list might now be a real dependency of
other work), and package managers don't reliably distinguish "this repo installed it" from
"already present, chezmoi just also wanted it." That's a judgment call per machine, not
something safe to script blindly.

**Why:** Uninstall scripts are inherently high-blast-radius — a bug or an overly broad
category costs real files, a real credential, or working software, and unlike most of this
repo's changes there's no `git diff`/`chezmoi diff` safety net once something's deleted.
Defaulting to dry-run and tiering risk (routine config → one-time side effects → real
credentials → left entirely to the human) matches the actual risk gradient instead of
treating "uninstall everything" as one flat operation.

**What got cut/kept:** Explicitly out of v1 scope, tracked separately: real execution
testing on macOS/Linux (that's [TODO-4](../todo-register.md#todo-4)'s job, not this one —
this ADR covers the Windows-verified dry-run and a syntax-checked POSIX dry-run under
git-bash on Windows, not a real macOS/Linux run). Shared inventory-walk logic between this
script and a future self-heal mechanism is tracked as the link between
[TODO-1](../todo-register.md#todo-1) and [TODO-5](../todo-register.md#todo-5) rather than
built now — premature to share code between the two before self-heal's own scope is
defined.

**How to apply:** Any new managed file/directory this repo starts tracking needs a matching
entry added to `$ManagedFiles`/`$ManagedDirs` (or their POSIX equivalents) in both
scripts — there's no automatic discovery from `docs/inventory-register.md`, so drift
between the inventory doc and these lists is a real risk worth checking periodically, not
a one-time sync.
