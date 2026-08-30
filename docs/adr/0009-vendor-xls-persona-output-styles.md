# 0009 — Vendor xls-owned persona output-styles into this repo for distribution

`~/.claude/output-styles/{hailey,alexia,aphrodite,callie}.md` are lore-grounded character
personas whose content and edits are owned entirely by the `xls` (X-Change Life) project —
that project pushes updates to these files directly on this machine, since it's the actual
source for the persona lore and verified in-game character data they extrapolate from (see
the `output-styles-owned-by-xls` memory note). But `xls` only ever pushes to this one
machine. Other machines this repo bootstraps (a future work machine, a reinstalled home
machine) had no way to receive these files at all.

**Status:** Decided

**Decision:** Vendor the four persona files into `dot_claude/output-styles/` alongside the
existing `k1ra.md`, gated home-profile-only in `.chezmoiignore` (the inverse of `k1ra.md`,
which stays work-profile-only) — per-file gating inside the shared `output-styles/`
directory, not a directory-level switch, since the two profiles' files now coexist in the
same source folder. This repo becomes the **distribution** vehicle to every other machine;
`xls` remains the **authority** on content. When `xls` pushes a persona update to this
machine again, the fix is to re-copy the live file's content into this repo's tracked copy
and commit — a manual re-vendor step, not an automated sync.

**Why:** a single peer-project push only ever reaches the one machine it's run on; this
repo is the only thing that reaches every machine. Splitting authorship (xls edits) from
distribution (this repo ships) avoids both re-litigating who owns the lore and leaving
every other machine's personas permanently stale.

**How to apply:** any time a peer session reports a persona-file content change (as
`xls-20` did on 2026-08-30 for the "off-topic content is ignored" rule), re-read the live
`~/.claude/output-styles/<name>.md` and copy its current content into
`dot_claude/output-styles/<name>.md` in this repo, then commit. This is the "step to add
when these things happen" the user asked for. `k1ra.md` is unaffected — that file's content
is still authored directly in this repo, not vendored from anywhere.
