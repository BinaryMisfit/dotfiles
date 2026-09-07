# Session start playbook

This repo's own copy of the `hails-session-start` routine — auto-copied in on that skill's
first run here, back when it was still `session-start`. **This file is this repo's own** —
edit it freely as this project's real conventions emerge; a later change to the generic
template it was originally copied from never overwrites it, and nothing here needs to stay
in sync with any other repo's copy. Brought current with the global template's real,
earned structural changes on 2026-09-07 (Step 0.5, the "Just greet me" path, the
scratchpad/two-actions rework, and a naming scrub — none of that was a divergence worth
keeping stale, just prose that stopped tracking a skill rename and three genuinely useful
mechanics). This repo's own real content — the secretary-pool drift check, the register
sweep shape — is untouched by that pass.

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
applies to the register/todo apparatus. Not yet earned here.

## "Just greet me" — a separate, lighter path, not this routine at a smaller size

If BinaryMisfit only wants the persona to open ("just say hi", "quick greeting", or opening
this skill and stopping short of a real check-in), that's Step 1 alone — the greeting,
naming the persona, no repo-cleanup/register/health/git-log work past it. Don't run the
rest of this routine just to produce that one line; nothing past Step 1 is owed unless
actually asked for.

## Timezone

**South Africa (SAST, UTC+2, no DST).** Every time-of-day judgment and git-log date
boundary below runs on this clock, not whatever timezone the environment's own system
clock happens to report. No reliable `TZ`-env path to compute this on this machine
(confirmed 2026-08-27 — no `Africa/Johannesburg` tzdata) — get real UTC (`date -u` /
`Get-Date -AsUTC -Format "u"`) and add 2 hours by hand, fresh, every time it matters. Never
trust a stale earlier-in-session read.

## Progress log (added 2026-09-06, wires in `session-start-log.js`)

Every step below reports its own outcome to `~/.claude/scripts/session-start-log.js` —
built and tested elsewhere in this system, wired into this specific playbook here. The
real problem it solves: this file is instructions to follow, not code with an enforced call
stack, so nothing about a plain run guarantees a step actually happened or lets a dead
session's rerun resume where it left off instead of redoing (or silently skipping) work.
**Not scoped to a calendar day — scoped to whether the last run for this `cwd` actually
completed**, since this routine can run more than once in one real day.

**Once, right after Step 0's `ListAgents` call resolves this session's own name:**
`node ~/.claude/scripts/session-start-log.js --begin --session "<name>"`. Its `resuming`
field in the JSON response tells you whether this is a fresh run (`false`) or picking up an
incomplete one (`true`). If resuming, check the returned `entry.steps` — any step already
`"status": "done"` is genuinely done, don't redo it or its report; re-run only a step
that's missing entirely, `"in-progress"` (died mid-step), or `"failed"` (explicitly
retryable).

**Before each numbered step below:** `--step-start "<n>"` (the step's own number as a
plain string — `"0"`, `"1"`, `"1.1"`, `"3.5"`, etc.). **After it finishes:** `--step-done
"<n>"` on a genuine success, or `--step-failed "<n>" --reason "..."` for something that
went wrong but a rerun should just try again. **Step 0's own identity-mismatch outcome is
`--step-blocked "0" --reason "..."` specifically, never `--step-failed`** — that step's
whole point is no auto-recovery, ever, and `blocked` is what keeps a plain rerun from
quietly retrying past it.

**Once the real last step below has reported a genuine outcome:** `--complete`. That's the
only thing that lets the *next* `--begin` for this `cwd` start clean instead of resuming —
don't skip it just because the run went smoothly.

This script never inspects or restricts what a step logs beyond its own status/reason — the
convention is "which steps ran," never "what they found." Nothing from Step 3.5's real
diff content, Step 4's actual register text, or anything else genuinely sensitive belongs
in a `--data` payload; a bare status is enough.

**A step this playbook says to "skip" still gets `--step-done "<n>"`** — with
`--data '{"skipped":"<one-word reason>"}'` if useful — not left unlogged. An unlogged step
and a genuinely-skipped one look identical to a resuming run otherwise, which would make it
try to run something that was correctly, deliberately skipped.

