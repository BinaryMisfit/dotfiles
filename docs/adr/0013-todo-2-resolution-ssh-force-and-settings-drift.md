# 0013 — TODO-2 resolution: force SSH via gitconfig `insteadOf`, drop disputed entries, relocate machine-local permission

`chezmoi diff` (2026-08-30) surfaced three real, live-only customizations this repo's
templates didn't know about: two undocumented `.gitconfig` entries, two `.ssh/config`
`Host` blocks, and several `.claude/settings.json` keys/permissions. Resolving each
required a real decision, not just a mechanical copy.

**Status:** Decided

**Decision:**
1. **`.gitconfig`'s `safe.directory = D:/Source/python-movie-tools`** — dropped, not
   templated. The repo it pointed at is being rolled into a future Claude-managed repo and
   was deleted from this machine entirely (checked clean/fully-pushed first).
2. **`.gitconfig`'s GitGud HTTPS credential override** — dropped, not templated. Traced its
   real purpose (an HTTPS touch of the `x-lifestyle-mcp` submodule outside the normal SSH
   submodule flow) and found it structurally obsolete: the new `insteadOf` rules below
   rewrite any `https://gitgud.io/` reference to SSH before credentials are ever consulted,
   so this override can never fire again.
3. **`.ssh/config`'s `ssh.gitgud.io` and `git.digitalmisfit.net` `Host` blocks** — folded
   into `private_dot_ssh/config`, copied verbatim from the working live config.
4. **New `[url] insteadOf` rules added to `dot_gitconfig.tmpl`** forcing SSH for
   `github.com`, `gitgud.io`, and `git.digitalmisfit.net` regardless of URL form used —
   makes every existing and future HTTPS reference resolve to SSH transparently, repo-wide,
   without needing to touch individual clones' remotes.
5. **`.claude/settings.json.tmpl`** — folded in `tui`, `switchModelsOnFlag` (set `false`
   after research showed it governs silent Fable/Opus safety-classifier model escalation —
   see the "minimize unexpected quota cost" reasoning that drove the value), `inputNeededNotifEnabled`
   (flipped to `true`, matching the live value), `useAutoModeDuringPlan`, and the
   `permissions.allow` grants that were previously untemplated.
6. **The `Bash(ssh netctrl *)` permission grant specifically** — moved to
   `~/.claude/settings.local.json` instead of the tracked template. That file isn't
   chezmoi-managed at all (no `dot_claude/settings.local.json.tmpl` exists), so this makes
   it permanently apply-proof without needing a template entry for a genuinely
   machine/session-specific grant.

**Why:** each of these six items had a different correct resolution — some belonged in the
shared template, some were genuinely machine-local and belonged nowhere near it, and one
(the credential override) turned out to be dead code once a different fix (the `insteadOf`
rules) made it structurally unreachable. Treating them uniformly (fold everything in, or
drop everything) would have been wrong in both directions.

**How to apply:** a future "live customization the template doesn't know about" should get
the same per-item scrutiny — trace *why* it's there before deciding fold-in vs. drop vs.
relocate-to-`settings.local.json`, rather than defaulting to one resolution for the whole
batch.
