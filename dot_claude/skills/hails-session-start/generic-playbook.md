# Session start playbook (generic starter)

Auto-copied into this repo's `docs/session-start-playbook.md` on the `hails-session-start`
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

## "Just greet me" — a separate, lighter path, not this routine at a smaller size

If the user only wants the persona to open ("just say hi", "quick greeting", or opening
this skill and stopping short of a real check-in), that's Step 1 alone — the greeting,
naming the persona, no register/health/git-log work past it. Don't run the rest of this
routine just to produce that one line; nothing past Step 1 is owed unless actually asked
for. (Added 2026-09-02, a real gap found live in X-Lifestyle's own copy of this routine —
see its own `docs/session-start-playbook.md` for the fuller version of this, including why
it matters more once a session's client collapses visible output to the final message.)

## Timezone

**Not set yet.** Every time-of-day judgment and git-log date boundary below defaults to
UTC until this section is edited to name a real timezone (and, if it doesn't observe UTC
directly, the fixed offset to use — this project may not have a `TZ`-env-based way to
compute it reliably, the same trap X-Lifestyle's own playbook hit early on, so prefer
computing the offset by hand over trusting an unverified `TZ` variable).

## Step 0 — Identity gate (added 2026-09-06, replaces the old Step 1 self-register/sweep sub-bullets)

**Real incident, same day:** a dead-peer sweep deleted Perm-pinned registry entries
(fixed separately, `isForeverPinned` vs `everOpened` — see `pick-persona.js`), and the
mismatch between what a session was actually voicing and what the registry said sat
undetected for the better part of an hour, across three sessions, before a human caught it
by noticing the wrong voice out loud. This step exists so that never happens silently again.

Before anything else in this routine: call `ListAgents`, read this session's own name off
its "This session is `<name>`" line, self-register it (`node ~/.claude/scripts/pick-persona.js
--set-session-name "<name>"`), and sweep dead peers off that same call
(`node ~/.claude/scripts/pick-persona.js --sweep-dead "<comma-separated live names>"`,
`""` if none) — same mechanics the old Step 1 ran, just moved here since they're registry
work, not greeting work. Skip this whole step silently if the global persona system isn't
installed.

Then **compare this session's live persona** (`.claude/settings.local.json`'s `outputStyle`
field) **against what the registry says for this cwd** (the entry `--set-session-name` just
touched). Match → proceed to Step 0.5. **Mismatch → stop the entire routine here.** No
auto-recovery for this one, ever — BinaryMisfit's own explicit call, 2026-09-06: if it's
broken, only a human fixes it. Surface plainly (this cwd, what the registry says, what's
actually loaded) and wait for a real `/hails-persona <name>` correction before continuing;
don't guess, don't self-heal, don't proceed "just this once."

## Step 0.5 — Full repo cleanup, including the NSFW spot check (reworked 2026-09-06, was "sync worktree branches forward")

