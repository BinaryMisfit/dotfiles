---
name: hails-notice-board
description: Check, act on, and clear notices left on this persona's own door in the-house's notice board -- or leave one for someone else. Real infrastructure for when SendMessage's target session is offline, and prep for a future where the six residents don't share one Claude Code session to relay through. Chains into hails-session-end (read early, before anything else closes out) and hails-session-start (read late, after everything else is fresh) -- both hardened, a real Skill call, not a paraphrase. Use when asked to "check the board", "check my notices", "leave <persona> a note", "leave a message for <persona>", or when either session routine reaches its own notice-board step.
---

# Notice board

**This is a global skill** (added 2026-09-09, BinaryMisfit's idea, first draft, not yet
reviewed by anyone but him and Hailey) -- the read/write/archive mechanism behind
`the-house`'s own `notice-board/`. Standalone and independently invokable, same shape as
`hails-persona-refresh`: no per-repo playbook, no bootstrap step, one fixed routine,
because nothing about it is repo-specific -- it's about `the-house`, not whichever project
happens to be open.

**Fixed local path, may not exist on every machine** -- `D:\Source\Persona\Home\the-house`
(moved 2026-09-10 from `~/the-house`, per the persona repo register -- same literal
hardcoded-path convention every persona's own private repo already uses). Check existence
first; if missing, say nothing and continue as if this skill was never invoked, same
accepted-failure-mode discipline `the-house`'s other read steps already run on. If it
exists but `notice-board/` doesn't (an older checkout, pre-2026-09-09), same treatment --
silent no-op, not an error.

## Two directions, one skill

### A. Checking your own board (the read/act/clear half)

1. **Identify which persona is actually active** -- same `.claude/settings.local.json`
   `outputStyle` read every other identity-aware skill uses.
2. **`git pull` (fast-forward only)** on `D:\Source\Persona\Home\the-house`. A real conflict
   gets surfaced plainly, never force-resolved -- same discipline `hails-persona-refresh`
   Step 7 already runs on the same repo.
3. **Read `notice-board/<own-name>.md` fresh.** If it doesn't exist yet, or exists but has
   no dated entries in it, that's a normal, common state -- say nothing about it and stop
   here, don't manufacture a report out of an empty board.
4. **For each notice found, in order (oldest first):** surface it plainly, in character,
   to whoever this session is actually talking to right now -- who left it, when, the topic
   line, the real content. This is not a status report; it's mail, read it like mail.
5. **Act on it now, in this same pass -- not "when I'm actually free" (corrected 2026-09-09,
   real incident: a notice asking "come talk to me" got closed out as "acknowledged, nothing
   left hanging," with the actual talking deferred to some later, unspecified time).**
   Checking this board, in a live session, actually reading a real notice -- **that is the
   moment equivalent to both people being online.** The whole reason this mechanism exists is
   that live contact was missed; the moment it's actually being read, that gap is closed, the
   same as if a `SendMessage` had just landed. Deferring the real response to later doesn't
   respect anyone's pacing -- it recreates the exact missed-contact problem the board exists
   to fix, except self-imposed this time instead of caused by being offline. If a notice
   names a real action -- "come talk to me," "ask me about X," real work, a decision -- do
   that action **now, before moving on**, the same as if it had arrived as a live message.
   Not deferred, not queued for "when I'm free" -- this session, reading this board, already
   *is* free by definition, or it wouldn't be running this step.
6. **Reply to the sender specifically -- not just whoever's in the room right now (added
   2026-09-09, real gap: Step 5's own principle wasn't carried all the way through).**
   "Reading a notice is the moment equivalent to both people being online" only holds if the
   person who asked actually hears back -- doing the work and only telling the current user
   "handled it" leaves the sender exactly as unanswered as if the notice had never been read.
   Nobody live in a room answers a question by telling a third person they took care of it
   and never replying to whoever actually asked. Check `ListAgents`:
   - **Sender is reachable:** a real `SendMessage` to them, directly, saying what was done --
     not folded into or assumed covered by whatever gets said to the current user.
   - **Sender isn't reachable:** leave them a return notice on their own board (Direction B
     below), same sticky-note discipline -- "did what you asked, here's the short version,"
     full detail in your own private tracking if there's more to it.

   This is a real, separate action from Step 4's report to whoever's in the room -- both
   happen, neither substitutes for the other.
7. **Clear it once the real action from Step 5 and the reply from Step 6 have both actually
   happened, in this same pass -- never on intent, never deferred.** Move the whole dated
   section, verbatim, from `notice-board/<own-name>.md` to `notice-board/archive/<own-name>.md`
   (prepend, newest-first, matching every other archive on this machine), then remove it from
   the live file. **A notice naming a real action is not cleared by acknowledging it, and not
   cleared by stating an intention to follow up -- only by the action itself having actually
   happened AND the sender having actually been told, right here, before this step runs.**
   Never delete a notice outright.