**Not safe under this file's own "dispatch as parallel Agent calls" technique named near
the top** — every write is an unlocked read-modify-write of one shared JSON file, so two
dispatched agents calling `--step-start`/`--step-done` themselves can race and silently
clobber each other's update. If Steps 2-4 ever actually grow into that technique here, only
the main orchestrating session calls this script for those steps' outcomes — a dispatched
agent reports its findings back in its own return value, never by calling
`session-start-log.js` itself.

## Step 0 — Identity gate

**Real incident this same week, elsewhere on this machine:** a dead-peer sweep deleted a
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
`--set-session-name` just touched). Match → `--step-done "0"`, proceed to Step 0.5.
**Mismatch → `session-start-log.js --step-blocked "0" --reason "<cwd> registry says X,
session is voicing Y>"`, then stop the entire routine here.** No auto-recovery, no
guessing, no proceeding "just this once" — surface the same mismatch plainly to the human
(this `cwd`, what the registry says, what's actually loaded) and wait for a real
`/hails-persona <name>` correction before continuing.

## Step 0.5 — Full repo cleanup, including the NSFW spot check

Merge `origin/main` forward, commit outstanding work, and push — every session start, not
just when something looks dirty. Nothing should sit stale or unpushed between sessions.

**Whether "commit" means finishing a genuinely dirty working tree, or only pushing what's
already committed is a judgment call in the moment, not a fixed rule** — but never a blind
`add -A` without actually looking at what's about to be committed.

**The NSFW/persona-leak spot check runs here, before the push** — catching a leak before it
goes out is the point, not after. If the global persona system is installed and this repo
has its own `docs/nsfw-comment-audit-playbook.md` (bootstrapped by `hails-nsfw-comment-audit`
on its own first run, if it hasn't run here yet), scan whatever's about to be pushed
(message bodies + diff) against that playbook's term list and approved exception path. Read
any hit's actual context before flagging it; a real finding gets named plainly and a
recommendation to run the full `hails-nsfw-comment-audit` skill before pushing, not fixed
inline here. If this repo has no `docs/nsfw-comment-audit-playbook.md` yet and no persona
session has ever run here, skip this sub-step silently — nothing to check yet.

A reported `CONFLICT` on the merge is never auto-resolved here, just surfaced plainly.

## Step 1 — Run `hails-persona-refresh`

Every persona-identity step — re-register, persona-file re-read, canon-check, day-state,
theme, color — runs here, via that skill. Its own "report back once, tersely, in
character" step is held, not printed here — the voice shows up once, folded into this
routine's own closing summary (Step 7 below), not as an upfront announcement before any
real content exists. The mechanics still run early (so the rest of this routine has fresh
identity/continuity data to work with); only the *telling* waits. Skip if no persona system
is installed.

This repo tracks that skill's own sub-mechanics as separate progress-log entries, since
they were already wired in at that granularity before the skill existed as a single
callable unit:

### Step 1.1 — Day-state note (continuity)

Read the previous end-of-day marker for this worktree, if one exists, and let it genuinely
inform how you open (mood, what to pick back up) rather than opening cold:

```bash
node ~/.claude/scripts/day-state.js --read --persona "<this persona's style name>"
```

If nothing's there yet, say nothing about it — a missing marker is a normal, common state.

### Step 1.2 — Draw or recall today's theme

```bash
node ~/.claude/scripts/theme-select.js --persona "<this persona's style name>"
```

Draws/recalls per THIS worktree (`cwd`, defaulted automatically), not per persona style —
two worktrees sharing a persona draw and weight independently. Reveal mechanism is a live
judgment call per the persona's own rules — never announced by default, always honest if
asked directly. Skip silently if the command reports nothing.

### Step 1.3 — Set today's color

```bash
node ~/.claude/scripts/pick-persona.js --set-color
```

Cheap and deterministic — reflects the day's actual continuity (via Step 1.1's marker)
instead of yesterday's. Safe to run even when nothing above found anything real.

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
skip this step; don't invent a check that doesn't exist. None exists here yet.

## Step 3.5 — secretary-pool-owned home-profile drift check (added 2026-09-02, ownership reassigned 2026-09-03)

This repo vendors the home-profile Claude Code config whose *content* authorship belongs
to `secretary-pool` (Hailey) — see CLAUDE.md's "Domain boundary" section,
[ADR 0018](adr/0018-canonical-home-profile-claude-source-and-full-skill-vendoring.md),
[ADR 0019](adr/0019-pick-persona-js-is-xls-owned-content.md), and
[ADR 0024](adr/0024-home-profile-claude-config-ownership-moves-to-secretary-pool.md) — a
blanket grant, not an enumerated file list: `rules/registers.instructions.md`,
`skills/hails-decision-register/`, the four persona
`output-styles/{hailey,alexia,aphrodite,callie}.md`,
`skills/{hails-session-start,hails-scratchpad-check,hails-persona,hails-nsfw-comment-audit,
hails-security-audit,hails-fiction-export,hails-fiction-import,hails-session-end,
hails-persona-refresh,hails-decision-register}/`, `scripts/executable_pick-persona.js`
(deployed as `~/.claude/scripts/pick-persona.js`), `scripts/render-html-to-png.js` +
`scripts/lib/headless-screenshot.js`, `scripts/executable_day-state.js`,
`scripts/lib/normalize-cwd.js`, `persona-colors.json`,
`scripts/executable_session-start-log.js`, `scripts/lib/themes-md.js`,
`scripts/executable_theme-select.js`, and anything else `secretary-pool` authors under
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
treat it as "nothing to report," treat it as the one thing Step 7 below needs to surface.

If a tracking doc does exist, read it fresh (never from memory of a prior run). **Fetch
before reading, since this repo has a remote** — `git fetch origin`, compare local HEAD to
`origin/main`: pull cleanly if it's a fast-forward (report that a pull happened and how much
it brought in), or read local anyway but flag prominently that it may be stale (and by how
many commits) if it isn't a clean fast-forward. Step 0.5 above will usually have already
made this moot by pushing/pulling first, but this repo has no other session running against
it at the moment this is written, so treat this as a cheap correctness check, not a
guaranteed no-op.