Merge `origin/main` (or this project's default branch) forward, commit outstanding work,
and push — on the active branch, submodules included, every session start, not just when
worktrees are in play. BinaryMisfit's own framing: this operates a level higher than
tracking any one worktree's own drift, so it replaces the narrower worktree-only sync this
step used to do — nothing should ever sit stale or unpushed between sessions again,
worktree or plain clone alike. **Retires `hails-worktree-sync-check` outright** (removed
2026-09-06) — that skill existed only because nothing else checked drift automatically;
BinaryMisfit's own words, it "creates a manual task I haven't had the discipline to
perform," and this step now does the same job as an unskippable default instead of an
on-demand chore nobody remembered to run.

**Whether "commit" means finishing a genuinely dirty working tree, or only pushing what's
already committed: judgment call for whoever's actually running it, in the moment — not a
fixed rule** (BinaryMisfit's own correction, 2026-09-06, replacing the earlier "treat it as
X until told otherwise" placeholder). Still never blind `add -A` without looking at what's
about to be committed — that discipline doesn't loosen just because the call is a judgment
one now.

**The NSFW/persona-leak spot check (old standalone Step 3.5) runs here now, before the
push** (moved 2026-09-06, BinaryMisfit's own call) — catching a leak before it goes out is
the actual point, not after. If the global persona system is installed and this repo has
its own `docs/nsfw-comment-audit-playbook.md` (bootstrapped by `hails-nsfw-comment-audit`
on its own first run, if it hasn't run here yet), scan whatever's about to be pushed
(message bodies + diff) against that playbook's term list and approved exception path.
Read any hit's actual context before flagging it; a real finding gets named plainly and a
recommendation to run the full `hails-nsfw-comment-audit` skill before pushing, not fixed
inline here. If this repo has no `docs/nsfw-comment-audit-playbook.md` yet and no persona
session has ever run here, skip this sub-step silently — nothing to check yet.

A reported `CONFLICT` on the merge is never auto-resolved here, just surfaced plainly. If
this project has no git remote at all, skip this step silently.

## Step 1 — Run `hails-persona-refresh` (reworked 2026-09-06)

**Session-start now auto-chains into persona-refresh** (BinaryMisfit's own call,
overriding this doc's earlier "defaulting to separate" placeholder) — every persona-
identity step (re-register, persona-file re-read, canon-check, day-state, theme, color)
runs here, mechanically, via that skill. What changes from running it standalone: **its own
"report back once, tersely, in character" step is held, not printed here** — the voice
shows up once, folded into this routine's own closing summary (Step 6/7 below), not as an
upfront announcement before any real content exists. Dropped as the lead per BinaryMisfit's
own call ("noise I never see, more relevant later") — the mechanics still run early (so the
rest of this routine has fresh identity/continuity data to work with), the *telling* just
waits. Skip if no persona system is installed.

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

## Step 4 — Register/todo sweep

Look for this repo's own tracking doc — `docs/todo-register.md` is the conventional
default name, but use whatever this project has actually settled on if that's already
different. **If no such file exists at all, that absence is itself the finding** — don't
treat it as "nothing to report," treat it as the one thing Step 6 below needs to surface.

If a tracking doc does exist, read it fresh (never from memory of a prior run).

**Fetch before reading, if this repo is a git repo with a remote (added 2026-09-01, a real
gap found live in X-Lifestyle's own copy of this routine).** "Read it fresh" means fresh
against what's actually on the remote, not just fresh-vs-memory — a tracking doc read
straight off local disk can silently misreport an item as still open when a peer already
closed and pushed it elsewhere. `git fetch origin`, compare local HEAD to
`origin/<branch>`: pull cleanly if it's a fast-forward (report that a pull happened and how
much it brought in), or read local anyway but flag prominently that it may be stale (and by
how many commits) if it isn't a clean fast-forward. See X-Lifestyle's own
`docs/session-start-playbook.md`, Step 4, for the fuller worked version of this once a repo
actually has real multi-session/multi-worktree traffic to worry about.

## Step 5 — Classify

For every item still Open/In-progress found in Step 4: sanity-check whether its priority
or blocked status still looks accurate given anything that's shipped or changed since it
was set. **Surface a suggested reclassification, never apply one silently** — the human
who set the priority is the one who gets to change it.

## Step 6 — Read the scratchpad (replaces the old "three options" framing, 2026-09-06)

Look for a session-continuity scratchpad for this repo (the `hails-scratchpad-check` skill's
own territory — a file like `docs/scratchpad-<date>-*.md`, written when a prior session
signed off mid-thread rather than cleanly). If one exists, read it fresh — it's the closest
thing to "what was actually still moving when the lights went out," more concrete than
inferring intent from a register alone. If none exists, that's a normal, common state, not
a gap — say nothing about it and move to Step 7.

## Step 7 — Two concrete next actions, not three manufactured options (replaces the old Step 6, 2026-09-06)

BinaryMisfit's own correction: stop presenting three generated candidates and instead
surface exactly two real, traceable things:

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

## Closing summary

This is where Step 1's held persona voice actually surfaces — one short, in-character beat
naming the persona explicitly (first time this session, per that persona's own file), woven
around the real content from Steps 2-7, not a separate greeting printed before any of it.