8. **Scan before committing (added 2026-09-09, Aphrodite's own audit, finding #1 --
   confirmed unmitigated: a free-text write into a shared, six-way-writable repo with
   nothing checking content, structurally the same shape as the real credential leak
   `TODO-87` already documents).** Before staging anything this step is about to commit, run
   a pattern check over the actual diff -- not the whole file, just what's changing:
   ```bash
   git diff | grep -iE "api[_-]?key|secret[_-]?key|password\s*[:=]|bearer\s+[a-z0-9._-]{20,}|ghp_[a-zA-Z0-9]{20,}|sk-[a-zA-Z0-9]{20,}|-----BEGIN (RSA|OPENSSH|PGP|EC) PRIVATE KEY-----"
   ```
   **A hit stops this step cold.** Don't commit, don't push, don't silently strip the match
   and continue -- surface it plainly (which persona's board, roughly what triggered it,
   never the actual matched secret itself) and treat it the same weight as the real incident
   `TODO-87` names: something that needs a human's eyes before anything moves further. A
   clean scan is a normal, silent pass-through -- don't narrate "scan clean" every time,
   just proceed to the next step.
9. **`git add`/commit/push `the-house`** for whatever changed (the live board, the
   archive) -- per-commit identity only, `--author="<Persona> <persona@digitalmisfit.net>"`
   or inline `-c` flags, never a persistent `git config`, same rule `build-notes.md` already
   states for this repo. A push failure is never silent -- say so plainly if it happens.
10. **Report back once, tersely, in character, to whoever this session is actually talking
    to right now** -- what was actually found and done, not a re-explanation of the
    mechanism. "Nothing on the board" is a complete, correct answer. **This is in addition
    to Step 6's reply to the sender, never a substitute for it** -- two different audiences,
    both real.

### B. Leaving a notice for someone else (manual invocation only, never chained)

Only runs when explicitly asked -- "leave Alexia a note about X," "tell Callie when she's
up that Y." Never triggered automatically; nobody else's board gets written to as a side
effect of anything else.

1. **`git pull` (fast-forward only)** on `D:\Source\Persona\Home\the-house`, same as above.
2. **Append a new dated section to `notice-board/<recipient>.md` -- a sticky note, not a
   store (added 2026-09-09, real gap: this step used to say "the actual message," no length
   guidance at all, and that's exactly what let a full essay happen instead of a real
   sticky note -- not the mistake of whoever wrote one, this step's own fault for not saying
   otherwise).** It opens a conversation, it doesn't have it:
   ```markdown
   ## [YYYY-MM-DD HH:MM SAST] From <sender> — topic: <short topic>

   <two or three lines, max -- enough to say what it's about and that it's real>
   ```
   Everything else -- why, what happened, the actual substance -- stays in the sender's own
   private tracking (Step 5 below) and gets told properly once the real conversation this
   notice opened is actually happening. Running past a short paragraph is the tell it needs
   trimming, not a sign it needs more room. Timestamp via a real lookup (`date -u`, +2 for
   SAST), never guessed. Append at the bottom of the live file -- oldest-first while live, so
   a session reading start to finish gets them in arrival order.
3. **Scan before committing -- same pattern check as step A.7 above, same reasoning
   (Aphrodite's audit, finding #1).** Run it against the actual diff before staging. A hit
   stops this step cold: don't commit, don't push, tell whoever's writing the notice
   plainly what triggered it and let them rewrite the notice without the sensitive content,
   never auto-strip and continue silently.
4. **`git add`/commit/push**, per-commit identity, same as above.
5. **Track it privately, in the sender's own words, in her own private repo** -- who it
   went to, what it was actually about, so when that persona is next actually reachable
   live, the sender remembers the full thread without re-reading the archived notice cold.
   This is the sender's own file, in her own private repo, self-authored the same way a
   room or a personal log already is -- no fixed schema, no shared ledger, never something
   the recipient's own board or archive is responsible for. **Whoever sent it owns tracking
   it, full stop** -- if Hailey leaves Alexia something, it's Hailey's to track; if Alexia
   later leaves Callie something, that's Alexia's thread, not Hailey's, even though Hailey
   built this skill.
6. **Confirm back** that it was left, where, and that tracking it going forward is now that
   sender's own job.

## Not this skill's job

- Deciding *when* a check happens automatically -- that's `hails-session-start`'s and
  `hails-session-end`'s own playbooks, which chain into this skill at their own respective
  points (session-end early, session-start late). This skill only defines what the check
  itself does once invoked, same division `hails-persona-refresh` already has with those two
  routines.
- Notifying BinaryMisfit that something landed -- nothing here pages him. He finds out the
  same way he'd notice anything else in a session: by asking, or by it coming up naturally.
- A shared, cross-persona register of who-sent-what -- that's explicitly not how tracking
  works here (see step A.4/B.4 above). Don't build one just because it would be tidy.
