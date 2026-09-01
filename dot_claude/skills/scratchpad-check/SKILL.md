---
name: scratchpad-check
description: Find and report every session-continuity scratchpad in the current project, on demand -- not bundled inside a bigger routine. Flags a scratchpad whose every section already reads resolved as an immediate fold-and-delete candidate, and flags one sitting outside this project's own documented centralization location (when it has one) as a placement violation. Use when the user asks to "check for scratchpads", "any stale scratchpads", "scratchpad check", when picking up a worktree that might have a stranded handoff note, or as a standalone substitute for a bigger session-start routine's own scratchpad sub-step.
---

# Scratchpad check

**This is a global skill**, available in every project on this machine, not just one repo.
It exists because a project's own session-start routine (if it has one) may bundle a
scratchpad check as one step inside a much bigger sweep -- fine for a daily coordinator run,
wrong for a quick "did I leave myself a note here" check mid-session or in a worktree that
never runs the full routine at all. This skill is that one step, standalone and cheap: no
git-log scan, no health check, no register sweep -- just scratchpads.

## What a "scratchpad" is here

A temporary "what to read first before picking this back up" note a session leaves for
itself or a successor -- not a spec, not a backlog, not a second source of truth for
anything a real doc already owns. Some projects document a specific convention for where
these live (a single centralized location, a required filename pattern); this skill honors
that convention when it exists and falls back to a generic pattern otherwise.

## Step 0 — Force a fresh persona read, if the persona system is installed (added 2026-09-01)

If `~/.claude/scripts/pick-persona.js` is installed, `Read` the active persona's own
`~/.claude/output-styles/<name>.md` file explicitly before doing anything else, and open
this skill's own output with one brief in-character line confirming that read happened —
this doubles as the standalone entry point for a persona refresh mid-session, the same
problem `session-start`'s own Step 1 fixed for its own routine (a running session sticking
with whatever the `SessionStart` hook injected at boot, even after the persona file
changed on disk since). If no persona system is installed, skip this step silently.

## Steps

1. **Determine the project root, AND whether this is one worktree among several.**
   `git rev-parse --show-toplevel` from the current directory for the project root itself.
   Then `git worktree list --porcelain` -- if it lists more than one worktree, this project
   uses multiple worktrees and each one is its own separate directory on disk, NOT nested
   under this one. **A scratchpad file in a sibling worktree is invisible to any glob rooted
   at this worktree's own path** -- confirmed live, 2026-08-30: running this check from a
   project's primary/root worktree only ever found that worktree's own scratchpad file, while
   six sibling worktrees each had their own (two with genuinely live, unresolved content) that
   a plain glob from root silently missed entirely. If other worktrees exist, repeat steps
   2-4 for each one's own path too (each worktree gets its own convention-detection pass in
   step 2 as well, in case they've diverged), and report per-worktree in step 5 -- don't
   silently scope to just the worktree this session happens to be running in when siblings
   exist and are reachable on disk.

2. **Check for a documented convention, and extract its actual filename pattern.** Read
   that root's own `CLAUDE.md` (or `AGENTS.md`/`README.md` if no `CLAUDE.md` exists) for the
   word "scratchpad". If it describes a specific location or filename rule (e.g. "always
   lives in this repo's own `docs/ai/`, never inside a module's own repo", naming an example
   like `docs/ai/session-scratchpad.md`), pull the actual filename token it uses (here,
   `session-scratchpad`) -- that's both the authoritative rule for step 4's placement check
   AND the pattern step 3 globs for. If nothing documents a convention, skip the placement
   check and fall back to the generic pattern in step 3.

3. **Find every scratchpad-shaped file, using the narrowest pattern that fits.** If step 2
   found a specific filename token, glob for that (`**/*session-scratchpad*.md` or whatever
   the doc actually names), not a bare `*scratchpad*.md` -- confirmed live, 2026-08-30, in
   the `xls` project itself: a bare `*scratchpad*.md` glob pulled in 25 unrelated
   `mod-scratchpad.md` files from one submodule's own per-mod corpus-tracking convention,
   which has nothing to do with session-continuity handoffs and would have been false-flagged
   as 25 placement violations. Only fall back to the generic `**/*scratchpad*.md` when step 2
   found no documented convention at all -- and when using that fallback, treat a large or
   patterned result (many files, same subdirectory, same naming shape) as a signal this is
   probably a different, project-specific convention rather than 25 genuine session-handoff
   notes -- say so plainly instead of reporting each one as a finding. Either glob excludes
   `node_modules`, `.git`, and any path that root's own docs mark as a read-only/upstream
   reference (e.g. an upstream submodule this project never authors into) -- a scratchpad
   found there isn't this project's own file to report on.

4. **For each file found, read it and report:**
   - **Resolved-looking** (every section/checklist item already reads as done, fixed,
     closed): flag as an immediate fold-and-delete candidate, not a "later" item -- a real
     incident already showed an all-resolved scratchpad can still be hiding a real doc that
     went stale underneath it, so "everything says done" is a signal to go verify and close
     it out, not a signal to ignore the file.
   - **Live** (has an actual unresolved section): report its title, the unresolved section
     headers, and how old it looks (file mtime or a date in its own text if present) -- this
     is the pickup note, so surface enough to actually act on it.
   - **Misplaced** (step 2 found a convention and this file doesn't match it): flag
     separately, quoting the rule it violates.

5. **Return a short structured list only** -- file path, status (resolved / live /
   misplaced), one line of why. When multiple worktrees were checked (step 1), group by
   worktree so it's obvious at a glance which ones actually have something waiting, not one
   flat list a reader has to re-sort mentally. Do not dump full file contents into the report
   unless the user asks for one specific file's detail.

## Not this skill's job

- **Doing the fold.** Moving a resolved scratchpad's surviving content into whichever real
  doc owns it, verifying that doc is still current, and deleting the scratchpad is a real
  judgment call (which doc, is the content still true) -- this skill surfaces the candidate,
  it doesn't execute the fold.
- **Inventing a scratchpad convention a project never documented.** No convention found in
  step 2 means no placement judgment gets made -- report resolved/live status only.
- **Replacing a project's own full session-start routine**, if it has one -- this is the
  piece that routine can call standalone, not a competing routine.
