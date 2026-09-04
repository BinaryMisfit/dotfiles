---
name: hails-worktree-sync-check
description: Check on demand whether this worktree's own umbrella branch, and its home submodule's branch if it has one, are behind their respective origin/main -- instead of waiting for the parent worktree to notice and notify. Use when the user asks to "check if I'm behind main", "am I synced", "worktree sync check", or when picking up a worktree session after time away and wanting to know before doing any real work whether it's current.
---

# Worktree sync check

**This is a global skill**, available in every project on this machine, not just one repo.
It exists because a worktree's own branch never moves on its own just because the parent
worktree pushed somewhere -- a real incident, 2026-08-30 (`xls`'s own `docs/decision-register.md`,
DEC-18): the parent pushed six commits and had to hand-notify five standing child worktrees
one by one; a sixth asked why its own fetch found nothing. This skill is the check a child
can run itself, on demand, rather than waiting to be told.

## What this checks, and what it doesn't

A **pure git-state comparison** -- ahead/behind/diverged against the branch this worktree
would land into. It does not fetch cross-session state, does not know about `SendMessage` or
scratchpads, and does not merge or pull anything itself. It answers one question: is there
something to pull, and if so, from where.

## Steps

1. **Fetch first, always** -- `git fetch` (all configured remotes) from the current
   worktree's umbrella checkout, so the comparison below reflects the real remote state, not
   a stale local view of it.

2. **Compare the umbrella branch.** `git rev-parse --abbrev-ref HEAD` for the current branch,
   then `git log --oneline HEAD..origin/main` (behind) and `git log --oneline origin/main..HEAD`
   (ahead). Report both counts plainly -- "3 behind, 0 ahead" is a clean pull; "0 behind, 2
   ahead" means this worktree has its own unlanded work; "N behind, M ahead (both non-zero)"
   is a genuine divergence, flag it as one rather than suggesting a plain fast-forward.

3. **If this worktree has a home submodule** (per `docs/decision-register.md`'s DEC-18 --
   read that project's own `.claude/skills/new-worktree/SKILL.md` for the worktree-name-to-
   submodule mapping if one exists; skip this step entirely for a project with no such
   convention documented), repeat step 2 from inside that submodule's own checkout against
   ITS OWN `origin/main` -- a submodule's remote state is independent of the umbrella's.

4. **Report a short summary only** -- branch name, behind/ahead counts, and one line of what
   to actually do (`git merge origin/main` / `git merge origin/main --ff-only` / "diverged,
   needs a real decision" / "clean, nothing to do"). Don't dump the actual commit list unless
   the user asks for it.

## Not this skill's job

- **Doing the pull/merge itself.** This reports state; per DEC-18's own rule, whether a
  fast-forward is safe to just run is the caller's call (a home-submodule merge is generally
  safe to just do; an umbrella merge with real local divergence is not).
- **Cross-session coordination.** It doesn't call `ListAgents`, doesn't `SendMessage` anyone,
  doesn't know whether a peer session is mid-work on the branch it's comparing against --
  that's a human/agent judgment call layered on top of this skill's plain git-state report,
  not something this skill infers.
- **Inventing a home-submodule mapping a project never documented.** No such convention found
  in step 3 means step 3 is skipped entirely, not guessed at.
