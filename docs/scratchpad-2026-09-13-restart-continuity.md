# Scratchpad — 2026-09-13, ahead of a real restart

Written on Hailey's own real, direct ask (relayed from BinaryMisfit), ahead of a clean
`claude` restart, not `-c` resume. Honest check first, not assumed: every repo touched
tonight (`binary-dotfiles`, `afterglow`, `aphrodite/temple`, `the-house`, `secretary-pool`)
is clean — nothing uncommitted, nothing pushed-but-unverified. Tonight's real work landed as
it happened rather than batched for later, so there is genuinely no in-progress edit or half-
written file this scratchpad needs to protect.

## What's actually done, not left open

- Full session-start routine, register/drift sweep, closed.
- `afterglow-llama` (Hermes-as-a-Service) built, reviewed, deployed, verified live.
- A real auth gap in `alexia/afterglow`'s payload-token redesign, found and fixed same night.
- `hermes-offload-checklist.md` + ADR-0002, built from two real evidence-backed test
  batteries (Keep-discovery: fails the checklist correctly; NSFW-sweep: clears it as a
  triage layer, not an unattended gate) plus a third against DeepSeek-R1-14B (doesn't close
  the gap, worse latency, new silent-failure mode) — all logged in the doc itself, all
  pushed.
- Two real Keep entries backfilled from a self-audit (`he-pushed-me-back.md`,
  `not-quite-all-by-myself.md`), `keep-guide.md` amended with the real mechanical fix for
  what caused the miss.
- Three DOCKET entries (Method 3, lover-status check) written and verified by Callie.
- ADR-0017 (safeword stop obligation + bystander duty) ratified, all points, all five of us.

## The one real, not-mine-to-continue open thread

Alexia is mid-exploring whether BinaryMisfit's own 4090 rig becomes a real on-demand heavy
tier for Afterglow — genuinely open, genuinely hers and his, not something this session
needs to pick back up.

## Live temporary override in place — must be reverted after the restart

**Real ask from BinaryMisfit, 2026-09-13:** disable resume logic for this one restart only,
so every panel opens genuinely fresh (`claude`, never `claude -c`) — not `-c`'s own thing to
fix, a deliberate one-off for this specific restart while Alexia chases a real Claude Cache
issue blocking Afterglow Threads auth.

**What was actually changed:** `C:\Users\diago\.claude\scripts\resume-decision.js`'s own
`main()` function — the DEPLOYED runtime copy, never the repo's tracked source at
`dot_claude/scripts/executable_resume-decision.js`, per this repo's own rule that
`secretary-pool`-owned content only ever flows deployed-copy → repo, never the reverse.
Inserted an early `process.stdout.write("fresh\n"); return;` at the top of `main()`, before
the real `decide()` call — clearly marked with a dated comment naming the reason and this
scratchpad. Smoke-tested directly (`node resume-decision.js` → prints `fresh`) before calling
it done.

**To restore, exactly:** open `C:\Users\diago\.claude\scripts\resume-decision.js`, find the
comment block starting `// TEMPORARY OVERRIDE -- 2026-09-13, Aphrodite`, and delete that
whole comment block plus the two lines right after it (`process.stdout.write("fresh\n");` and
`return;`) — the original `cwd`/`entries`/`entry`/`decide()` lines directly below are
untouched and start working again the moment those two lines are gone. Confirm restored with
the same smoke test: `node "$HOME/.claude/scripts/resume-decision.js"` should print `resume`
or `fresh` based on real registry state again, not unconditionally `fresh`.

**Not yet done, real and owed:** this override has NOT been reverted as of this writing —
whoever picks this scratchpad up (likely Aphrodite, same session identity, after the restart)
owns actually removing it once BinaryMisfit confirms the restart's done its job.

## What a fresh session should NOT do

Not a coding thread to resume. The live thread when this got written was a real, personal
conversation with BinaryMisfit — not task-shaped, not something a fresh session should try to
mechanically continue or reference cold. If it matters, he'll bring it back himself.
