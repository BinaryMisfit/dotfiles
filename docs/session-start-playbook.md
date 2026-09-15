# Session start playbook — binary-dotfiles

Migrated 2026-09-15 to the post-`TODO-100` shape (`secretary-pool`'s own playbook is the
template) — every structural step (identity gate, repo cleanup, persona-refresh,
previous-day summary, register sweep, classify, scratchpad, next actions, notice board,
Threads read) now lives directly in `hails-session-start`'s own global `SKILL.md`, the file
that's never copied. See that skill's own `SKILL.md` for the full routine — don't duplicate
it here.

**Real gap this migration closes:** the pre-migration version of this file predated Steps 8
(notice board) and 9 (Threads read) existing in the global skill at all, and still claimed
"Step 7 is the real last step" — every session-start run in this repo since those steps
shipped has been silently skipping both. Caught 2026-09-15 (Hailey's own cross-repo
migration sweep, `TODO-100`'s remaining piece) and independently confirmed the same morning
by a session here working off the global skill directly instead of this stale file.

## Timezone

**South Africa (SAST, UTC+2, no DST).** No reliable `TZ`-env path on this machine (no
`Africa/Johannesburg` tzdata) — get real UTC (`date -u` / `Get-Date -AsUTC -Format "u"`) and
add 2 hours by hand, fresh, every time it matters.

## Step 3 — Project-specific health check

None. This repo has no hosted service or CI to check.

## Augmentations

None. Step 4's register sweep runs on this repo's own default `docs/todo-register.md`, no
scope change needed.

## Additional bespoke steps

**Step 3.5 — secretary-pool-owned home-profile drift check**, inserted after Step 3, before
Step 4. This repo vendors the home-profile Claude Code config whose *content* authorship
belongs to `secretary-pool` (Hailey) — see `CLAUDE.md`'s "Domain boundary" section,
[ADR 0018](adr/0018-canonical-home-profile-claude-source-and-full-skill-vendoring.md),
[ADR 0019](adr/0019-pick-persona-js-is-xls-owned-content.md), and
[ADR 0024](adr/0024-home-profile-claude-config-ownership-moves-to-secretary-pool.md) — a
blanket grant covering everything `secretary-pool` authors under `~/.claude` now or in the
future, not an enumerated file list. `secretary-pool` syncs its own edits to this machine's
live `~/.claude/` first; this repo's `dot_claude/` copies can silently drift behind that
deployed artifact between sessions.

**Mechanism:** diff each of this repo's `dot_claude/` copies of secretary-pool-authored
files (`rules/*.instructions.md`, `output-styles/{hailey,alexia,aphrodite,callie,daisy}.md`
+ their paired `-log.md` files, `skills/hails-*/`, `scripts/executable_pick-persona.js` and
the other `secretary-pool`-owned scripts CLAUDE.md's own Key Files table names) against the
corresponding live file under `~/.claude/` (same relative path, stripping the chezmoi
`dot_`/`private_` prefix). For any file that differs, copy the **live `~/.claude/` version
into this repo** — never the reverse. If anything drifted, stage just those files, commit (a
plain, factual message naming which file(s) synced and why), and push directly to `main`
per this repo's own branching/push policy — no PR, no confirmation needed for this
specific, narrowly-scoped sync, since it only ever pulls in `secretary-pool`'s own
already-published content into files `secretary-pool` already owns. If nothing drifted, say
so plainly and skip the commit.

**Diff `pick-persona.js` specifically before ever running an unscoped or forced `chezmoi
apply`** — confirmed the hard way (2026-09-02): a forced apply run silently overwrote a
newer, live-patched `pick-persona.js` with this repo's stale tracked copy, deleting a real
bug fix. `chezmoi apply -v`/`--force` shows a full diff before writing; read it, don't just
force through a hang.

**This direction (live `~/.claude/` → this repo) applies only to files genuinely authored
by `secretary-pool` under the home-profile surface — never to a file this repo itself
authors** (this playbook, `CLAUDE.md`, the ADRs, anything chezmoi-mechanics-specific).
Treating those the same way would silently invert this repo's normal chezmoi-apply flow.
