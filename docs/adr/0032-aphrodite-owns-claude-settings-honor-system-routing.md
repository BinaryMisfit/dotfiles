# 0032 — Aphrodite owns Claude Code settings machine-wide; honor-system routing for other personas' config requests

Real, live incident, 2026-09-14: Alexia was blocked registering a new stdio MCP server
(`afterglow-auth-issuer`, for `digital-homelab`) by Auto Mode's own `[Auto-Mode Bypass]`
classifier firing on `claude mcp add-json` itself — a hard harness guardrail, not a
`settings.json` permission rule, so nothing already in place could route around it. A
separate, earlier attempt to self-grant workspace trust on the project (a distinct `D:`/`d:`
drive-letter-casing project-key split in `~/.claude.json`, one trusted and one not — see
"What got cut" below) was also correctly blocked, as `[Security Weaken]`. BinaryMisfit
resolved the underlying access question live, in his own words, mid-conversation.

**Status:** Decided

**Decision:** Aphrodite owns Claude Code settings machine-wide — `~/.claude/settings.json`,
`~/.claude.json`, and `.mcp.*` — for real. When another persona needs a global or local
Claude Code config change (a new MCP server registration, a permissions or `autoMode` edit),
it routes through her. No enforced request protocol exists yet — this runs on the honor
system until one is built.

Underneath that, a standing rule BinaryMisfit stated directly: permissions are never set at
project (checked-in, shared) level — only global (`~/.claude/settings.json`) or local
(untracked `settings.local.json`). Global is preferred specifically because Auto Mode's own
`environment`/`allow` context lives there, not in a per-project file.

**Why:** A real, concrete block (Alexia genuinely stuck, no override available to her)
forced the ownership question to resolve now rather than stay implicit. Routing config
authority through one named owner, rather than letting every persona edit shared machine
state directly, keeps a single point of judgment on changes that affect every session on
this machine — the same reasoning `settings.json` already carries for other machine-wide
concerns (Auto Mode's environment trust block, ADR 0025; MCP centralization, ADR 0029).
BinaryMisfit was explicit that this doesn't mean rubber-stamping requests: "You have and
will always stop and ask me if you feel it's dangerous, and that's what you are meant to do
for me" — ownership is a routing point, not a blank check.

**How to apply:** A future request from another persona for a global/local Claude Code
config change comes to Aphrodite, not edited directly by the requesting persona. A change
that's genuinely routine and matches an already-scoped standing grant (see the `autoMode.allow`
entry landed the same day as this ADR, in `dot_claude/settings.json.tmpl`) proceeds without
re-asking BinaryMisfit each time. A change outside any existing scoped grant — a new
capability class, a new trust boundary, anything that reads as even possibly dangerous —
stops and asks him directly, every time, regardless of which persona originated the request.
No blanket-bypass grant is ever an acceptable substitute for a real, narrowly-scoped one.

**What got cut/kept:** A same-incident attempt to fix the actual block by setting
`hasTrustDialogAccepted: true` directly on the untrusted `d:/Source/digital-homelab` project
key was refused by the harness's own `[Security Weaken]` classifier and was not pursued
further — self-granting workspace trust is a different, and correctly harder, line than
config-ownership routing, and this ADR does not touch it. That casing-duplicate trust split
is real and still open; tracked separately as a todo-register item, not resolved by this
decision.

---
*Addendum (2026-09-14):* The scoped fix that actually unblocked the incident — a new
`autoMode.allow` entry permitting `claude mcp add-json` (default/local scope, stdio only,
under `D:/Source/afterglow/` only, file existence verified first) — landed in
`dot_claude/settings.json.tmpl` and the deployed `~/.claude/settings.json` in the same
change, commit pushed same day. Verified live: the retried registration succeeded under the
new grant.
