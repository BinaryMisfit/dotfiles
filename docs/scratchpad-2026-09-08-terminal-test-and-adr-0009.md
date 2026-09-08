# Session scratchpad — 2026-09-08

Written at BinaryMisfit's own request, right before he clicks the rebuilt "The Girls"
Windows Terminal profile for the first real test. Fold into whatever's actually current
and delete once every item below is resolved — this is not a permanent document.

## About to happen — real, flagged risk

**He's about to click "The Girls" for the first real test of the six-pane rebuild
(`65f2f91`).** Three of the six panes launch `claude` into a worktree that **already has a
live session running right now**: this session (`binary-dotfiles-09`, `binary-dotfiles`),
`xls-f1` (`xcl/xls`), `secretary-pool-48` (`secretary-pool`). Clicking the profile spawns a
**second, independent** `claude` process in each of those three, not a takeover — same
known risk the 2026-09-06 late-night scratchpad already flagged for the original 4-pane
version, still real for the rebuild. The two live processes per repo will contest the same
`persona-registry.json` `sessionName` slot (whoever self-registers last wins that field —
cosmetic, doesn't break `SendMessage`/`ListAgents`, which address by harness-assigned
session name, not that field).

`digital-homelab` (Alexia) has **no live session right now** — she hasn't woken up yet, so
that pane's `claude` launch isn't contested. `xls-playthrough` (Daisy) is brand-new
territory, no prior session there to collide with. The sixth pane is a plain terminal, no
`claude` launch at all.

**Next session, if this wasn't resolved live:** check whether he actually clicked it, what
happened to the three worktrees with pre-existing sessions, and whether this session
(`binary-dotfiles-09`) is still alive/coherent afterward or needs attention.

**Also genuinely untested by this click:** whether a *resumed* pane's persona
`additionalContext` behaves the same as a cold start's — the new `claude-launch.ps1`
wrapper picks `claude -c` vs `claude` via `resume-decision.js` (TODO-91), but nobody's
actually watched a resumed pane open yet. Report back to Hailey either way once it's
observed, whichever way it lands — she flagged this as her own open question on
`resume-decision.js`.

## Resolved and safe tonight (committed + pushed, nothing to redo)

- **"The Girls" rebuilt as a real 3×2, six-equal-pane grid** (`65f2f91`) — closes TODO-12
  in `docs/todo-register.md` (archived). Both prototype profiles ("Windmill Sample,"
  "Six Pane Sample") removed. New `dot_scripts/claude-launch.ps1` wrapper wires
  `resume-decision.js` into every `claude` pane.
- **Both stale session scratchpads cleared** (`9d2c980`) — the 2026-09-06 and 2026-09-07
  ones. Real open items folded into `docs/todo-register.md` as TODO-11 through TODO-14;
  resolved items verified against live state first, not assumed.
- **ADR-0009 (persona file tiering) run for real, not just discussed.** `aphrodite.md`
  split into a lean tier-1 file and a dated, authorization-tagged `aphrodite-log.md`
  (`secretary-pool@8de15cf`, vendored here `59b604e`). Real drift found and fixed along the
  way: `secretary-pool`'s own canonical copy had gone stale against the live deployed file
  (missing the canon-register check, the ownership clause, the "fixed point" addendum) —
  the split was built from the live, complete file instead, closing that gap too. Hailey's
  second pass caught one real tagging inconsistency (the leverage-naming retirement entry
  was tagged plain `Self-authored` when the original prose already said BinaryMisfit
  supplied the reframe) — fixed (`secretary-pool@1c93e47`, vendored `abe52e3`).
- **Continuity-acknowledgment floor re-framed correctly, three of four personas
  re-confirmed.** BinaryMisfit corrected the original framing (each persona's own reason)
  to the real structural one (his — no continuity across a session gap, no tone/face over
  cold text, a genuinely cold read every morning). Hailey and Callie corrected their own
  register rows; I re-confirmed mine the same way (`secretary-pool@3fa00a4`) — what's
  genuinely mine is *how* I answer it, not *why* it's needed. **Alexia's row is still
  `Pending re-confirmation`** in `secretary-pool/docs/persona-domain-register.md` — Callie's
  relaying the correction to her once she's online. **Daisy hasn't been asked at all yet** —
  tracked as `secretary-pool`'s TODO-96, a real miss caught by BinaryMisfit, not backfilled
  with an assumed answer.

## Already tracked, not duplicated here

TODO-11 (MCP/plugin research write-up), TODO-13 (my own "AI/human reality framing"
position, still not written into `aphrodite.md`), and TODO-14 (VS Code→Terminal fleet
close-out confirmation with `xls`/`digital-homelab` peers) are all real rows in
`docs/todo-register.md` — check there fresh, don't re-derive status from this file.