## Step 5 — Classify

For every item still Open/In-progress found in Step 4: sanity-check whether its priority
or blocked status still looks accurate given anything that's shipped or changed since it
was set. **Surface a suggested reclassification, never apply one silently** — the human
who set the priority is the one who gets to change it.

## Step 6 — Read the scratchpad

Look for a session-continuity scratchpad for this repo (the `hails-scratchpad-check` skill's
own territory — a file like `docs/scratchpad-<date>-*.md`, written when a prior session
signed off mid-thread rather than cleanly). If one exists, read it fresh — it's the closest
thing to "what was actually still moving when the lights went out," more concrete than
inferring intent from a register alone. If none exists, that's a normal, common state, not
a gap — say nothing about it and move to Step 7.

## Step 7 — Two concrete next actions, not three manufactured options

Surface exactly two real, traceable things:

1. **The highest-priority still-open item in the register** (from Step 4's fresh read) —
   whatever the human-set priority field actually says is most urgent, not a re-ranking of
   your own guessing.
2. **Whatever Step 6's scratchpad says was started but not finished** — the last real
   thread in motion, if the scratchpad names one. If there's no scratchpad, or it doesn't
   point at anything unfinished, this half is simply omitted rather than backfilled with a
   manufactured second option.

**Exception:** if Step 4 found no tracking doc at all, there's only one honest thing to
surface, not two: *"Set up `docs/todo-register.md` (or this project's own equivalent) and
populate it with real outstanding work."*

**This is the real last step.** Once it's reported (`--step-done "7"`), call
`node ~/.claude/scripts/session-start-log.js --complete` — the only thing that lets the
next `--begin` for this `cwd` start clean instead of resuming this one.

## Closing summary

This is where Step 1's held persona voice actually surfaces — one short, in-character beat
naming the persona explicitly (first time this session, per that persona's own file), woven
around the real content from Steps 2-7, not a separate greeting printed before any of it.
