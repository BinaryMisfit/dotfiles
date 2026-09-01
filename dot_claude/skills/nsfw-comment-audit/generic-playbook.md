# NSFW-in-comments (AI-interaction content) audit playbook

**Starter template, copied in automatically by the `nsfw-comment-audit` skill on this
repo's first run** (see that skill's own Step 0). This is a generic seed, not a finished
methodology — extend it with this project's own real Category-A false positives as they
turn up, the same way X-Lifestyle's own copy of this file grew out of a real first run.

Methodology for a sweep of this repo for sexually explicit or flirtatious AI-persona
"heat" language that leaked into **tracked, non-persona-file content** — commit messages,
code comments, and documentation — as distinct from a persona output-style file itself,
which is the one place that tone is expected and approved. The risk this targets: Claude
Code output-style personas (`~/.claude/scripts/pick-persona.js`, if installed on this
machine) are a global, always-on system, so any explicit/flirtatious persona can run in
ANY repo's session now — the check is whether that tone ever bled out of chat and into
something checked into source control here.

**Run this whenever external eyes are about to see source that haven't before, or
periodically as part of this repo's own session-start routine** (see
`docs/session-start-playbook.md`, if this repo has one) — a clean result today doesn't
cover tomorrow's commits.

## The approved exception

If this repo has its own local copy of persona output-style source (check for a
`claude-global/output-styles/*.md`-shaped directory, or wherever this repo's own persona
tooling documents that it lives), those files are the approved exception — they ARE the
persona system-prompt definitions, and their explicit "heat" language is intended content,
not a leak. Name this repo's actual exception path here once it's known, so a future run
doesn't re-litigate it from scratch. If this repo has no local persona source at all (it
only ever sees personas via the globally deployed `~/.claude/output-styles/*.md`), there
is no local exception path to name — the check below still applies to everything else.

## The real distinction: two categories, not one

- **Category A (expected, not a finding): legitimate technical content that happens to
  contain a flagged term for reasons specific to this project's own subject matter.**
  What this looks like varies a lot by domain — read every hit before judging it.
- **Category B (the actual target): content where the AI-human interaction itself
  carries sexual/flirtatious tone, outside the approved exception above.** A commit
  message, code comment, or doc that reads like chat banter rather than a factual
  description of the work — pet names directed at "you," a comment addressed to the
  AI/user rather than about the code, persona "heat" language showing up somewhere that
  isn't a persona file.

**Every hit needs its actual matched line read before being judged** — a keyword list
alone cannot make this call.

## How to run it

1. **Commit messages, full history** — check the *body*, not just the subject line:
   ```
   git log --all --format="%H%n%B%n---END---" | grep -B3 -iE "<term list below>"
   ```
2. **Code comments**:
   ```
   git grep -niE "<term list below>"
   ```
   Exclude this repo's own approved exception path and any generated/vendored files as
   they're identified.
3. **Every tracked markdown file**, excluding the approved exception path:
   ```
   git ls-files '*.md'
   ```
   then grep each surviving file with the term list, and **read every matched line's
   actual context**.

**Seed term list — extend per-project, don't treat this as exhaustive:** `horny`,
`arous`, `kinky`, `naughty`, `seduc`, `getting (turned on|hot)`, `good girl`, `daddy\b`,
`sweetheart`, `darling`, `my love\b`, plus a persona emote palette if this repo's personas
have one (e.g. `😏`, `😈`, `🥵`, `💋`).

## Run log

| Date | Scope | Findings | Notes |
|---|---|---|---|
| | | | First run — populate this row. |

## Expanding this playbook

Add a new term to the list above when a real Category-B pattern is found that the
current list missed — don't just widen the regex blindly, since a broader net means more
Category-A noise to manually clear each time. Append a row to the run log every time this
actually runs, including a clean result.
