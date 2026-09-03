# Session start playbook (generic starter)

Auto-copied into this repo's `docs/session-start-playbook.md` on the `session-start`
skill's first run here, because no project-specific playbook existed yet. **This file is
now this repo's own** — edit it freely as this project's real conventions emerge; a later
change to the generic template this was copied from will never overwrite it, and nothing
here needs to stay in sync with any other repo's copy.

For a worked example of how far this can grow with real, earned use over time (a pinned
timezone rule, a live hosted-service health check, a multi-register sweep with per-item
IDs) — not a template to copy wholesale, just evidence of the shape "grows through actual
use" can take — see the X-Lifestyle project's own `docs/session-start-playbook.md`.

**One specific technique worth naming, added 2026-08-29 once a repo actually needed it:**
once this playbook's own Steps 2-4 grow real weight — several submodules' worth of `git
log` in Step 2, several independent health checks in Step 3, several registers in Step 4 —
dispatch each heavy step as its own parallel `Agent` call instead of running it inline.
This keeps that step's raw intermediate output (full log dumps, raw check output, full
register text) out of the main session's own context; only the distilled report each step
already asks for comes back. See the X-Lifestyle project's own `docs/session-start-playbook.md`,
`## Step 1.5 — Dispatch the four checks in parallel`, for the real, proven shape (agent
count, `run_in_background: false` and why, the "don't call Agent inside Agent" rule, the
file-exclusivity check). **This is a technique to reach for once a step actually earns it
— not something to bake into this generic starter's own default steps below**, the same
"grow through real need, don't import complexity up front" reasoning this file already
applies to the register/todo apparatus.

## Timezone

**Not set yet.** Every time-of-day judgment and git-log date boundary below defaults to
UTC until this section is edited to name a real timezone (and, if it doesn't observe UTC
directly, the fixed offset to use — this project may not have a `TZ`-env-based way to
compute it reliably, the same trap X-Lifestyle's own playbook hit early on, so prefer
computing the offset by hand over trusting an unverified `TZ` variable).

## Step 1 — Persona greeting (skip if not applicable)

If the global persona system (`~/.claude/scripts/pick-persona.js`) is installed on this
machine, force whatever persona is already active for this session/worktree to actually
open with a real, in-character greeting that states its name explicitly — a persona never
opens unprompted on its own without an explicit trigger like this step. If no persona
system is installed, skip this step silently; don't invent a persona.

## Step 2 — Previous day summary

Real `git log` output, bounded to the previous full calendar day per the Timezone section
above — not a rolling "since N hours/days ago" window, which drifts with what time this
happens to run at. Summarize in plain prose what the day was about, not a raw commit
dump — cite specific commits only if something from the day's last action is genuinely
left outstanding and worth a pointer back to it.

If nothing landed the previous calendar day, say that plainly rather than stretching an
older day's work to fill the slot.

## Step 3 — Project-specific health check (optional)

If this project has its own health-check mechanism — a hosted service, a CI dashboard, a
deploy status — run it here and report only what's actually worth a line. If it doesn't,
skip this step; don't invent a check that doesn't exist.

## Step 3.5 — NSFW/persona-leak spot check (added 2026-08-28, skip if not applicable)

