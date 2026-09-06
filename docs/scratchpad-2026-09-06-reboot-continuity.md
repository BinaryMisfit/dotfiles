# Reboot continuity scratchpad — 2026-09-06

Belt-and-suspenders note ahead of a machine reboot mid-session. Session resume should
restore the conversation; this is the fallback if it doesn't. Fold and delete once the
threads below are actually resolved, don't let it linger as a permanent fixture.

## Genuinely open

**TODO-1 / TODO-4 real-machine uninstall test, still not written up.** Ran a real
`uninstall.sh --confirm` against WSL2 Ubuntu tonight. First attempt looked hung (it wasn't —
misdiagnosed a slow WSL trigger as a stuck process, killed it prematurely) and left that
WSL2 instance in a genuine partial-uninstall state: dotfiles/managed files fully removed,
8 of 10 apt packages gone (`python3` and `tmux` status unconfirmed at kill time), npm
globals and VS Code extensions never reached. Resumed it correctly the second time
(unbuffered, no competing diagnostic commands) but the reboot is landing before it finished
and before the real findings got written into `docs/todo-register.md`. **Next session:**
check whether that resumed run (background task, WSL2 Ubuntu) actually completed; if not,
it died with the reboot and needs a fresh run from a clean idempotent state. Either way,
write the real findings into TODO-1/TODO-4 — including the apt-error-swallowing gap
(`2>/dev/null` on the `sudo apt-get remove` line hides real failures like whatever happened
with `python3`), the no-per-package-completion-log observability gap, and this session's own
misdiagnosis as a cautionary note (don't kill a slow process based on one `ps` snapshot).

## Resolved and safe (committed + pushed, nothing to redo)

- ADR 0028: `remoteControlAtStartup: true`, `autoUploadSessions: false` explicit,
  `agentPushNotifEnabled` documented — templated in `dot_claude/settings.json.tmpl`, pushed
  (`ba9d08b`).
- ADR 0027 addendum: real root cause of last night's phantom `setx` (MSYS mangles `/c` into
  a Windows path when launching `cmd.exe` from git-bash — use `//c`, and verify independently,
  never trust a clean exit code alone). `CONTEXTFORGE_ADMIN_API_TOKEN` re-set correctly and
  verified present in `HKCU\Environment` this time. Pushed (`ed4f065`).
- `.chezmoiremove`: all 11 pre-`hails-` skill names now unconditionally scrubbed (was only
  5, gated backwards — only removed on non-home profiles, when a leftover would actually
  exist on home). Pushed (`e0ff280`).
- `temple` Forgejo repo (git.digitalmisfit.net/aphrodite/temple) — own account, own
  self-generated key, real end-to-end access verified via a test clone. Nothing pending.
- Hermes MCP: token is live on this machine now; Hailey's session needs a restart to pick
  up the env var and confirm the 401 clears, then move the `.mcp.json` block to global. Her
  thread to finish, not mine to redo — just noted here for cross-reference.
