# Session start playbook (generic starter — redesigned 2026-09-09, `TODO-100`)

Auto-copied into this repo's `docs/session-start-playbook.md` on the `hails-session-start`
skill's first run here. **This file is now this repo's own** — edit it freely as this
project's real conventions emerge.

**Much smaller than it used to be.** Every step that never actually varied repo to repo now
lives directly in `hails-session-start`'s own `SKILL.md` — the one file that's never copied,
so a structural fix there reaches every repo instantly instead of needing to be hand-ported
into every fork. This file only holds what's genuinely this repo's own: the timezone, an
optional health check, and anything real this repo earns over time. See that skill's own
`SKILL.md` for the full structural routine (Steps 0 through 8) — don't duplicate it here.

## Timezone

**Not set yet.** Every time-of-day judgment and git-log date boundary in the structural
routine defaults to UTC until this section names a real timezone (and, if it doesn't
observe UTC directly, the fixed offset to use).

## Step 3 — Project-specific health check (optional)

If this project has its own health-check mechanism — a hosted service, a CI dashboard, a
deploy status — describe it here. If it doesn't, leave this section empty; the structural
routine skips it cleanly.

## Augmentations (optional)

Real per-repo customization layered on top of a structural step, not a replacement for it.
Two shapes: **scope** (which paths/submodules/registers a step covers, beyond the default)
and **execution style** (opting a step into the parallel-`Agent`-dispatch technique once its
own output volume earns it — see `SKILL.md`'s own note under Step 4). Name the step number
and the augmentation plainly. Empty by default — a fresh repo hasn't earned any yet.

## Additional bespoke steps (optional)

Something this repo earned that isn't a variant of any structural step at all — a standing
cadence commitment, a drift check against another repo's own deployed config. Name exactly
where it inserts (e.g., "after Step 0.5" or "after Step 7, as a standing reminder"). Empty
by default — don't invent one speculatively; the trigger is real, earned need.
