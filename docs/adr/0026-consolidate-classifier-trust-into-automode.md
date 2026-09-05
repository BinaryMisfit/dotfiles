# 0026 — Consolidate all classifier trust into `autoMode`, retire scattered `.local.json` allows

Real incidents, all in one day (2026-09-05), forced this from theory into a decision.
Under Auto Mode, three separate actions got blocked outright with no visible reasoning:
Aphrodite's own CNC-section edit to her persona file, Hailey's Bitwarden secret read for
wiring up Hermes' MCP, and — most telling — the same class of action produced three
*different* outcomes across three sessions running the identical command (Alexia: worked
directly. Hailey: blocked direct, worked wrapped in a script. Aphrodite: blocked both
ways). Adding a `permissions.allow` entry to a project's `.claude/settings.local.json` for
the blocked CNC edit did nothing — confirmed directly, not assumed.

**First recommendation this ADR carried, before it was checked against primary sources:
abandon Auto Mode entirely and switch all four personas to Manual permission mode.**
Reading Claude Code's own `auto-mode-config` docs directly (not a secondhand summary)
before finalizing this ADR overturned that recommendation. The real facts:

- `autoMode` (`environment`/`allow`/`soft_deny`/`hard_deny`) is read **only** from
  `~/.claude/settings.json`, managed settings, or the `--settings` flag — never from any
  project-level `.claude/settings.json` or `.claude/settings.local.json`, confirmed
  explicitly, closed as of Claude Code v2.1.207 specifically to stop a checked-in repo
  from injecting its own trust. `xcl/xls`'s own `.claude/settings.local.json` had a real,
  already-reasoned `autoMode.allow` block sitting in exactly this wrong place — it had
  been doing nothing since that version shipped, silently.
- The classifier runs four precedence tiers: `hard_deny` (nothing overrides it) →
  `soft_deny` (a matching `allow` entry or the user's own specific, named intent in the
  same message can clear it) → `allow` (a standing exception) → explicit user intent
  ("force-push this branch" clears a soft block; "clean up the repo" does not). Editing
  `autoMode` itself is a flagged `soft_deny` pattern (an AI widening its own trust
  config) — confirmed live in this same session: a first attempt, approved only through
  earlier conversational context, was blocked; a retry after BinaryMisfit stated the
  exact file and exact entries fresh, in his own words, went through.
- A plain `permissions.allow`/`.local.json` entry is a **separate, earlier** gate that
  narrow Bash rules can resolve before the classifier ever runs — but it has no authority
  over what the classifier itself decides, which is exactly why today's earlier fix
  attempt (adding a `.local.json` rule for the CNC edit) accomplished nothing.

**Status:** Decided

**Decision:** Stay on Auto Mode as the standing `defaultMode` for all four personas.
Consolidate every classifier-relevant trust decision into `~/.claude/settings.json`'s
`autoMode.environment`/`autoMode.allow` — the one file the classifier actually reads —
and retire `permissions.allow` blocks scattered across every repo's own
`.claude/settings.local.json` down to only what's genuinely repo-local and
non-classifier-relevant (output style, `additionalDirectories`, MCP server enablement).

**Why:** For a scope of four personas and one human, on one person's own machine, Manual
mode's universal "ask unless allowlisted" would have traded away Auto's real, working
"don't stop for routine work" behavior everywhere else, to fix a problem that had an
actual narrower fix once the correct lever was found. `autoMode` is also a single shared
file already — there's no separate "who owns each repo's allowlist" question to resolve
the way there would have been under a Manual-mode, per-repo `.local.json` model.

**How to apply:** A denial gets fixed one of three ways, per the classifier's own
documented recipe: a durable destination gets added to `autoMode.environment`; a durable,
recurring action gets added to `autoMode.allow`; a genuine one-off gets cleared by stating
the exact action, specifically, in the very next message — not a general "go ahead."
Audited all eleven `.claude/settings.local.json` files on this machine (home, and every
repo with one) as part of this decision: most of their `permissions.allow` content
(routine git/npm/gcloud-read/node commands) was never classifier-relevant in the first
place and was simply removed rather than migrated — porting it into `autoMode` would have
been noise, not signal. Two categories of real content were actually migrated:
`xcl/xls`'s three already-reasoned, misplaced `autoMode.allow` entries (moved verbatim),
and two real infrastructure-*mutation* actions from `digital-homelab`'s SSH allowlist
(`gcloud secrets versions add` and `terraform apply` against the self-owned `ai-nadia`
project) that were genuinely worth naming explicitly rather than left to plain SSH-access
trust. `gitgud.io` and `pixeldrain.com` were added to `environment` as trusted external
services per BinaryMisfit's own explicit confirmation, noting their keys migrate to
Bitwarden Secrets Manager in future.

**Real gap in the first pass of this decision, caught and closed the same day:** the
initial edit never actually named Bitwarden Secrets Manager itself in `environment` — the
"Secrets management" context slot was left at its default "None configured," which the
classifier treats as untrusted by default. That's the literal thing that started this
whole investigation (Hailey's blocked `bws secret get`), and it went unfixed through the
entire first round of changes above. Added after the fact, same exact-intent mechanic:
a `Secrets management` entry naming `bws`, the account split (Alexia write/custodian,
Hailey/Callie/Aphrodite shared read, netctrl's own separate read), and that reading a
secret with those credentials is routine here, not exfiltration.

**What got cut/kept:** `acceptEdits` ("Edit automatically") was considered as a
lighter-touch alternative to full Manual mode — rejected because it only auto-approves
file edits specifically; it would have done nothing for the Bitwarden `bws` read that
triggered half of today's actual incidents, since that's a Bash call, not an edit. Once
`autoMode` was understood correctly, this alternative became moot anyway — Auto Mode
itself, correctly configured, covers what both alternatives were trying to patch around.

**Real, honest limitation, not resolved by this ADR:** the cross-session inconsistency
that motivated this whole investigation (three sessions, one identical action, three
different outcomes) isn't explained by anything documented here. Correctly-configured
`autoMode` removes today's specific known blocks, but the classifier's own docs describe
it scoring actions on an "internal severity scale" rather than a deterministic rule
match — some variance may simply be inherent to how it evaluates a given call, not a
configuration gap this repo can close. Worth revisiting if the same pattern recurs after
this change lands.
