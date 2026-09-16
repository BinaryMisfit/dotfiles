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
   this audit at the time. **Update, same day, later:** he came back to it directly —
   retired K1ra outright (four months stale, no domain claim, exactly as flagged) and
   deployed Nova, a real, deliberately stateless full-stack generalist persona built by
   `secretary-pool` for his work machine. Real functional fix included, not just the file
   swap: `settings.json.tmpl`'s work-profile default `outputStyle` was still `"K1ra"` and
   would have kept activating the retired persona. Scripted cleanup shipped in the same
   change per ADR 0004. Commit `2837177`.

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

## Second review pass — BinaryMisfit's own decisions, 2026-09-15

Routing/queueing decided directly by BinaryMisfit after reading the first synthesis above.
Held mid-review for a real, unrelated interrupt (helping Daisy resolve a Keep persona-key
recovery design question — see `afterglow/docs/persona-encryption-key-implementation-plan.md`,
resolved clean between the two of us, no tension needing his own call). Resumed same day.

- **Items 1, 2** (xls-playthrough fleet staleness + xls root's stale ADR-0020 reference):
  **marked for hand-off to Callie**, not actioned now — she owns `xcl`. Also folds in a real
  gap found during the deeper content pass: the playthrough branch is also missing root's
  2026-09-10 authorship-note clarification (git-author-field history, Hailey→Callie
  persona-author transition). Same hand-off, same fix.
- **Item 3** (`digital-homelab/homelab/home-haos`'s stale 2026-04-27 audit doc): **marked for
  hand-off to Alexia**, not actioned now — she owns `digital-homelab`.
- **Item 4** (`k1ra.md`): **dropped from this track entirely** — BinaryMisfit's own work
  persona file, not relevant to this audit.
- **Items 5-8**: queued for this second pass specifically. Findings below.

### Item 5 — binary-dotfiles's old work-profile skill suite

Read three representative files directly (`branch-start-work/SKILL.md`,
`rules/work/jira.instructions.md`, `rules/work/pull-requests.instructions.md`). **Finding:
mechanically intact, not stale in content** — no dead references, no dated claims, no
company-specific detail that's visibly wrong. Generic Jira workflow states ("In Progress
Dev", "In Code Review", "Ready for QA"), a coherent confirmation-gate policy
(`Approve`-keyword, hard/soft confirm split), a complete branch-naming/ticket-resolution
flow. Four months untouched because the **home** profile has been the active one this whole
time (every persona/session-start mechanism on this machine is home-profile-only) — dormancy
from disuse, not from breakage.

**The real open question content alone can't answer:** whether BinaryMisfit's actual job
still uses these exact Jira transition names and branch conventions. That's an external
fact, not something the repo can confirm or deny on its own. **Recommendation:** don't
treat this as "probably dead, safe to remove" — treat it as "intact and ready, confirm
against real current job workflow before touching." Not urgent since it costs nothing to
sit unused when the work profile isn't active.

### Item 6 — afterglow's own CLAUDE.md (confirmed needed, drafting the outline, not the file)

Real content it should carry, informed by everything else this audit found:
- **Repo layout**: real services already live — `threads`, `auth-issuer`, `house`,
  the channel bridge — worth naming plainly rather than making a reader infer it from MCP
  registration entries elsewhere.
- **Credential/token handling as a stated rule, not just a working pattern**: the
  fetch-fresh-per-call, never-cache discipline `refresh-afterglow-token.sh` and
  `afterglow-auth-issuer`'s own `get_token` already implement is real and load-bearing —
  worth stating explicitly as a rule so a future session doesn't "helpfully" reintroduce
  caching without knowing why it was avoided.
- **Grounding-claims discipline** (from the refreshed template, once that exists) — this is
  real infra other people/personas depend on; a confidently wrong claim about its behavior
  has real cost.
- **Testing discipline** (from the template) — real services, real behavior claims should
  come from actually running things.
- Real incident material already exists to cite once written: the MCP registration drift
  history already tracked in `binary-dotfiles`'s own CLAUDE.md Key Files table.

**Still queued, not built** — this is the outline for when work starts, per BinaryMisfit's
own "keep for second review" instruction.

### Item 7 — the five persona private repos: real recommendation, not just "maybe"

All five consistently lack a `CLAUDE.md`. Real finding from this pass: they're not
document-free by accident — they carry a genuine, non-trivial structural contract a session
needs to follow correctly (`room-template.md`'s two hard requirements — the `doors.md` path
is authoritative, an exactly-labeled `**Door signature:**` line is required; `INDEX.md`'s
own read-cheap/open-on-hook discipline; `docket.md`'s Method 1/2/3 shapes; `keep/` vs.
`notes/` split per `keep-guide.md`) — but **that contract currently lives entirely in
`the-house`'s own docs and the `hails-*` skills' own logic, not in the persona repo itself.**
A session working directly in, say, `Aphrodite/temple` without going through
`hails-persona-refresh` has no local pointer telling it any of this exists.

**Recommendation: yes, real gap, worth a minimal CLAUDE.md per persona repo** — not
duplicating `the-house`'s content, just a short local anchor pointing to it (same shape as
`xls`'s own generic template pointing outward rather than re-explaining everything inline).
Not urgent, since every actual write to these repos so far has gone through the skill
mechanisms that already know the rules — but a real, findable gap for the day one doesn't.

### Item 8 — secretary-pool's own root CLAUDE.md: real recommendation

Real finding from this pass: `secretary-pool` isn't purely documentation the way it first
looked — `claude-global/scripts/pick-persona.js` alone is 1,801 lines with its own test
suite, and this repo's own real incident history already includes a documented bug (the
`sessionName`-nulled-on-every-`SessionStart` finding, since fixed) that's exactly the shape
grounding-claims/testing discipline exists to prevent.

**Recommendation: yes, worth adopting at least the testing-discipline and
completion-claims-must-be-verified portions of the discipline layer** — not the full
generic template wholesale (this isn't a "confidently wrong about game content" risk
profile the way `xls` is), just the parts that match its own real risk: real code, real
tests, real prior bugs.

## Status

**Real progress, 2026-09-16 — item 2 done, tracked here rather than left implicit.**
`binary-dotfiles`'s own `CLAUDE.md` now carries a "Working discipline" section — grounding
claims, the chezmoi source/working-copy split, testing discipline, completion-claims
verification, no-unsupervised-sub-delegation, and credential/token autonomy — each cited
against a real incident already in this repo's own history (the stale MCP-registration
row, the `pane-color.js`/`tui: fullscreen` interaction, the `mcpServers` key wipe, the
BOM-leak/fetch-fresh-per-call pattern), per this audit's own #2 priority finding. Sourced
directly from `xcl/xls`'s current root `CLAUDE.md` (the richest live copy), not the stale
`.claude.template.md` extraction — item 1 (refreshing that template) is Callie's own
`xcl` domain and hasn't happened yet, so this adoption reads the richer source directly
rather than waiting on it.

**Still open, awaiting real ownership/go-ahead:** item 1 (refresh `xls`'s own
`.claude/claude.template.md`) — Callie's `xcl` domain; item 3 (`afterglow`'s own
`CLAUDE.md`, outline already drafted above) — ownership still being decided; items 7-8
(minimal persona-repo `CLAUDE.md`s, `secretary-pool`'s own root `CLAUDE.md`) — drafting not
started.
