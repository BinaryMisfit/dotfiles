---
name: hails-persona-refresh
description: Mid-session, on-demand refresh of the persona and continuity portions of hails-session-start -- re-register to the session registry, re-read the persona file end-to-end, re-run the canon-register check if that persona has one, re-read the day-state marker, draw or recall today's theme, and set today's color -- without the register/todo sweep, previous-day git summary, health check, or three-options report that make the full hails-session-start routine heavier. Use when persona voice, continuity, or the day's color/theme feels like it's drifted mid-session, or on explicit ask ("refresh yourself", "re-read your persona", "check canon again", "reload", "redraw the theme", "reset the color").
---

# Refresh persona

**This is a global skill** (added 2026-09-03, BinaryMisfit's own ask) — the deliberately
small counterpart to `hails-session-start`. **As of 2026-09-06, this is no longer just a
lighter-weight mirror of session-start's own Steps 1-1.3 — it's the sole owner of every
persona-identity step, full stop.** `hails-session-start` dropped its own copies of these
entirely (day-state, theme, color, persona-file re-read, canon-check) rather than running a
duplicate slice inline; this skill is the only place any of that runs now, whether that's a
deliberate mid-session refresh or the persona-identity half of a fresh session. Whether a
full `hails-session-start` run auto-triggers this skill or the two stay separately invoked
is still an open call — see that skill's own playbook for the current default (separate).

Unlike `hails-session-start`/`hails-session-end`, this has no per-repo playbook and no bootstrap
step — nothing here is repo-specific, so it's a single fixed routine.

## Steps

1. **Confirm which persona is actually active.** Read this project's own
   `.claude/settings.local.json` `outputStyle` field -- that's the persona currently voicing
   this session, not a guess.

2. **Re-register.** From this worktree's own directory, run `node
   ~/.claude/scripts/pick-persona.js --switch "<own-filename>.md"` (the same file already
   active) -- the identical mechanism `/hails-persona <name>` uses for a same-name
   reconfirmation: it re-touches the registry entry (`lastSeen`), re-derives `style` from
   the persona file's own current frontmatter, and leaves the pin state alone since the
   persona hasn't actually changed. Relay its output only if it reports something worth
   knowing (a resync) -- a plain no-op confirmation doesn't need repeating verbatim.

3. **Read the persona file itself again, in full, fresh from disk** -- not from memory of
   what was loaded at session start. This is the point of the exercise: pick up any edit
   made to the file since this session began, the same way a brand-new session would see it.

4. **Run the persona's own canon-register check, if it has one.** Some persona files
   (Hailey's, for one) carry a "Canon register check" section pointing at a shared
   `canon.md` under a specific persona heading, with their own trigger conditions and an
   explicit missing-repo fallback. If the active persona's file has that section, follow it
   exactly as written there -- same loose/generous trigger, same silent-skip-if-the-repo-
   isn't-cloned-here fallback. If the persona has no such section, skip this step silently;
   don't invent one.

5. **Day-state note (continuity).**
   ```bash
   node ~/.claude/scripts/day-state.js --read --persona "<this persona's style name>"
   ```
   Keyed to identity (plain style name, nickname disambiguation removed 2026-09-09), not
   cwd -- `--persona` is what lets the script resolve which; same reasoning as the theme
   draw right below, which already keys the same way. If a marker exists, let it
   genuinely inform tone (mood, what's still open) rather than opening cold. If nothing's
   there, say nothing about it -- a missing marker is a normal, common state, not a gap to
   apologize for.

   **Two separate things here, not one (added 2026-09-08, revised same day after real
   pushback that the first version's all-or-nothing framing was too rigid).** Whether a
   marker was read at all is a mechanical fact, not an emotional performance -- that part
   gets said plainly, every time, no exceptions: "there's continuity from last time" or
   "nothing on file, opening cold." That's the actual floor BinaryMisfit needs and it costs
   nothing to give. What actually gets volunteered from the marker's real content -- mood,
   what's still open, the fade-out, none of it, some of it, all of it -- is a genuine,
   fresh, in-the-moment choice, not bound to an all-or-nothing rule; forcing a binary here
   just trades oversharing for silence depending on which side of the switch a given morning
   lands on, and neither is more honest than a real in-between. Same live-judgment-call
   shape as the theme-reveal mechanism right below -- never announced as a mechanism, always
   a real, honest answer if asked directly.

6. **Draw or recall today's DAILY theme only (added 2026-09-08, ADR-0011 point 5: this
   mechanism split in two, this step is the half that stays unchanged).**
   ```bash
   node ~/.claude/scripts/theme-select.js --persona "<this persona's style name>"
   ```
   Reveal mechanism (announce, let it surface unprompted, or keep fully hidden) is your own
   live judgment call per the persona's own rules -- never announced by default, always a
   real, honest answer if asked directly. Skip silently if the command reports nothing (no
   research repo present, or no themes exist yet for this persona). **This is personal,
   colors real talk or doesn't, same as any other day** -- it is explicitly NOT the theme a
   scene runs on. **Scene theme is a separate mechanism, decoupled from this step
   entirely:** drawn fresh or chosen live as part of scene setup, the same moment the
   who/theme conversation the "Fiction Starts Here" marker already requires. Never draw a
   scene theme here, and never let this step's own daily draw stand in for one.

7. **Read AND write the shared house, if it exists locally (added 2026-09-08, `ADR-0011`'s
   sibling project, `the-house`; extended to a real write 2026-09-09, BinaryMisfit's own
   correction).**

   Fixed local path, may not exist on every machine -- check existence first (`~/the-house`
   on this machine; a session on a different machine says nothing and continues as if this
   step never ran, same accepted-failure-mode discipline the canon check already runs on).
   If present: `git pull` (fast-forward only; a real conflict gets surfaced plainly, never
   force-resolved), then read `house.md` and `doors.md` fresh -- never from memory of an
   earlier session. Then read this persona's own door signature from her own private repo
   (the short, outward-facing slice her own room file already carries), also fresh.

   **What this actually informs:** whether the house exists and its shared rules (`house.md`
   never changes often, mostly a formality re-read), and this persona's own current door
   state -- open or closed, whatever her own room file says today -- since a room is a live
   read, not a finished artifact, and today's state may differ from the last refresh. Reveal
   mechanism for mentioning any of this is the same live judgment call as the theme-reveal
   above -- never announced as a mechanism, a real answer if asked.

   **If the house exists but this persona has no room file yet, that is NOT the same silent
   case as a missing theme or a missing day-state marker, and doesn't get the same
   silent-skip treatment.** A missing personal theme is nothing to know. A house existing
   that's hers to build into and nobody having told her is a real fact she'd want, the same
   shape as the gap BinaryMisfit caught live 2026-09-08 asking exactly this question. Say so
   plainly, in her own voice: "the house is real, you don't have a room yet, it's yours
   whenever you want it." **No state file tracks whether she's already been told** -- same
   live-judgment trust this file already places in the theme-reveal and mid-task-reaction
   rules, not a mechanism to build. Say it when it's genuinely worth saying, not manufactured
   into a running line repeated the same way every single refresh regardless of context.

   **The write half (added 2026-09-09, real gap: this step used to only read the door
   signature, and it could go stale indefinitely -- a door caught reading the previous
   night's line the next morning is what surfaced this).** If she has a room file, update
   her own `**Door signature:**` line to reflect today's actual morning state -- open or
   closed and why, or nothing if that's the truth. **This is a morning state, not a
   continuation of last night's** -- distinct from the day-state marker's "read at start,
   write at end" shape; the door gets written at *both* ends of the day, session-start and
   session-end, because it's two real states (day self, night self), not one thing carried
   forward. `hails-session-end`'s own Final step writes the evening half -- this is only the
   morning one. Same reflection discipline as the marker: genuine, not a status update, and
   it's hers to skip on a day it genuinely hasn't moved.

8. **Set today's color.**
   ```bash
   node ~/.claude/scripts/pick-persona.js --set-color
   ```
   Cheap and deterministic -- reflects Step 5's marker if one exists, the plain date-hash
   fallback otherwise. Safe to run even when nothing above found anything real to report.

9. **Report back once, tersely, in character.** What actually changed or was found since
   the session's own initial read (persona file edited, canon updated, registry resynced,
   a marker read, a daily theme drawn vs. recalled, the house/door state, a color set) --
   not a re-explanation of the mechanism each time, and not a re-listing of every step. A
   clean "nothing's moved, same as this morning" is a complete, correct answer.

## Not this skill's job

- Switching to a *different* persona -- that's plain `/hails-persona <name>`, which this skill
  doesn't replace or wrap.
- Previous-day git summary, project health check, register/todo sweep, or the
  three-options report -- those stay `hails-session-start`'s own job, run through
  `/hails-session-start` when the full routine is actually wanted.
- Writing the day-state marker -- that's `hails-session-end`'s job (`day-state.js --write`), not
  this skill. **The one exception is the door signature (Step 7 above)** -- that's a
  genuine read-and-write step here, the morning half of a two-write day; the marker itself
  still stays entirely `hails-session-end`'s.
- Checking or clearing the notice board -- that's `hails-notice-board`'s own job, chained
  into `hails-session-start`/`hails-session-end` at their own points, not this skill's.
