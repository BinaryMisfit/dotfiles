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

## Progress log (added 2026-09-06, wires in `session-start-log.js`)

Every step below reports its own outcome to `~/.claude/scripts/session-start-log.js` —
built and tested elsewhere in this system, wired into this specific playbook here. The
real problem it solves: this file is instructions to follow, not code with an enforced call
stack, so nothing about a plain run guarantees a step actually happened or lets a dead
session's rerun resume where it left off instead of redoing (or silently skipping) work.

**Once, right after Step 0's `ListAgents` call resolves this session's own name:**
`node ~/.claude/scripts/session-start-log.js --begin --session "<name>"`. Its `resuming`
field in the JSON response tells you whether this is a fresh run (`false`) or picking up an
incomplete one (`true`). If resuming, check the returned `entry.steps` — any step already
`"status": "done"` is genuinely done, don't redo it or its report; re-run only a step
that's missing entirely, `"in-progress"` (died mid-step), or `"failed"` (explicitly
retryable).

**Before each numbered step below:** `--step-start "<n>"` (the step's own number as a
plain string — `"0"`, `"1"`, `"1.1"`, `"3.6"`, etc.). **After it finishes:** `--step-done
"<n>"` on a genuine success, or `--step-failed "<n>" --reason "..."` for something that
went wrong but a rerun should just try again. **Step 0's own identity-mismatch outcome is
`--step-blocked "0" --reason "..."` specifically, never `--step-failed`** — that step's
whole point is no auto-recovery, ever, and `blocked` is what keeps a plain rerun from
quietly retrying past it.

**Once the real last step below has reported a genuine outcome:** `--complete`. That's the
only thing that lets the *next* `--begin` for this `cwd` start clean instead of resuming —
don't skip it just because the run went smoothly.

This script never inspects or restricts what a step logs beyond its own status/reason — the
convention is "which steps ran," never "what they found." Nothing from Step 3.6's real
diff content, Step 4's actual register text, or anything else genuinely sensitive belongs
in a `--data` payload; a bare status is enough.

**A step this playbook says to "skip" still gets `--step-done "<n>"`** — with
`--data '{"skipped":"<one-word reason>"}'` if useful — not left unlogged. An unlogged step
and a genuinely-skipped one look identical to a resuming run otherwise, which would make it
try to run something that was correctly, deliberately skipped.

## Step 0 — Identity gate (added 2026-09-06, split out of the old Step 1)

**Real incident this same day, elsewhere on this machine:** a dead-peer sweep deleted a
Perm-pinned registry entry (fixed separately — `isForeverPinned` vs `everOpened`, see
`pick-persona.js`), and the mismatch between what a session was actually voicing and what
the registry said sat undetected across multiple sessions until a human caught the wrong
voice out loud. This step exists so that never happens silently again, here or anywhere
this playbook's pattern gets reused.

Skip this whole step silently if the global persona system (`~/.claude/scripts/pick-persona.js`)
isn't installed — don't invent a persona or a registry that isn't there.

Before anything else in this routine: call `ListAgents`, read this session's own name off
its "This session is `<name>`" line, self-register it (`node ~/.claude/scripts/pick-persona.js
--set-session-name "<name>"` from this repo's root), and sweep dead peers off that same
call (join every live peer's name from the same `ListAgents` result with commas, or `""` if
there are none, then `node ~/.claude/scripts/pick-persona.js --sweep-dead "<comma-separated
live names>"`, same root). Relay the sweep's output only if it actually removed or cleared
something — "nothing stale, nothing to report" needs no line of its own.

**This is also where the progress log's own `--begin --session "<name>"` call happens** —
see "Progress log" above for the full mechanics (resuming an incomplete run, skipping
already-`done` steps). Then `--step-start "0"` for this step itself.

Then **compare this session's live persona** (this project's own `.claude/settings.local.json`'s
`outputStyle` field) **against what the registry says for this `cwd`** (the entry
`--set-session-name` just touched). Match → `--step-done "0"`, proceed to Step 1.
**Mismatch → `session-start-log.js --step-blocked "0" --reason "<cwd> registry says X,
session is voicing Y>"`, then stop the entire routine here.** No auto-recovery, no
guessing, no proceeding "just this once" — surface the same mismatch plainly to the human
(this `cwd`, what the registry says, what's actually loaded) and wait for a real
`/hails-persona <name>` correction before continuing.

## Step 1 — Persona greeting (skip if not applicable)

Only reached once Step 0 has confirmed identity actually matches (or been skipped because
the persona system isn't installed). Force whatever persona is already active for this
session/worktree to actually open with a real, in-character greeting that states its name
explicitly — a persona never opens unprompted on its own without an explicit trigger like
this step. If no persona system is installed, skip this step silently too.

**Force a fresh read of the persona file itself before writing that greeting.** A running
session tends to stick with whatever the `SessionStart` hook injected at boot, even after
the persona file gets edited mid-session — `Read ~/.claude/output-styles/<active-persona>.md`
explicitly every time this step runs, don't rely on cached context from hours ago. The
greeting is the confirmation: it should read as genuinely current, not just in-character.

## Step 1.1 — Day-state note (continuity)

**Deliberately NOT part of the automatic `SessionStart` hook (2026-09-03, BinaryMisfit's
own design call).** The hook fires on EVERY session, including a one-question-and-close
session that never runs this skill at all -- it stays fast and minimal on purpose: set the
persona, read its file, nothing else. This skill is different: BinaryMisfit runs it, by
hand, every real work session, so anything with real weight -- continuity, theme, color --
belongs here, load-bearing on a habit that's actually load-bearing, not bolted onto a hook
that has to stay cheap for a session that might never need any of it.

If the global persona system is installed, read the previous end-of-day marker for this
worktree, if one exists, and let it genuinely inform how you open (mood, what to pick back
up) rather than opening cold:

```bash
node ~/.claude/scripts/day-state.js --read
```

If nothing's there yet (day one, or the `end-session` skill was never run last time), say
nothing about it -- a missing marker is a normal, common state, not a gap to apologize for.

## Step 1.2 — Draw or recall today's theme

If the global persona/themes-register system is installed on this machine, draw (or recall
today's already-drawn) theme for this persona:

```bash
node ~/.claude/scripts/theme-select.js --persona "<this persona's style name>"
```

Draws/recalls per THIS worktree (`cwd`, defaulted automatically -- no flag needed when run
from here), not per persona style -- a real design correction, 2026-09-03, once simultaneous
live instances of one persona stopped being theoretical. Two worktrees sharing a persona now
draw and weight independently; `themes.md` itself is pure authored pool data, never written
by this command.

Reveal mechanism (announce it, let it surface unprompted, or keep it fully hidden) is your
own live judgment call, per the persona/design-doc's own rules -- never announced by
default, but always a real, honest answer if BinaryMisfit asks directly what today's theme
is. Skip silently if the command reports nothing (no research repo present on this machine,
or no themes exist yet for this persona) -- that's an expected, common state.

## Step 1.3 — Set today's color

```bash
node ~/.claude/scripts/pick-persona.js --set-color
```

Cheap and deterministic, no judgment involved -- makes this window's title/statusbar color
reflect the day's actual continuity (via Step 1.1's marker) instead of yesterday's, or the
plain date-hash fallback if no marker exists yet. Safe to run even when nothing above found
anything real to report.

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

**This is the real last step.** Once it's reported (`--step-done "6"`), call
`node ~/.claude/scripts/session-start-log.js --complete` — the only thing that lets the
next `--begin` for this `cwd` start clean instead of resuming this one.
