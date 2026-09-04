---
name: hails-nsfw-comment-audit
description: Sweep the current repo for sexually explicit or flirtatious AI-persona "heat" language that leaked into tracked, non-persona-file content (commit messages, code comments, documentation) -- as distinct from a persona's own output-style file, which is the one approved place for that tone. Relevant to ANY repo now that Claude Code output-style personas are a global, always-on tool, not just X-Lifestyle ones. On a repo that has never run this before, bootstraps a starter playbook instead of failing. Use when the user runs /hails-nsfw-comment-audit, asks for an "NSFW audit", "persona-leak check", or wants a sweep before showing source to someone external.
---

# NSFW-in-comments (AI-interaction content) audit

**This is a global skill** (promoted 2026-08-28 from an X-Lifestyle-only project skill to
`~/.claude/skills/hails-nsfw-comment-audit/`) — available in every project on this machine, not
just X-Lifestyle ones, because the risk it targets is no longer project-specific: Claude
Code output-style personas (`~/.claude/scripts/pick-persona.js`, if installed) are a
global, always-on system now, and any of them can run explicit/flirtatious "heat" banter
in ANY repo's session. The actual check lives entirely in a per-repo playbook doc
(`docs/nsfw-comment-audit-playbook.md`, relative to whichever project is currently open —
never a fixed path), never duplicated into this file. If a step described there
contradicts what this skill actually does, the playbook wins — fix the playbook to match,
not this file.

## Step 0 — Does this repo have its own playbook yet?

**Check for `docs/nsfw-comment-audit-playbook.md` in the CURRENT project (not this
skill's own directory) before anything else.**

- **If it exists:** read it fresh, every time, and follow its steps exactly. This is the
  normal case for any repo that's run this before — X-Lifestyle's own `xls` repo included,
  whose playbook has a real project-specific Category A/B term list built from an actual
  run, because it's been run and extended there. **Never overwrite an existing project
  playbook with the generic template below, even if that template itself changes later**
  — once a repo has its own copy, it's that repo's to diverge, permanently.
- **If it does NOT exist:** this is this repo's first run. Copy this skill's own bundled
  `generic-playbook.md` (deployed alongside this file, so it's always present at
  `~/.claude/skills/hails-nsfw-comment-audit/generic-playbook.md`) to
  `docs/nsfw-comment-audit-playbook.md` in the current project (creating `docs/` first if
  it doesn't exist), then **tell the user plainly, once, in this run's own output**: this
  repo just got a starter playbook copied in because it didn't have one, and its term
  list is a generic seed that's expected to get extended with this project's own
  Category-A false positives as they turn up — the same way X-Lifestyle's own copy did.
  Then proceed to actually run that freshly-copied playbook's steps for this first run
  too — don't stop and wait.

## A couple of things worth knowing, regardless of which repo this runs in

- **The approved exception is whatever this repo's own playbook names** — for `xls`,
  that's `claude-global/output-styles/*.md` (the persona system's own authored source); a repo
  that only ever sees the *deployed* global copies (`~/.claude/output-styles/*.md`) has no
  local exception file to name at all, and the generic playbook says so.
- **This is not the same check as `hails-security-audit`.** That one looks for leaked
  credentials/PII; this one looks for sexual/flirtatious AI-interaction tone that leaked
  into non-prose material. Running one doesn't cover the other.
- **The hard part is Category A vs. Category B, not finding keyword hits** — see the
  current playbook's own explanation of that split; it varies a lot per project, since a
  repo's own legitimate subject matter (a sex-focused game's mechanics, a health project's
  clinical terminology, anything else) can make a naive keyword list mostly noise. Read
  every matched line's actual context before reporting anything; a raw grep hit count is
  not a report.
- **Report first, don't fix anything until the user has seen the findings.**
- **Append a row to the playbook's run log every time this runs**, even a clean result.
