# 0004 — Every removal ships with a scripted cleanup; a full uninstall path is required

Set by BinaryMisfit (2026-08-30) as a standing policy for this repo, prompted by the
existing `run_once_after_remove-{mise,scoop-mise}` precedent working well when mise/scoop
were dropped — but that pattern was applied ad hoc, not as a rule. Nothing currently
requires it going forward, and nothing lets a user leave chezmoi's management entirely
without hand-reversing every dotfile and installed tool themselves.

**Status:** Decided

**Decision:**
1. Any change to this repo that removes a tool, config file, target path, or setting from
   what a machine previously had applied **must ship with a scripted cleanup** in the same
   change — a `run_once_after_remove-*` script (or equivalent) that undoes the removed
   thing automatically the next time an affected machine runs `chezmoi apply`. A removal
   with no cleanup script is an incomplete change, not a smaller one.
2. This applies to `bootstrap.{sh,ps1}` too — if bootstrap stops installing or configuring
   something it used to, that removal needs the same scripted cleanup treatment, not just
   a quiet edit to what bootstrap does going forward.
3. A cross-platform **uninstall script** (Windows, macOS, Linux) must exist that reverses
   everything chezmoi has applied to a machine — every managed dotfile, every tool
   `run_onchange_install-tools` installed, every `run_once_*` side effect (SSH keys,
   junctions, shell integrations) — while leaving **chezmoi itself and the cloned repo
   intact**. Running it should return a machine to its pre-dotfiles state, minus chezmoi
   and the source checkout, so the user can still re-apply or fully remove chezmoi
   separately afterward.

**Why:** a dotfiles repo that only knows how to add and update, never to cleanly retract,
accumulates dead weight the moment any tool or approach gets replaced — [ADR 0003](0003-drop-private-prefix-from-npmrc.md)-scale
cleanups so far have been small; nothing has forced discipline at removal time for
anything bigger. It also means there's currently no tested path off this setup at all
short of manually undoing dozens of files by hand.

**How to apply:**
- Any future removal PR/commit is incomplete without its paired cleanup script — treat it
  the same as an untested change.
- The three-platform uninstall script is real, outstanding work — see
  [`docs/todo-register.md`](../todo-register.md), `TODO-1`.

**What got cut/kept:** considered leaving cleanup as case-by-case judgment (status quo) —
rejected because the mise/scoop precedent only happened to get one; nothing stops the next
removal from skipping it without a stated rule.
