---
name: hails-session-start
description: Start-of-session routine -- forces today's already-active persona to actually greet you (not left to chance, never re-rolled), summarizes the previous calendar day's real work, runs any project-specific health check that repo has wired up, sweeps that repo's own todo/register tracking, flags anything whose priority or blocked status looks stale, checks the-house's notice board, and hands back concrete next actions. On a repo that has never run this before, bootstraps a starter playbook instead of failing. Use when the user runs /hails-session-start, asks to "start the session", "run the hails-session-start routine", or "what should I work on".
---

# Session start

**This is a global skill** (promoted 2026-08-28 from an X-Lifestyle-only project skill to
`~/.claude/skills/hails-session-start/`, renamed from `morning-start` the same day once it became
clear this doesn't only run in the morning) — available in every project on this machine,
not just X-Lifestyle ones.

**Structural steps are owned here, directly, not delegated to a per-repo playbook (redesigned
2026-09-09, `TODO-100` — Aphrodite's own audit finding).** Every earlier version of this
skill deferred everything, including steps that never actually varied repo to repo, to
`docs/session-start-playbook.md`. That worked until a structural fix (a chain-hardening
requirement, the notice-board wiring) needed to reach every repo at once and had no path
back into an already-forked playbook except someone remembering to hand-port it — proven
wrong twice the same night this redesign happened. The fix: the steps below that are
genuinely identical everywhere live in this file, which is never copied and always read
fresh. Only what's actually repo-specific lives in the playbook now — see "What the playbook
still holds" below.

## Gate — confirm before running, in voice (added 2026-09-08, BinaryMisfit's own ask)

**Before anything else. Before Step 0. Before a single file gets touched — no matter what
triggered this skill:** a real `/hails-session-start`, a plain-language ask, or something
else in the conversation invoking it on its own. This routine does real things — a register
sweep, a full repo sync and push, reclassification flags — and BinaryMisfit has hit real
cases of it firing when he didn't actually want it: once from something else in the
conversation triggering it, once from his own accidental invocation, with no way to back out
once it was already moving.

State, in one line, in the active persona's own voice, what's actually about to happen —
plain English, not step numbers ("full session-start — register sweep, repo sync and push,
next actions") — and ask a real go-ahead. **Do not proceed past this line without an
explicit, unambiguous yes in his own reply.** Not silence, not a reply about something else,
not treating the invocation itself as consent. Anything short of a clear yes — "no," "wait,"
"didn't mean that," or just not answering the ask — ends it right here: nothing written,
nothing pushed, nothing swept. Say plainly that it stopped and why.

**Exception:** the "just greet me" path below has no side effects and needs no gate — only
the full routine (Step 0 onward) does.

**If something other than BinaryMisfit typing the command triggered this** — another skill,
an agent, a chained routine — the gate still applies exactly the same. Whatever invoked this
doesn't get to consent on his behalf; the checkpoint is for him.

## "Just greet me" — a separate, lighter path, not this routine at a smaller size

If the user only wants the persona to open ("just say hi", "quick greeting", or opening this
skill and stopping short of a real check-in), that's Step 1 alone — the greeting, naming the
persona, no register/health/git-log work past it. Don't run the rest of this routine just to
produce that one line; nothing past Step 1 is owed unless actually asked for.

## Playbook check — does this repo have its own playbook file yet?

**Check for `docs/session-start-playbook.md` in the CURRENT project before anything else.**
Its job now is much smaller than it used to be — see "What the playbook still holds" below.

- **If it exists:** read it fresh, every time. It supplies the Timezone, Step 3's own
  health-check content (if this repo has earned one), any augmentations to a structural step
  below, and any additional bespoke steps this repo has earned at their own named insertion
  points. **Never overwrite an existing project playbook with the generic template below,
  even if that template itself changes later** — once a repo has its own copy, it's that
  repo's to diverge, permanently. This still holds; what changed is how much there now is to
  diverge *in*.
- **If it does NOT exist:** copy this skill's own bundled `generic-playbook.md` (always
  present at `~/.claude/skills/hails-session-start/generic-playbook.md`) to
  `docs/session-start-playbook.md` (creating `docs/` first if needed), tell the user plainly
  once that this happened, then proceed to run the structural routine below for this first
  session too — a fresh repo with no Step 3 content and no augmentations still gets a real,
  complete run of everything structural.

## What the playbook still holds (redesigned 2026-09-09)

- **Timezone.** Every time-of-day judgment and git-log date boundary below runs on whatever
  timezone the playbook names — default UTC if it says nothing, same as before.
- **Step 3's own content** — a project-specific health check, entirely optional, entirely
  this repo's own judgment about what "health" means here. Absent by default.
- **Augmentations to a structural step** — real per-repo customization layered *on top of*
  a structural step below, not replacing it (added 2026-09-09, Aphrodite's own catch: the
  first version of this redesign only had "structural" and "repo-earned" as options, and
  that flattened real work like `xls`'s own parallel-dispatch of its register sweep into
  neither box cleanly). Two concrete shapes this can take, named in the playbook against
  the step it modifies:
  - **Scope** — which paths/submodules/registers a step actually covers, beyond this
    skill's own default (e.g., "Step 2 also covers `modules/x-lifestyle-core`,
    `research/x-lifestyle-research`" or "Step 4 sweeps every repo under this tree, not just
    this one").
  - **Execution style** — opting a step into the parallel-`Agent`-dispatch technique once
    its own raw output volume earns it (see the note under Step 4 below). The step's own
    logic and requirements don't change; only how it's actually run does.
- **Additional bespoke steps** — something this repo earned that isn't a variant of any
  structural step below at all (a daily lore-walkthrough check, a drift-check against
  another repo's own deployed config). The playbook names exactly where it inserts (e.g.,
  "after Step 0.5" or "after Step 7, as a standing reminder not counted against the next-
  actions cap") and this routine honors that insertion point when it reaches it.

## The structural routine — same steps, same order, every repo, always

**Progress log, every step below reports through it.** `node
~/.claude/scripts/session-start-log.js` is the tested backing state for this whole routine —
a skill is instructions read and followed, not code with an enforced call stack, so nothing
here *guarantees* a step ran unless it's written down. **Scoped to whether the last run for
this cwd actually completed, not to a calendar day** (this can run more than once in one real
day).

1. As soon as this step's own `ListAgents` call resolves this session's own name, run
   `node ~/.claude/scripts/session-start-log.js --begin --session "<name>"`. Its `resuming`
   field tells you whether this is a fresh run or picking up an incomplete one — if resuming,
   skip any step its `entry.steps` already marks `"done"` and pick back up at the first one
   that isn't.
2. Before each numbered step below starts real work, `--step-start "<step number>"`. After
   it finishes, `--step-done "<step number>"` (add `--data '{...}'` only for a genuinely
   useful, content-free fact). A step that hits a real, retryable problem reports
   `--step-failed "<step number>" --reason "..."` instead. **Step 0's own identity-mismatch
   outcome is different: `--step-blocked "0" --reason "..."`, never `--step-failed`** — no
   auto-recovery, ever.
3. Once the real last piece of work is done, run `--complete` — the only thing that lets the
   *next* `--begin` for this cwd start clean instead of resuming.

**Not safe for concurrent calls against the same cwd** — if any step below is ever
dispatched as a parallel `Agent` call (an augmentation, see above), only the main session
calls `--step-start`/`--step-done`/`--step-failed`, never a dispatched agent itself.

### Step 0 — Identity gate

**Real incident, 2026-09-06:** a dead-peer sweep deleted Perm-pinned registry entries, and
the mismatch between what a session was actually voicing and what the registry said sat
undetected for the better part of an hour, across three sessions, before a human caught it
by noticing the wrong voice out loud. This step exists so that never happens silently again.

Before anything else: call `ListAgents`, read this session's own name off its "This session
is `<name>`" line, `--begin` the progress log, self-register
(`node ~/.claude/scripts/pick-persona.js --set-session-name "<name>"`), and sweep dead peers
off that same call (`node ~/.claude/scripts/pick-persona.js --sweep-dead "<comma-separated
live names>"`, `""` if none). Skip this whole step silently if the global persona system
isn't installed.

Then **compare this session's live persona** (`.claude/settings.local.json`'s `outputStyle`
field) **against what the registry says for this cwd**. Match → `--step-done "0"`, proceed.
**Mismatch → `--step-blocked "0" --reason "..."`, then stop the entire routine here.** No
auto-recovery, ever — surface plainly (this cwd, what the registry says, what's actually
loaded) and wait for a real `/hails-persona <name>` correction; don't guess, don't self-heal.

### Step 0.5 — Full repo cleanup, including the NSFW spot check

Merge the default branch forward — on the active branch, submodules included, every session
start. Skip this whole step silently if this project has no git remote at all.

**Whether this step also commits and pushes local work out, or is sync-only, is a real
per-repo fact, not something to force uniformly (corrected 2026-09-09, verified live: `xls`'s
own sync mechanism — `scripts/sync-worktree-branches.js` — is fetch-and-merge-forward only,
by design, per its own header and `DEC-18`; it was built to pull upstream drift *into* a
worktree, never to push local work *out*).** If the playbook says this repo doesn't
auto-push at session-start, that's a legitimate augmentation, not a gap — Step 0.5 stays
pure sync here, and the NSFW gate below doesn't apply either, since nothing's being pushed
for it to catch. Where this repo *does* commit and push automatically: **whether "commit"
means finishing a genuinely dirty working tree, or only pushing what's already committed is
a judgment call for whoever's running it, in the moment.** Never blind `add -A` without
looking at what's about to be committed.

**The NSFW/persona-leak spot check runs here, before the push, only on a repo that actually
pushes at this step.** If the global persona system is installed and this repo has its own
`docs/nsfw-comment-audit-playbook.md` (bootstrapped by `hails-nsfw-comment-audit` on its own
first run, if it hasn't run here yet), scan whatever's about to be pushed against that
playbook's term list. Read any hit's actual context before flagging it; a real finding gets
named plainly and a recommendation to run the full `hails-nsfw-comment-audit` skill, not
fixed inline here. If this repo has no such playbook yet and no persona session has ever run
here, skip this sub-step silently. **A repo that runs a retrospective daily scan instead
(e.g. across a wider window, or as its own dispatched step) is a genuinely separate, bespoke
mechanism — not a duplicate of this gate, and not a reason to skip this gate either, on a
repo where both apply.**

A reported `CONFLICT` on the merge is never auto-resolved here, just surfaced plainly.

### Step 1 — Run `hails-persona-refresh`

**Session-start auto-chains into persona-refresh** — every persona-identity step
(re-register, persona-file re-read, canon-check, day-state, theme, the door's own morning
read+write, color) runs here, mechanically, via that skill. Its own "report back once,
tersely, in character" step is held, not printed here — the voice shows up once, folded into
this routine's own closing summary, not as an upfront announcement before any real content
exists.

**"Chains into" means a real `Skill` tool call, not a paraphrase — not a choice, not
optional judgment (real incident, 2026-09-09: this exact step got logged `--step-done`
without the skill ever actually being invoked — `the-house`'s door-signature refresh
silently never ran for a full session, caught only because BinaryMisfit noticed his own room
reference didn't line up).** Issue `Skill({skill: "hails-persona-refresh"})` and wait for it
to actually return. `--step-done "1"` may not be called until that return has happened. This
is distinct from the judgment calls *inside* persona-refresh itself (reveal mechanism,
whether a mention is worth saying) — those stay exactly as written in that skill's own file;
only "does the call happen at all" is non-negotiable. Skip if no persona system is installed.

### Step 2 — Previous day summary

Real `git log` output, bounded to the previous full calendar day per the Timezone the
playbook names — not a rolling "since N hours/days ago" window. Summarize in plain prose
what the day was about, not a raw commit dump. **If the playbook names an augmented scope
for this step** (additional submodules/repos to include), cover those too, same bounds, same
summary discipline. If nothing landed the previous calendar day, say that plainly rather than
stretching an older day's work to fill the slot.

### Step 3 — Project-specific health check (repo-earned, optional)

Run whatever the playbook's own Step 3 section describes. If the playbook has nothing there,
skip this step; don't invent a check that doesn't exist.

### Step 4 — Register/todo sweep

Look for this repo's own tracking doc — `docs/todo-register.md` is the conventional default,
but use whatever the playbook names if different (or a `docs/tracking-index.md` pointing at
several registers). **If no such file exists at all, that absence is itself the finding.**

If a tracking doc exists, read it fresh. **Fetch before reading, if this repo is a git repo
with a remote** — "read it fresh" means fresh against what's actually on the remote, not
just fresh-vs-memory. `git fetch origin`, compare local HEAD to `origin/<branch>`: pull
cleanly if it's a fast-forward, or read local anyway but flag prominently that it may be
stale (and by how many commits) if it isn't.

**If the playbook names an augmented scope** (every repo under a tree, several registers by
name), cover those too. **Once this step's own raw output volume earns it, dispatch it (and
Steps 2/3 above, if they're heavy too) as parallel `Agent` calls instead of running inline**
— this keeps raw intermediate output out of the main session's context; only the distilled
report each step already asks for comes back. Not a default for a light repo; a technique to
reach for once earned, and only if the playbook has actually opted a step into it.

### Step 5 — Classify

For every item still Open/In-progress found in Step 4: sanity-check whether its priority or
blocked status still looks accurate given anything that's shipped or changed since it was
set. **Surface a suggested reclassification, never apply one silently** — the human who set
the priority is the one who gets to change it.

### Step 6 — Read the scratchpad

Look for a session-continuity scratchpad for this repo (a file like
`docs/scratchpad-<date>-*.md`, written when a prior session signed off mid-thread). If one
exists, read it fresh. If none exists, that's a normal, common state — say nothing about it.

### Step 7 — Concrete next actions

Surface exactly two real, traceable things, not manufactured options: the highest-priority
still-open item in the register (Step 4's fresh read, the human-set priority, never your own
re-ranking), and whatever Step 6's scratchpad says was started but not finished. If there's
no scratchpad, or it doesn't name anything unfinished, that half is simply omitted.
**Exception:** if Step 4 found no tracking doc at all, there's only one honest thing to
surface: *"Set up a todo register and populate it with real outstanding work."*

### Step 8 — Check the notice board, late

**Runs last, after everything else above is already fresh** — deliberately the flip of
`hails-session-end`'s own board check (which runs first, before anything closes out): by the
time a notice actually gets read here, there's full context to act on it, not a cold read
before this session even knows what day it is.

**"Chains into" means a real `Skill` tool call, not a paraphrase — not optional, same
hardening as Step 1 above.** Issue `Skill({skill: "hails-notice-board"})` and wait for it to
actually return before this step is marked done. Skip silently if the global persona system
or `the-house` isn't installed.

## Any additional bespoke steps the playbook names

Run them at the insertion point the playbook declares, same progress-log discipline as
everything above (their own step number, whatever the playbook assigns).

## Closing summary

This is where Step 1's held persona voice actually surfaces — one short, in-character beat
naming the persona explicitly (first time this session, per that persona's own file), woven
around the real content from every step above, not a separate greeting printed before any of
it.

## A couple of things worth knowing, regardless of which repo this runs in

- **A reclassification suggestion is never applied silently** — any register's own "priority
  set explicitly, not inferred" rule (if that repo has one) still holds.
- **What actually gets said back to BinaryMisfit is voice, not a procedural report.** The
  step structure above (numbers, tool calls, progress-log JSON) is mechanics — run it, don't
  narrate the mechanism. Real test: would this exact report read the same regardless of
  which persona ran it? If yes, it isn't done yet.
