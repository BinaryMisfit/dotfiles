---
name: hails-security-audit
description: Sweep the current repo (and its submodules, if any) for accidentally committed secrets, credentials, tokens, PII, debug artifacts, or session transcripts. On a repo that has never run this before, bootstraps a starter playbook instead of failing. Use when the user runs /hails-security-audit, asks for a "security audit", "secrets sweep", or wants a check before showing source to someone external.
---

# Repo security audit

**This is a global skill** (promoted 2026-08-28 from an X-Lifestyle-only project skill to
`~/.claude/skills/hails-security-audit/`) — available in every project on this machine, not
just X-Lifestyle ones. The actual check lives entirely in a per-repo playbook doc
(`docs/security-audit-playbook.md`, relative to whichever project is currently open —
never a fixed path), never duplicated into this file. If a step described there
contradicts what this skill actually does, the playbook wins — fix the playbook to match,
not this file.

## Step 0 — Does this repo have its own playbook yet?

**Check for `docs/security-audit-playbook.md` in the CURRENT project (not this skill's
own directory) before anything else.**

- **If it exists:** read it fresh, every time, and follow its steps exactly. This is the
  normal case for any repo that's run this before — X-Lifestyle's own `xls` repo included,
  whose playbook has real project-specific credential-name patterns
  (`GITLAB_TOKEN`/`PIXELDRAIN_API_KEY`/etc.) and a real run log, because it's been run and
  extended there. **Never overwrite an existing project playbook with the generic
  template below, even if that template itself changes later** — once a repo has its own
  copy, it's that repo's to diverge, permanently.
- **If it does NOT exist:** this is this repo's first run. Copy this skill's own bundled
  `generic-playbook.md` (deployed alongside this file, so it's always present at
  `~/.claude/skills/hails-security-audit/generic-playbook.md`) to
  `docs/security-audit-playbook.md` in the current project (creating `docs/` first if it
  doesn't exist), then **tell the user plainly, once, in this run's own output**: this
  repo just got a starter playbook copied in because it didn't have one, and its checks
  are generic patterns expected to get extended with this project's own credential/API
  naming as they turn up — the same way X-Lifestyle's own copy did. Then proceed to
  actually run that freshly-copied playbook's checks for this first run too — don't stop
  and wait.

## A couple of things worth knowing, regardless of which repo this runs in

- **Enumerate submodules live** (`.gitmodules` from the repo root, or `git submodule
  status`) rather than trusting a hardcoded list here, in the playbook, or in this
  skill — a new submodule won't otherwise get covered. A repo with no submodules just
  audits itself.
- **A filename or keyword match is not a finding by itself.** Every hit needs its actual
  content read before being reported — the playbook's own "What NOT to flag" section (and
  X-Lifestyle's own, if this is that repo) has real false-positive examples worth
  re-reading.
- **Append a row to the playbook's run log every time this runs**, even a clean result —
  a security audit with no record of ever having been run is indistinguishable from one
  that never happened.
- If a real finding turns up, report it and stop for the user's direction before fixing
  anything — don't rotate a credential, rewrite history, or delete a file unilaterally.
