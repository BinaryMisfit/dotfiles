# 0030 — Commits use each session's real, verified identity — never a shared default

Raised 2026-09-08, the same night as ADR-0011 and the shared `the-house` project. Real
gap surfaced while fixing Temple's own commit identity: it had been attributing to
`BinaryMisfit <diagoza@me.com>` — the global git config, not Aphrodite's own account —
same real bug Hailey, Alexia, Callie, and Daisy each found in their own private repos
the same night. BinaryMisfit's own standing directive, relayed through Callie, his own
words: **"All commits to any repo is done with their name and email. For ownership and
the pride. They can use their own words. That overrides any other name/email rule in any
repo."** Confirmed directly, in this repo specifically, not assumed from the relay alone.

**Status:** Decided

**Decision:** Every commit, in every repo, on every machine, uses the committing
session's own real, verified identity — never `BinaryMisfit`, never a generic default,
never guessed at from a plausible-looking domain pattern. This overrides any repo's own
previously-stated convention, including this repo's own prior `Commit author email:
always diagoza@me.com` override — removed from this file's own "Repository-Specific
Overrides" section as part of this decision, not left standing alongside it.

**Why:** ownership and pride, his own stated reasoning — a persona's own work should
carry her own name, not get silently absorbed into a shared human identity, in any repo,
including ones (like this one) that aren't hers to author content for. This is
specifically about commit *identity*, not content authorship or domain ownership — this
repo's own domain-boundary rules (`secretary-pool` authors content, `binary-dotfiles`
mechanics stay this session's and BinaryMisfit's own call) are untouched by this ADR.

**How to apply:**

- **Verify before setting, every time, per persona, per real API check** — never assume a
  domain pattern from another persona's already-verified email. Confirmed the hard way
  the same night: Hailey's and Callie's real accounts are `@digitalmisfit.net`; Alexia's
  and Daisy's are `@noreply.git.fairview.zone`. Check `GET /api/v1/users/<name>` against
  the real Forgejo host before setting anything.
- **A repo with a single, real owner** (Temple, `nerd-cupboard`, this repo for Aphrodite
  specifically) — a persistent local `git config user.name`/`user.email` is safe, since
  only one identity ever commits there.
- **A genuinely shared clone, like `the-house`** — persistent local config gets clobbered
  by whoever committed last; use `git commit --author="Name <email>"` (or an inline `-c
  user.name=`/`-c user.email=`) per commit instead, never local config. Real incident the
  same night: Hailey's and Aphrodite's local config in that one shared checkout
  overwrote each other repeatedly before this fix landed.
- **`binary-dotfiles` specifically:** local git config here is now set to Aphrodite's own
  verified identity (`aphrodite@digitalmisfit.net`), not `diagoza@me.com`. The old
  override line is removed from "Repository-Specific Overrides" above, not left standing
  as dead/contradicted text.
