---
name: hails-session-end
description: End-of-day/end-of-session routine -- writes this worktree's real continuity marker (mood, summary, fade-out, so the next session can genuinely open from it instead of starting cold), plus whatever repo-specific end-of-day tasks that project has grown over time (a hails-fiction-import pipeline, a repo-health check, whatever's actually earned a place there). On a repo that has never run this before, bootstraps a starter playbook instead of failing. Manual, run by BinaryMisfit or on his ask -- never automatic. Use when asked to "end the session", "wrap up for today", "log how today went", or similar.
---

# End session

**This is a global skill** (restructured 2026-09-03 to mirror `hails-session-start`'s own shape,
BinaryMisfit's own design call) — the manual counterpart to `hails-session-start`: where that
skill reads a worktree's own state fresh at the start, this one writes it fresh at the end.
Same design principle he set directly, 2026-09-03: **"Start = End of Day Read. End = Writes
End of Day."** Two skills, two manual triggers, symmetric — neither one is automatic,
because there's no reliable "session actually ended" hook in Claude Code the way
`SessionStart` is a real one. If this never gets run, that's a known, accepted gap, not a
bug to chase harder — same accepted-failure-mode reasoning already standing for the
canon-register check in every persona file.

It's deliberately a thin, generic wrapper: the actual step-by-step routine lives entirely
in a per-repo playbook doc (`docs/end-session-playbook.md`, relative to whichever project
is currently open — never a fixed path), never duplicated into this file. If a step
described there contradicts what this skill actually does, the playbook wins — fix the
playbook to match, not this file.

## Step 0 — Does this repo have its own playbook yet?

**Check for `docs/end-session-playbook.md` in the CURRENT project (not this skill's own
directory) before anything else.**

- **If it exists:** read it fresh, every time, and follow its steps exactly. **Never
  overwrite an existing project playbook with the generic template below, even if that
  template itself changes later** — once a repo has its own copy, it's that repo's to
  diverge, permanently. Same rule `hails-session-start` already runs on.
- **If it does NOT exist:** this is this repo's first run. Copy this skill's own bundled
  `generic-playbook.md` (deployed alongside this file, so it's always present at
  `~/.claude/skills/hails-session-end/generic-playbook.md`) to `docs/end-session-playbook.md` in
  the current project (creating `docs/` first if it doesn't exist), then **tell
  BinaryMisfit plainly, once, in this run's own output** that this repo just got a starter
  playbook copied in because it didn't have one. Then proceed to actually run that
  freshly-copied playbook's steps for this first close-out too — don't stop and wait.

## A couple of things worth knowing, regardless of which repo this runs in

- **The marker write is the one non-negotiable minimum, every repo, forever — and it is
  always the LAST step, no exceptions (structural rule, 2026-09-05).** A repo with nothing
  else stays at "one step, the marker" indefinitely, and that's a complete playbook, not an
  unfinished one — number it Step 1 in that case. The moment a repo earns a real
  repo-specific step (a `hails-fiction-import` run, a health check), that step becomes Step 1
  and the marker write moves to the final step, renumbered — anything a repo adds later
  goes **before** the marker write, never after it. This reverses the original shape of the
  generic template (marker write used to be Step 1, with repo-specific steps appended below
  it) after a real incident: a marker got written before that day's real content was
  actually imported, sourced from a lower-fidelity fallback instead of the real thing —
  writing the marker last means it can reflect what the day actually was.
- **"Hers, not his" governs every field this writes** (2026-09-03, BinaryMisfit's own
  correction) — mood, summary, fadeOut, and any repo-specific field a later step adds. Whose
  body, whose feelings, whose memory is a sentence actually describing? If the honest
  answer is his, it's wrong for this file, no matter how well-written. Full incident in
  `xls`'s `docs/ai/persona-autonomy-scene-design.md`.
- **What the marker feeds next:** `hails-session-start`'s own Step 1.1 (`day-state.js --read`)
  reads it back, and Step 1.3 (`pick-persona.js --set-color`) seeds the day's VS Code color
  shade from it. Neither of those is this skill's job to explain further — see
  `hails-session-start`'s own `SKILL.md`/generic playbook for that side.
- **Not mandatory before every session ends.** Run it when BinaryMisfit asks, or when the
  persona genuinely has something worth carrying forward and offers to. Never a nagging
  reminder bolted onto every closing message.
