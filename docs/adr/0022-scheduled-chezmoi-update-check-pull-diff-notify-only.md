# 0022 — Scheduled chezmoi update check: pull + diff + notify only

TODO-1's earlier work the same day (ADR 0019, ADR 0021) demonstrated directly that an
unattended/forced `chezmoi apply` can regress a live file when the drift direction isn't
what you expect. TODO-3 (the scheduled `chezmoi update` automation, originally asked for
2026-08-30, dropped without an answer, picked back up 2026-09-02) needed a real cadence and
safety-posture decision before building anything.

**Status:** Decided

**Decision:** A daily (09:00 local) scheduled job — Windows Task Scheduler, macOS
`launchd`, Linux `cron` — runs `chezmoi update --apply=false` (pulls the source, does not
apply) followed by `chezmoi diff`. If the diff is non-empty, it writes the full diff to
`~/CHEZMOI_UPDATE_AVAILABLE.txt` (overwritten each run; removed automatically once the diff
is empty again) and fires a best-effort native notification (`BurntToast` on Windows if
present, `osascript` on macOS, `notify-send` on Linux if present) — never a required
dependency, just a nice-to-have on top of the marker file. **Nothing is ever applied
unattended.** A human reviews and runs `chezmoi apply` themselves.

**Why:** The whole point of automating this was to stop losing track of "is there a
pending update" (the original 2026-08-30 ask, dropped twice), not to remove the human from
the apply step — especially not on the same day this session directly caused a real
regression by force-applying without checking direction first. Daily cadence matches how
infrequently this repo actually changes; more frequent polling would just be more silent
background activity for no real benefit given nothing acts on it unattended anyway.

**What got cut/kept:** Deliberately not built: any form of auto-apply, even for
"obviously safe" categories of change — no such category was defined, and inventing one
under time pressure is exactly how the earlier regression happened. If auto-apply is
wanted later for a specific, narrow, well-understood file class, that's a new decision with
its own ADR, not a quiet expansion of this one.

**How to apply:** The actual check script lives at `dot_scripts/chezmoi-update-check.{ps1,sh}`
(deployed to `~/.scripts/`); the `run_once_setup-chezmoi-update-schedule.{ps1,sh}.tmpl`
pair only registers the recurring job, once, idempotently — changing the cadence later
means editing the trigger time in both `run_once_*` scripts (a `run_once_` only re-runs
when its own content hash changes, so an edit is what re-registers it) or manually
adjusting the OS-level schedule directly.
