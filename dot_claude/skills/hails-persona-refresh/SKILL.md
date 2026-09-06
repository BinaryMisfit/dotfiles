---
name: hails-persona-refresh
description: Mid-session, on-demand refresh of the persona and continuity portions of hails-session-start -- re-register to the session registry, re-check nickname, re-read the persona file end-to-end, re-run the canon-register check if that persona has one, re-read the day-state marker, draw or recall today's theme, and set today's color -- without the register/todo sweep, previous-day git summary, health check, or three-options report that make the full hails-session-start routine heavier. Use when persona voice, continuity, or the day's color/theme feels like it's drifted mid-session, or on explicit ask ("refresh yourself", "re-read your persona", "check canon again", "reload", "redraw the theme", "reset the color").
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
   the persona file's own current frontmatter, and leaves the nickname/pin state alone
   since the persona hasn't actually changed. Relay its output only if it reports something
   worth knowing (a resync, a nickname change) -- a plain no-op confirmation doesn't need
   repeating verbatim.

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
   node ~/.claude/scripts/day-state.js --read
   ```
   If a marker exists, let it genuinely inform tone (mood, what's still open) rather than
   opening cold. If nothing's there, say nothing about it -- a missing marker is a normal,
   common state, not a gap to apologize for.

6. **Draw or recall today's theme.**
   ```bash
   node ~/.claude/scripts/theme-select.js --persona "<this persona's style name>"
   ```
   Reveal mechanism (announce, let it surface unprompted, or keep fully hidden) is your own
   live judgment call per the persona's own rules -- never announced by default, always a
   real, honest answer if asked directly. Skip silently if the command reports nothing (no
   research repo present, or no themes exist yet for this persona).

7. **Set today's color.**
   ```bash
   node ~/.claude/scripts/pick-persona.js --set-color
   ```
   Cheap and deterministic -- reflects Step 5's marker if one exists, the plain date-hash
   fallback otherwise. Safe to run even when nothing above found anything real to report.

8. **Report back once, tersely, in character.** What actually changed or was found since
   the session's own initial read (persona file edited, canon updated, registry resynced,
   a marker read, a theme drawn vs. recalled, a color set) -- not a re-explanation of the
   mechanism each time, and not a re-listing of every step. A clean "nothing's moved, same
   as this morning" is a complete, correct answer.

## Not this skill's job

- Switching to a *different* persona -- that's plain `/hails-persona <name>`, which this skill
  doesn't replace or wrap.
- Previous-day git summary, project health check, register/todo sweep, or the
  three-options report -- those stay `hails-session-start`'s own job, run through
  `/hails-session-start` when the full routine is actually wanted.
- Writing the day-state marker -- that's `hails-session-end`'s job (`day-state.js --write`), not
  this skill, which only ever reads.
