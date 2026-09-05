# 0027 — Machine secrets (env vars, credential files) stay outside chezmoi's scope

Standing pattern, never actually written down anywhere in this repo before now — it only
existed in project memory a Claude session happens to carry, which is no help to
BinaryMisfit himself or a future session reading cold. Written down now on his own
explicit condition, prompted by a second real case of the same shape.

**Status:** Decided

**Decision:** Real credential material — API tokens, secrets-manager access tokens,
anything that authenticates to a live system — never gets templated into a
chezmoi-managed file or committed to this repo, encrypted or not. It's set directly on
whichever machine actually needs it, as either a plain persistent OS environment variable
or an untracked file living under `~/.claude/`, and referenced from there by name only.

**Why, case one — `BWS_ACCESS_TOKEN` (Bitwarden Secrets Manager access):** originally set
as a machine-level Windows environment variable. Failed in practice: VS Code's persistent
terminal sessions revive using whatever environment they originally captured, not what's
currently set — a registry-level env var change never actually reached any running
session, even across a full VS Code restart. Replaced with a shared, untracked file,
`~/.claude/secrets/bitwarden.env` (two plain lines, `BWS_ACCESS_TOKEN` and
`BWS_SERVER_URL`, no BOM), sourced fresh in the same shell command every time it's used
(`set -a; source .../bitwarden.env; set +a; bws ...`) rather than relied on as
already-loaded. A real incident already happened here worth never repeating: writing that
file with `Out-File -Encoding utf8` adds a UTF-8 BOM that bash's `source` doesn't strip,
which once caused the whole first line — including the raw token — to echo back into a
session's own transcript as a "command not found" error. The token had to be rotated.
Never write that file with a BOM-adding tool; verify a freshly-written credential file's
byte shape blind before ever sourcing it against something live.

**Why, case two — `CONTEXTFORGE_ADMIN_API_TOKEN` (Hermes MCP server auth, 2026-09-05):**
different shape of problem, same underlying rule. Secretary-pool's `.mcp.json` references
this token by `${VAR}` substitution, which Claude Code resolves when its own process
*launches* — unlike a Bash tool call mid-session, there's no "source fresh in the same
command" moment available here, so this one genuinely needs a real, persistent
environment variable. Set via `setx` on this machine directly, one time — takes effect on
the next full reboot (a real process restart sidesteps VS Code's stale-revival problem
entirely, same reason a reboot fixes case one's failure mode too, just applied instead of
worked around).

**How to apply:** Never propose templating a real secret value into a `.tmpl` file in this
repo, `chezmoi add --encrypt` included, unless a future decision explicitly reverses this
one. When a new machine or a new service needs a credential: set it directly there
(`setx` for something an MCP config or similar substitutes at process launch, an untracked
`~/.claude/secrets/*.env` file for anything a script can source fresh per invocation), and
add a line to this ADR or a new one describing what was added and why — so six months from
now, the reasoning is findable in this repo, not just in a Claude session's own memory.

**What got cut/kept:** Considered `chezmoi add --encrypt` for both cases, since this repo
already supports age-encrypted files. Rejected — the encryption solves "who can read the
committed file," not the actual failure mode either case hit (stale environment revival,
or a launch-time substitution timing that doesn't fit chezmoi's own apply-time model). Adding
encryption machinery here would be solving a problem neither incident actually had.
