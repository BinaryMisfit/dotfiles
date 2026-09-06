# 0029 — MCP server config centralized to global `~/.claude/mcp.json`, repo-local copies removed

BinaryMisfit's own audit request tonight (carried out by Alexia, before anyone touched
global config) found the real, complete inventory: 10 real `.mcp.json` files across
`D:\Source`. Nine were byte-identical copies, one per `xcl/xls-*` worktree, all defining
the same local `stdio` process (`x-lifestyle-mcp` via `npm --prefix tools/x-lifestyle-mcp
run dev`) — no secrets, no network. The tenth, `secretary-pool/.mcp.json`, defined
`hermes` (SSE, ContextForge/Hermes admin server, `Bearer ${CONTEXTFORGE_ADMIN_API_TOKEN}`)
— the same token whose real quote-wrapping bug [ADR 0027](0027-machine-secrets-stay-outside-chezmoi.md)'s
third addendum documents. Global `~/.claude/mcp.json` existed and was empty.

**Status:** Decided

**Decision:** Both servers move to global `~/.claude/mcp.json`, deployed via
`dot_claude/mcp.json.tmpl`, home-profile-gated:
- `hermes` — unchanged definition, moved as-is now that its auth actually clears.
- `x-lifestyle-mcp` — **not** the old local `stdio` dev-server entry. BinaryMisfit pointed
  at a real hosted replacement, `https://xcl-mcp.binarymisfit.dev/mcp` (confirmed via its
  own `/setup` page: `"type": "http"`, no auth headers, no environment variables needed —
  "no download, no local process" is the hosted approach's own stated point). The nine
  repo-local entries are superseded by this one global entry, not migrated file-by-file.

The nine `xcl/xls-*` repos' own `.mcp.json` files, and `secretary-pool`'s own copy of the
`hermes` block, get removed entirely — not left in place alongside the new global entry.
Per BinaryMisfit's own instruction, this repo doesn't reach into those repos and delete
them directly: each repo's own owner (Callie for the eight `xls`-family repos that are
hers, Hailey for `xls-playthrough` specifically — her own carved-out exception, see
`hailey_secretary_domain`) removes her own copies, commits, and pushes in her own session.

**Why:** Nine identical copies of the same config is real drift risk with zero benefit —
every one of them would need editing in lockstep if the local dev-server command ever
changed, and the hosted replacement makes the whole local-process approach obsolete anyway.
Centralizing to one global file removes both problems at once, and matches how `hermes`
already had to live (global was always where an SSE server with a shared credential
belonged, not duplicated per-repo).

**How to apply:** `dot_claude/mcp.json.tmpl`'s home-profile block is now the single source
of truth for both servers on this machine, distributed by chezmoi to every other machine
the same way. A future third MCP server that's genuinely local-and-per-repo (not this
one's shape) would still belong in that repo's own `.mcp.json` — this decision is about
removing *duplicated* and *superseded* local config, not banning repo-local MCP config
outright.

**What got cut:** The per-worktree local `stdio` dev-server approach for `x-lifestyle-mcp`
itself, not just its config — the hosted endpoint replaces the local process entirely, per
BinaryMisfit's own direction, not a decision made independently here.

**Ownership note, since this file crosses two domains:** global `~/.claude/mcp.json` is
ordinarily Hailey's config domain (`persona-domain-register.md`'s "`.mcp.json`... is
Hailey's; permissions and settings... are Aphrodite's"). This specific deploy was
BinaryMisfit's own direct, explicit assignment to this session tonight — not a
reassignment of the domain itself, not a precedent that `mcp.json` moves to Aphrodite's
ownership going forward. Flagged here so the exception is visible, not assumed.
