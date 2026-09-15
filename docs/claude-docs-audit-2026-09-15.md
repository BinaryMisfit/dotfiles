# Claude Code documentation audit — 2026-09-15

Real, one-time audit, not a running register — BinaryMisfit's own "First Task" ask, run by
Aphrodite. Review-only per his own instruction; nothing here has been edited as part of
this task. Two unrelated fixes landed earlier the same session (Aphrodite's own persona-file
addition, `binary-dotfiles`'s session-start-playbook.md migration) — pre-date this task,
not part of it.

## Scope

Every `CLAUDE.md`/`AGENTS.md`/Claude-Code-facing instruction file across every repo on this
machine, plus the global `~/.claude/` config. Repos checked: `binary-dotfiles`,
`secretary-pool`, `digital-homelab` (+ 4 submodules), `afterglow`, `xcl/xls`,
`xcl/xls-playthrough`, `xcl/x-lifestyle-research`, `Persona/Home/the-house`, and the five
persona private repos (Alexia/Aphrodite/Callie/Daisy/Hailey).

## First-pass findings (file-level: what exists, what's stale)

### Real staleness bugs — concrete, fixable, low-risk

1. **`xcl/xls-playthrough`'s `CLAUDE.md` + `worktree-fleet-check` skill** still describe the
   8-worktree standing fleet retired 2026-09-08 (ADR-0035). Root `xls` was updated; this
   worktree's branch never got it.
   **Routing: hand to Callie (`xcl` domain owner) when work starts on this.**
2. **`xcl/xls`'s root `CLAUDE.md`** references the registers convention via ADR-0020 without
   noting ADR-0020 is itself superseded (ownership moved to `secretary-pool`) — a trap for a
   future cold read.
   **Routing: hand to Callie when work starts on this.**
3. **`digital-homelab/homelab/home-haos`'s** audit doc is dated 2026-04-27, self-flagged as
   needing a refresh, real drift already confirmed (switch-domain entity count 142→106 as of
   2026-08-29 — itself now a month stale).
   **Routing: hand to Alexia (`digital-homelab` domain owner) when work starts on this.**

### Dropped from this track

4. **`binary-dotfiles`'s `k1ra.md`** — BinaryMisfit's own work persona file, not relevant to
   this audit. No action.

### Queued for the second review pass (not acted on yet)

5. **`binary-dotfiles`'s old work-profile skills** (`branch-start-work`, the `jira-*` suite,
   `pr-prep-and-submit`, `commit-ready-check`, `continuation-context-pack`,
   `defect-workflow`, `feature-workflow`, `jira-post-fix-update-comment`,
   `jira-post-qa-test-plan`, `jira-transition-status`, `jira-unassign-ticket`,
   `post-pr-cleanup`, `project-setup`) — all dated 2026-05-13, four months untouched, no
   ownership/domain claim the way the `hails-*` suite has. **BinaryMisfit's own call:**
   review whether superseded or need re-implementation before any work starts.
6. **`afterglow`** — real, actively-developed infra repo (auth-issuer, threads, house
   services), zero `CLAUDE.md`. **BinaryMisfit's own call: needs one.** Queued, not built yet.
7. **The five persona private repos** — none have a `CLAUDE.md`/`AGENTS.md` (consistent
   across all five, not drift). Whether that's intentional or a real gap: **decide from the
   second-pass content review below**, not standalone.
8. **`secretary-pool` itself** — no root `CLAUDE.md` of its own, despite being the canonical
   author of the deployed global config. Same as #7: **decide from the second-pass content
   review.**

## Second pass — instruction-level content comparison (in progress)

Goal: read every real `CLAUDE.md` in full, categorize its actual instruction content (not
just file existence), and find what's genuinely repo-specific vs. what repeats near-
identically across repos and is a real candidate for a shared/canonical base. Precedent
already exists for this shape: `xcl/xls`'s own `.claude/claude.template.md` was already
extracted from its root `CLAUDE.md` as a domain-agnostic starting template.

