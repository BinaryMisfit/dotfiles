# 0011 — Chezmoi's source directory can silently diverge from the working copy

Ran `chezmoi diff` (2026-08-31) to finish the paused apply from TODO-2 and found it about
to revert already-fixed live customizations — freshly added SSH `Host` blocks,
`switchModelsOnFlag`, `tui`, live permission grants — back to an older state. Traced it to
`chezmoi source-path` resolving to `~/.local/share/chezmoi`, a **separate git clone** from
whichever working copy of this repo was actually being edited (`D:\Source\binary-dotfiles`)
— 1 commit behind, plus a full session's worth of uncommitted template edits the source
directory had never seen at all. `chezmoi apply` always renders from the source directory,
never from an editor's working copy, so none of that session's in-progress work was
visible to it.

**Status:** Decided

**Decision:** before any `chezmoi diff`/`chezmoi apply` invocation on a machine where
these two locations can differ, commit and push pending changes in the working copy
first, then `git pull` inside `~/.local/share/chezmoi`, so the source directory is never
stale when a real live test runs. Documented directly in `CLAUDE.md`, not just here.

**Why:** `chezmoi update` (pull + apply against the source dir itself) does not fix this
— it does nothing for a working copy elsewhere on disk. Skipping this discipline can make
`apply` silently revert real, already-verified fixes back to whatever the stale source
last had, exactly what almost happened here.

**How to apply:** treat this as a standing pre-flight step, not a one-time fix — any
future session working this repo on this machine (or any machine with the same
two-checkout setup) commits + pushes + pulls the source dir before trusting a diff or
running an apply.