If the global persona system is installed (see Step 1) and this repo has its own
`docs/nsfw-comment-audit-playbook.md` (bootstrapped automatically by the standalone
`nsfw-comment-audit` skill on its own first run, if it hasn't run yet here), scan just the
previous calendar day's commits (message bodies + diff) against that playbook's term list
and approved exception path — this is real risk now that persona sessions can run
explicit/flirtatious "heat" language in ANY repo, not a check specific to one project.
Read any hit's actual context before flagging it; a real finding gets named plainly and a
recommendation to run the full `nsfw-comment-audit` skill, not fixed inline here. If this
repo has no `docs/nsfw-comment-audit-playbook.md` yet and no persona session has ever run
here, skip this step silently — nothing to check yet.

## Step 3.6 — secretary-pool-owned home-profile drift check (added 2026-09-02, ownership reassigned 2026-09-03)

This repo vendors the home-profile Claude Code config whose *content* authorship belongs
to `secretary-pool` (Hailey) — see CLAUDE.md's "Domain boundary" section,
[ADR 0018](adr/0018-canonical-home-profile-claude-source-and-full-skill-vendoring.md),
[ADR 0019](adr/0019-pick-persona-js-is-xls-owned-content.md), and
[ADR 0024](adr/0024-home-profile-claude-config-ownership-moves-to-secretary-pool.md) — a
blanket grant, not an enumerated file list: `rules/registers.instructions.md`,
`skills/decision-register/`, the four persona
`output-styles/{hailey,alexia,aphrodite,callie}.md`,
`skills/{session-start,scratchpad-check,persona,nsfw-comment-audit,security-audit,
fiction-export}/`, `scripts/executable_pick-persona.js` (deployed as
`~/.claude/scripts/pick-persona.js`), `scripts/render-html-to-png.js` +
`scripts/lib/headless-screenshot.js`, and anything else `secretary-pool` authors under
`~/.claude` going forward, without needing a fresh ADR each time a new file shows up.
`xls`'s domain is now `xcl` and its own modules only — no longer a source for this check.
`secretary-pool` syncs its own edits to this machine's live `~/.claude/` first; this repo's
`dot_claude/` copies can silently drift behind that deployed artifact between sessions —
`pick-persona.js` especially, since it's under active development there and this repo's
copy has historically gone stale for days at a time (ADR 0019).

**Diff `pick-persona.js` specifically before ever running an unscoped or forced `chezmoi
apply`** — confirmed the hard way (2026-09-02): a forced apply run to clear unrelated CRLF
drift on two persona files silently overwrote a newer, live-patched `pick-persona.js` with
this repo's stale tracked copy, deleting a real bug fix. `chezmoi apply -v`/`--force`
shows a full diff before writing; read it, don't just force through a hang.

Diff each of this repo's `dot_claude/` copies of those files against its corresponding
live file under `~/.claude/` (same relative path, stripping the chezmoi `dot_`/`private_`
prefix). For any file that differs, copy the **live `~/.claude/` version into this repo**
— never the reverse, and never touch any other file under `dot_claude/` this way, since
everything else in this repo flows the opposite direction (repo → `~/.claude/` via
`chezmoi apply`). If any file actually changed, stage just those files, commit (a plain,
factual message naming which file(s) synced and why), and push directly to `main` per this
repo's own branching/push policy — no PR, no confirmation needed for this specific,
narrowly-scoped sync, since it only ever pulls in `secretary-pool`'s own already-published
content into files `secretary-pool` already owns. If nothing drifted, say so plainly and
skip the commit.

**This direction (live `~/.claude/` → this repo) applies only to files genuinely authored
by `secretary-pool` under the home-profile surface — not to any other `dot_claude/` file.**
The file list above is illustrative of what's vendored today, not an exhaustive gate per
ADR 0024's blanket grant — but "blanket" still means "authored by secretary-pool," not
"anything found different under `~/.claude/`." A file this repo itself authors (this
playbook, `CLAUDE.md`, the ADRs, anything chezmoi-mechanics-specific) never flows this
direction; treating it the same way would silently invert this repo's normal
chezmoi-apply flow for it.

## Step 4 — Register/todo sweep

Look for this repo's own tracking doc — `docs/todo-register.md` is the conventional
default name, but use whatever this project has actually settled on if that's already
different. **If no such file exists at all, that absence is itself the finding** — don't
treat it as "nothing to report," treat it as the one thing Step 6 below needs to surface.

If a tracking doc does exist, read it fresh (never from memory of a prior run).

## Step 5 — Classify

For every item still Open/In-progress found in Step 4: sanity-check whether its priority
or blocked status still looks accurate given anything that's shipped or changed since it
was set. **Surface a suggested reclassification, never apply one silently** — the human
who set the priority is the one who gets to change it.

## Step 6 — Options, not a dump

From everything still genuinely open and unblocked, present **exactly three** concrete
candidates for what to start next, each with one line of *why this one* — not the whole
open list.

**Exception:** if Step 4 found no tracking doc at all, there's only one honest option,
not three manufactured ones: *"Set up `docs/todo-register.md` (or this project's own
equivalent) and populate it with real outstanding work."* Don't pad that out to three by
inventing filler.