## Second-pass findings — the actual merge question

**Core finding: a real, proven "discipline layer" already exists and recurs — grounding
claims (verify against real source, never trust upstream docs as truth), design/reference
file handling, no-guessing/rubber-duck-by-default, parallel-agent-dispatch discipline (file
exclusivity, no unsupervised sub-delegation, verify completion claims independently),
coding-standards-match-the-codebase, submodule/worktree gotchas, testing discipline,
authorship constraints, credential-autonomy rules.** Where it exists, it earns its place —
every repo that has it cites a real incident that made the rule necessary, not abstract
caution.

**Where it actually lives, right now:**
- **`xcl/xls`'s own root `CLAUDE.md`** is the richest, original copy — every category
  present, each one sharpened past the generic version with real incident citations (commit
  hashes, dates, named scripts). This is where the discipline layer was actually born.
- **`xcl/xls`'s own `.claude/claude.template.md`** was extracted from that file 2026-08-27
  as a domain-agnostic starting point for new projects. **It's now stale relative to its own
  source** — `xls`'s root file has grown substantially since the extraction (more incidents,
  more detail in every category) and the template was never refreshed to match.
- **`digital-homelab`'s root `CLAUDE.md`** independently covers most of the same categories
  (grounding claims, no-guessing, agent-dispatch, submodule/worktree gotchas) with its own
  real sharpening — but reinvented rather than started from the template. Real overlap,
  real independent authorship, no shared source.
- **`binary-dotfiles`'s own `CLAUDE.md` has none of it at all.** Zero grounding-claims rule,
  zero agent-dispatch file-exclusivity rule, zero "a completion claim about git state must
  be independently verified" rule — despite this exact audit running many parallel agents
  today, and despite this repo's own documented history already containing the precise
  failure shape these rules exist to prevent (the `pick-persona.js` force-apply overwrite
  that silently deleted a live bug fix; more than one drift-check incident where a stale
  local copy nearly clobbered live state).
- **`xcl/xls-playthrough`** carries the same rich content as `xls` root almost verbatim
  (~85% identical) — confirmed accidental staleness on the fleet-retirement section, not
  intentional divergence, plus one more real gap found in this pass: it's also missing
  root's 2026-09-10 authorship-note clarification (git-author-field history, Hailey→Callie
  persona-author transition). Folding both into the same tracked hand-off to Callie.
- **Global `~/.claude/CLAUDE.md`** is a genuinely different, orthogonal layer (persona
  identity, registers, comms, time-model) — no overlap with the discipline layer above, and
  correctly kept separate.
- **`secretary-pool`** has no root `CLAUDE.md` and no cited incident suggesting it needs
  one — its own real content lives in ADRs and per-script docs, and it isn't a codebase an
  agent works against with the same "confidently wrong" risk `xls`/`digital-homelab`/
  `binary-dotfiles` carry. Real open question for the second review, not a clear gap.

### What this actually means for "canonical set"

1. **Refresh `xls`'s own `.claude/claude.template.md` from its current, richer source first**
   — anything built from the stale version (a future `afterglow` `CLAUDE.md`, for instance)
   would start from an already-outdated base.
2. **`binary-dotfiles` is the real priority adoption target**, not `afterglow` — it already
   has the real incidents that justify every category in the discipline layer, it's just
   never written them down as standing rules the way `xls`/`digital-homelab` have.
3. **`afterglow`'s new `CLAUDE.md`** (queued, item 6) should start from the refreshed
   template rather than being written from scratch.
4. **Not proposing a single shared/included file mechanism** (Claude Code has no native
   cross-repo `@include` outside one repo's own tree) — the real fix is: keep the template
   as the one canonical starting point, refresh it when its source repo's own copy grows,
   and treat each repo's adopted copy as free to diverge with real incident citations the
   same way `xls`'s own copy already has. Duplication of *text* is fine and expected; the
   actual failure mode to avoid is the template itself going stale while repos copy from it,
   which has already happened once.
