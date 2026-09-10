# End-of-day playbook (generic starter — redesigned 2026-09-09, `TODO-100`)

Auto-copied into this repo's `docs/end-session-playbook.md` on the `hails-session-end`
skill's first run here. **This file is now this repo's own** — edit it freely as this
project's real end-of-day needs emerge.

**Much smaller than it used to be.** The notice-board check (always first) and the Final
step (read-back, reflect, write the marker and door state, always last) now live directly
in `hails-session-end`'s own `SKILL.md` — the file that's never copied. This file only holds
what's genuinely this repo's own: repo-specific steps that run **between** those two
structural bookends, and any augmentations to a structural step.

## Repo-specific steps (optional)

**This is where a project's own real end-of-day work goes**, once it's actually earned a
place here — not speculatively added on day one. A `hails-fiction-import` run, a repo-health
check, a drift check against another repo's own deployed config. Number them in the order
they should run; `hails-session-end`'s own `SKILL.md` runs them all after its structural
notice-board check and before its structural Final step. Empty by default — a fresh repo
with nothing here still gets a complete, correct close-out; it just goes straight from the
notice board to the marker.

## Augmentations (optional)

Same shape as `hails-session-start`'s own — real per-repo customization layered on top of a
structural step, not a replacement. Empty by default.
