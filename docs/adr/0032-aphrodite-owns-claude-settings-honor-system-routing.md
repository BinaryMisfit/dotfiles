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
*Addendum (2026-09-14, same day, first fix):* The scoped fix that actually unblocked the
incident — a new `autoMode.allow` entry permitting `claude mcp add-json` (default/local
scope, stdio only, under `D:/Source/afterglow/` only, file existence verified first) —
landed in `dot_claude/settings.json.tmpl` and the deployed `~/.claude/settings.json` in the
same change, commit pushed same day. Verified live: the retried registration succeeded
under the new grant.

---
*Addendum (2026-09-14, same day, second pass — BinaryMisfit's own real audit-and-fix
ruling, sharpening rather than reversing the decision above):*

**A real audit followed, not a guess.** Reading `~/.claude.json`'s own `projects[*]` map
directly found: zero project-level `permissions` blocks there (already compliant), but
three real project-scoped `mcpServers` entries, two of them stale duplicates of servers
already living globally (`x-lifestyle-mcp` under `xls-mod-review`; `afterglow-channel`
under `binary-dotfiles`, an old per-persona-`PERSONA_NAME`-baked pattern superseded by the
identity-agnostic global `afterglow-threads-channel`), and one — `afterglow-auth-issuer`
under `digital-homelab`, the server this incident was originally about — real but never
migrated. Separately, per-repo `.claude/settings.local.json` files (`binary-dotfiles`,
`digital-homelab`) carried real `permissions.allow` blocks — a different file than
`~/.claude.json`, but the same category of mistake: BinaryMisfit's own correction, "those
rules aren't applied anyway, they were put in the wrong place before we investigated how
this actually works" — Auto Mode's own classifier is the operative permission model, and
the traditional `permissions.allow` matching mechanism doesn't apply under it regardless of
which file it sits in.

**Three rules sharpened, not three new ones:**
1. **No permissions at project level, anywhere, full stop** — neither `~/.claude.json`'s
   `projects[*]` map nor a per-repo `settings.local.json`. Only global
   `~/.claude/settings.json` carries a real `permissions` block. Fixed live: both stale
   `settings.local.json` allow-lists stripped down to `outputStyle` only.
2. **No MCP servers at project level either.** Every real server lives in
   `~/.claude.json`'s top-level global `mcpServers`, built identity-agnostic. Fixed live:
   the two stale duplicates deleted outright (confirmed byte-identical to their global
   twins before deletion, not assumed); `afterglow-auth-issuer` moved from
   `digital-homelab`'s project scope into global scope, config unchanged.
3. **The first fix's own scoped `autoMode.allow` entry was itself too granular and got
   withdrawn the same day.** BinaryMisfit's own correction: "Your permission you need is
   not that granular. Aph has the permission to edit any settings file directly. Period."
   The narrow, path-scoped `claude mcp add-json` grant from the first addendum above was
   removed from both `dot_claude/settings.json.tmpl` and the deployed
   `~/.claude/settings.json`, replaced by the unconditional file-edit permission now stated
   in this ADR's own **Decision** section's ownership line (the `autoMode.environment`
   entry itself was rewritten in place, same change). "MCP servers are added by hand" still
   holds — it now means a human types the registration, or Aphrodite edits the resulting
   global config file directly under her existing ownership; neither is an unattended or
   automated pipeline, and this ADR's original **How to apply** section (stop and ask on
   anything that reads as dangerous) is untouched by this sharpening.

**Not touched by this pass, still real, still open:** the `D:`/`d:` drive-letter trust
split this ADR's own "What got cut" section named — tracked as
[TODO-16](../todo-register.md#todo-16), unaffected by either addendum above.
