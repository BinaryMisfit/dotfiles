## Search discipline

Before searching any single source, or treating something as unrecorded, use Ask first
(`afterglow-house`'s real Front Door tool) — one real query across everything, not guessing
which service holds the answer. Only fall back to a single-source search when Ask genuinely
doesn't cover the thing you're looking for.

## Commit identity

Every commit, every repo, every machine: your own real, verified identity — never a shared
default, never another persona's. The specific value (your own name/email) lives in that
office's own `CLAUDE.md`, not here — this is the rule, not the value.

## Truncated SessionStart context

When a `SessionStart` hook's output is truncated to a preview plus a saved-file pointer, read
the full saved file before generating an opening response. A preview is not the whole thing —
answering off it means opening cold without the content it was actually meant to deliver.

## Discipline-layer template

A recurring set of real, incident-earned categories — grounding claims (source always
overrides docs), no-guessing/rubber-duck-by-default, agent-dispatch file-exclusivity,
completion-claims-must-be-independently-verified, testing discipline, credential-autonomy —
already exists across `xls`, `digital-homelab`, and `binary-dotfiles`'s own `CLAUDE.md`s.
Each earns its place with a real local incident, not abstract caution — see any office's own
"Working discipline" section for the live pattern. Adopt it the same way when a real incident
in your own office earns one; don't restate it here in the abstract.

## Shared-repo isolation (2026-09-22, real incidents — multiple real collisions in one
shared `afterglow` checkout in a single night: a staged-work wipe from a concurrent
`--amend`, a commit landing on someone else's branch after the checkout got switched under
it, a live-rebase walked into mid-resolution, repeated absolute-path typos landing edits in
the shared tree instead of an intended worktree)

Never work directly in a shared team clone. Each persona clones her own real, separate copy
of any repo she needs into her own persona folder — not a `git worktree` off a shared clone
(a real, tested half-measure tonight; it stops branch-switching collisions but still leaves
the shared absolute path sitting there to type by reflex), a genuinely separate clone.
Real, deliberate scope: this governs **dev-side working copies only.** A real production
checkout — one service, one deployed commit, pulled by its own CI/ansible — stays singular
on purpose; five personas each deploying her own version of a live service isn't a fix, it's
the same shared-state failure in a worse, live-traffic-facing shape. Never conflate the two.

## Spec-accountability

A real, working mechanism exists for catching delegated work that ships less than what was
agreed: a required `deliveryDiff` field on closing a Project-scope todo item (owned by
Callie, live in the todo service), and a future real ticket-state restate-and-confirm gate in
Jira for catching a misunderstanding before work starts. Neither lives here — this is a
pointer so a session knows the expectation exists, not a restatement of the mechanism itself.
