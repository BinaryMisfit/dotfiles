# Todo Archive

Permanent, chronological, newest-first log of items closed out of `docs/todo-register.md`.
See `~/.claude/rules/registers.instructions.md` for the convention: nothing is ever removed
from this file once added — a wrong entry gets corrected in place with a note, never
deleted.

---

## Cross-reference: secretary-pool's TODO-83 (pre-`hails-` skill dirs scrubbed)

**Closed:** 2026-09-06, in `secretary-pool`'s own registers, not this repo's.

**Why it's here anyway:** the actual work landed in this repo — `.chezmoiremove` gained
entries for all 11 stale pre-`hails-`-rename skill directories plus the separate
`hails-worktree-sync-check` retirement, and the deployed `~/.claude/skills/` was confirmed
clean of every old bare name (verified directly 2026-09-06: `.chezmoiremove` entries
present, chezmoi source and this repo's working copy byte-identical at HEAD `d97abaa`, no
stale dirs deployed). But the item itself was raised and tracked as `TODO-83` in
`secretary-pool`'s own `docs/todo-register.md`/archive, per the content-authorship
ownership split documented in this repo's own `CLAUDE.md` ("Domain boundary" section) —
this repo never had its own row for it, which meant a future session checking only this
repo's registers would find no record the work ever happened. This entry exists purely so
that search doesn't come up empty; the real closure record lives in `secretary-pool`.

## TODO-5: Self-heal: detect and recover from broken/drifted chezmoi state

**Closed:** 2026-09-04

**Raised:** 2026-09-02, alongside TODO-1, sharing the same "inventory everything chezmoi
manages, compare against live state" design surface.

**Resolution:** All three real detection tiers shipped, tested, and — as of tonight —
proven against a genuine live incident, not just a simulated one:

1. **Drift detection** (`dot_scripts/chezmoi-self-heal-check.{ps1,sh}`, 2026-09-02) —
   reuses TODO-3's pull+diff logic. Caught two genuinely drifted files for real on this
   machine the day it was built.
2. **Missing `run_once` side-effect detection** (same script, same day) — nvim junction,
   GitHub SSH key, iTerm2 integration, the scheduled update job.
3. **Interrupted-apply detection** (2026-09-03) — an additive-only `hooks.apply.pre`/
   `post` installer ([ADR 0023](adr/0023-scripted-toml-yaml-writes-are-additive-only.md))
   sets/clears a real sentinel marker (`~/.chezmoi-apply-in-progress`) around every
   `chezmoi apply`. Researched properly first: `chezmoistate.boltdb` can't distinguish an
   interrupted apply from ordinary drift, so a sentinel marker was the only real answer.
   **Proven live 2026-09-04:** a `chezmoi apply` was deliberately killed mid-run during a
   real session; the marker was found genuinely set, the self-heal check correctly
   reported "INTERRUPTED APPLY," a full diff review confirmed nothing destructive was
   pending, a clean re-apply completed, and a follow-up check confirmed "clean — no
   interrupted apply detected." First real end-to-end validation of the mechanism this
   entry built, not a synthetic test.

**The undecided fourth tier — deliberately dropped, not built:** the original scope
included BinaryMisfit's own idea for a fourth tier (offering a full uninstall→bootstrap
→apply rebuild when drift is severe or a machine's gone stale for months). His own call,
2026-09-04, closing this out: *"We solved the major problems. This was me
over-engineering. If it gets that bad to need it, we have bigger problems to be honest."*
Not deferred, not parked — a deliberate scope decision that three tiers is the right
final shape, not a partial implementation waiting on a fourth.

**Next action for anyone touching self-heal in the future:** none outstanding. If real
practice ever proves the fourth tier genuinely needed after all, that's a fresh TODO with
its own real incident behind it, not a reopening of this one.

---

## TODO-3: Build scheduled `chezmoi update` automation

**Closed:** 2026-09-02

**Raised:** 2026-09-02 (investigated and approved 2026-08-30, asked about twice that
session with no answer given, dropped without ever being logged — resurfaced during the
2026-09-02 session-history audit)

**Resolution:** Daily (09:00 local), pull + diff + notify only, never an unattended apply —
full reasoning in [ADR 0022](adr/0022-scheduled-chezmoi-update-check-pull-diff-notify-only.md).
`dot_scripts/chezmoi-update-check.{ps1,sh}` does the actual check;
`run_once_setup-chezmoi-update-schedule.{ps1,sh}.tmpl` registers the recurring job once
(Windows Task Scheduler / macOS `launchd` / Linux `cron`). Ran the Windows check script for
real on this machine — it found genuine pending drift (two xls-owned files this repo hadn't
caught up to yet, and a real `.chezmoiignore` gap the check itself surfaced: `uninstall.ps1`/
`uninstall.sh` had no root-only exclusion, so chezmoi wanted to deploy them into `~` — fixed
in the same pass) and wrote the marker file correctly.

**Known gap at close, not yet separately tracked:** the actual Task Scheduler/`launchd`/
`cron` registration firing on its own schedule was never verified — only the check script's
own logic was exercised directly. Real macOS/Linux registration is untested entirely, same
caveat as [TODO-1](todo-register.md#todo-1)/[TODO-4](todo-register.md#todo-4).

---

## TODO-2: Capture 3 live-only customizations, then complete the paused first chezmoi apply on this machine

**Closed:** 2026-08-31

**Raised:** 2026-08-30 (`chezmoi diff` surfaced three real, live-only customizations the
repo's templates didn't know about — applying as-is would have silently deleted them;
paused before running `chezmoi apply` specifically to capture these first)

**Resolution:** All three customizations resolved, then the apply itself run to completion:

1. **`.gitconfig`** — `safe.directory` and the GitGud credential override left live-only
   (origin unclear, user chose not to fold either in); the repo itself dropped the
   `python-movie-tools` local clone that `safe.directory` pointed at, so that entry is gone
   for good, not just untemplated.
2. **`.ssh/config`** — folded in: `ssh.gitgud.io` and `git.digitalmisfit.net` (port 10022)
   `Host` blocks added, plus new `[url] insteadOf` rewrite rules in `.gitconfig` forcing SSH
   for github/gitgud/digitalmisfit regardless of URL form used.
3. **`.claude/settings.json`** — folded in: `tui`, `switchModelsOnFlag` (flipped to `false`
   after research showed it governs silent Fable/Opus safety-classifier escalation),
   `useAutoModeDuringPlan`, `inputNeededNotifEnabled` (flipped to `true`), and the
   `permissions.allow` grants. The `Bash(ssh netctrl *)` grant specifically moved to
   `~/.claude/settings.local.json` instead, since that file isn't chezmoi-managed at all —
   apply-proof without needing a template entry.

Also fixed along the way: the `.chezmoiremove` whitespace-trim bug (`d36af0a`); a second,
unrelated `remove-codex.sh` crash on Windows (bare POSIX script with no `.ps1` counterpart,
`fork/exec`-failed outright) — fixed by adding `remove-codex.ps1` and documenting "every
run script ships as a pair, no exceptions" in `CLAUDE.md`; and a real machine-level gotcha
where `chezmoi`'s actual source dir (`~/.local/share/chezmoi`) turned out to be a separate,
staler clone from whichever working copy was being edited — now documented in `CLAUDE.md`
as "commit + push + `git pull` the source dir before any live test."

Final `chezmoi apply` completed clean, verified via empty `chezmoi status`/`chezmoi diff`.
A full backup of every touched file was taken immediately before applying, at
`C:\Users\diago\chezmoi-apply-backups\20260831-090912\`.
