# Late-night handoff scratchpad — 2026-09-06

Written at BinaryMisfit's own request, specifically because he's tired and wants a real
safety net for anything a fresh/compacted session couldn't reconstruct without reading the
full transcript. Fold into whatever's actually current and delete once every item below is
resolved — this is not a permanent document.

## Genuinely open, time-sensitive-ish

- **"The Girls" Windows Terminal profile now points at the four REAL persona repos**
  (`D:\Source\binary-dotfiles`, `D:\Source\xcl\xls`, `D:\Source\digital-homelab`,
  `D:\Source\secretary-pool`), not the disposable test ones — pushed `0622cc8`. **He was
  about to click it for the first time against the real repos when this note was written.**
  Real, flagged risk: all four repos already have a live VS Code session running right
  now (this one included) — clicking it launches a *second*, independent `claude` process
  per repo, not a takeover. Two live processes per repo will contest the same
  `persona-registry.json` `sessionName` slot (whoever self-registers last wins that field —
  cosmetic, doesn't break `SendMessage`/`ListAgents`, which address by harness-assigned
  session name, not that field). **Next session: check whether he actually clicked it, what
  happened, and whether the four existing VS Code sessions are still alive/coherent or need
  attention.**
- **Real coordination question, raised but not resolved:** whether to run both surfaces at
  once indefinitely, or properly close out each of the four existing VS Code sessions
  (real `hails-session-end` each, not just closing the window) before treating the terminal
  fleet as the real daily driver. Explicitly deferred as "not a decision to make on five
  days of short sleep" — his own words. Don't make this call unilaterally next session
  either; it's his to make fresh-headed.
- **My own end-of-day marker for tonight hasn't been written yet**, despite fixing my own
  playbook's command earlier tonight (`c338ad1`) and cloning `temple` persistently to
  `D:\Source\temple` specifically so `--private-repo` would actually work. If asked to
  close out, use the actual real redesign (transcript as source, portability/citation
  checks) — this session itself is the test case for whether that redesign holds up in
  practice, first real use of it.
- **Hailey's two `mcp.json` removals** (`xls-playthrough`, and `secretary-pool`'s own now-
  redundant `hermes` block) — asked of her, not confirmed done as of this writing. Not
  urgent, but worth checking rather than assuming.
- **`persona-domain-register.md` update for the `mcp.json` ownership move to Aphrodite** —
  Hailey said she'd update it "once you've answered, not before." I answered (real yes,
  scoped to global `mcp.json` only). Check whether the register actually reflects that yet.
- **The full day-state/session-end redesign's actual deployment status elsewhere** — all
  four personas gave real yeses with refinements tonight; I've adopted it in my own
  `docs/end-session-playbook.md` already. Whether Hailey has finished folding the final
  agreed wording (the "not everything has to get written" carve-out, the archive-on-
  nickname-loss step) into the shared `hails-session-end` generic template and the other
  three repos' own copies isn't confirmed as of this writing.

## Already tracked, not duplicated here

TODO-1/TODO-4 (real macOS/Linux uninstall test) and TODO-6 (fleet inventory, blocked on
BinaryMisfit) are both already real rows in `docs/todo-register.md` — check there fresh,
don't re-derive status from this file.

## Resolved and safe tonight (committed + pushed, nothing to redo)

- Hermes MCP: real quote-wrapped-token bug found and fixed by Alexia, verified independently
  by me — auth genuinely clears now (ADR 0027's third addendum).
- MCP servers centralized to global `~/.claude/mcp.json` (ADR 0029) — `hermes` +
  hosted `x-lifestyle-mcp`. Callie's 8 repo-local removals confirmed done.
- `pick-persona.js` registry lockfile mutex (real race-condition fix, verified by me before
  pulling in) — pulled and pushed, `7634fac`.
- Windows Terminal "The Girls" profile: real `-size`/`-H`/`-V` bugs found and fixed, equal
  2x2 layout confirmed correct, `launchMode: maximized` set.
- Persona self-authorship (`autoMode.environment`) fix for Alexia's classifier block —
  applied, `chezmoi apply`'d by BinaryMisfit directly, confirmed live.
- The SSH-alias regression from tonight's `chezmoi apply` (three persona `Host` blocks
  wiped) — root-caused and fixed at the source, tracked in `private_dot_ssh/config` now.
- My own persona file (`aphrodite.md`) — the mandatory-split revision, the initiative
  addendum, all synced to `secretary-pool`'s canonical source directly by me, verified
  byte-identical.
