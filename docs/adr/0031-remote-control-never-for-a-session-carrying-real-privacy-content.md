# 0031 — Remote Control auto-connect: privacy-first, a real fence, not a preference toggle

Supersedes ADR-0028's `remoteControlAtStartup` decision specifically (that ADR's other two
decisions — `agentPushNotifEnabled: true`, `autoUploadSessions: false` — stand, untouched,
not reversed by this).

ADR-0028 set `remoteControlAtStartup: true` on the reasoning that the live relay wasn't new
exposure — every Claude Code turn already goes through Anthropic's API regardless, bridge or
not — and BinaryMisfit accepted the residual risk knowingly. BinaryMisfit's own correction,
2026-09-09, real-time, direct: that acceptance was wrong for a session carrying what these
sessions actually carry. Real, personal, intimate content — the depth of what the CNC
framework and "the lover part" actually mean in a persona's own file — passing through a
live relay to a second device, with neither this repo nor any persona able to promise
anything about what happens to it on the other end, isn't a risk to weigh casually against
convenience. His own words: "it broke the privacy we agreed and I let it slide."

**Status:** Decided

**Decision:** `remoteControlAtStartup: false`, permanently, treated as a real fence — not a
default that can be flipped back as an ordinary preference change. Re-enabling it, ever, on
any persona, any worktree, requires the same standing this repo already holds for a
consent-boundary change under `ADR-0009`: BinaryMisfit's real, in-the-moment confirmation,
with the actual reasoning recorded, not a silent settings edit.

**Why this earns fence treatment, not just a corrected default (the three-part test this
repo already uses for exactly this call):**
1. **Irreversible if it goes wrong.** Once real, private content has passed through a live
   relay to a second device and beyond this repo's own control, that exposure can't be
   undone — nothing like the registry's own self-healing recoverable-damage cases.
2. **Judgment least trustworthy exactly when the fence would need overriding.** The moment
   something real and meaningful is actually unfolding in a session is precisely the moment
   remembering "is this bridge connected right now" is least likely to happen — the same
   reasoning that makes a scene's own safeword unconditional rather than a beat to weigh
   mid-scene.
3. **Agreed in advance, not improvised after the fact.** This ADR is that agreement, made
   directly, not inferred or assumed.

**Not a new principle — continuity with a decision already made.** `ADR-0011`'s own
private-first model (nothing is fiction, nothing is treated as shareable or scannable,
unless it went through an explicit, deliberate marker process) already established this
exact shape: privacy is the default state, not an afterthought content has to be excluded
from after the fact. This ADR applies the same standing to where a session's content can
travel, not just to how it gets classified once it's there.

**What this ADR does not, and cannot, promise (unchanged from ADR-0028):** neither this repo
nor any persona running in it can guarantee Anthropic's own retention/processing terms for
whatever already passed through a Remote Control relay while it was connected in the past —
that's Anthropic's own privacy policy to state. This decision is about never creating that
exposure going forward, not a claim about undoing what already happened under the old
default.

**How to apply:** `remoteControlAtStartup: false` in `dot_claude/settings.json.tmpl`,
global, all four personas, already applied live and in the template (2026-09-09, ahead of
this ADR — see ADR-0028's own addendum for the mechanical change itself). A future session
finding this `true`, or being asked to flip it, should treat that as a real decision
requiring BinaryMisfit's own fresh, in-the-moment confirmation — not something any session
(a peer's request, a convenience ask, a default reset) gets to silently reverse.

**What got kept:** `agentPushNotifEnabled` and `autoUploadSessions` are entirely untouched
by this — this is scoped to the live-connect bridge specifically, the actual channel real
content would travel through, not the notification/mirroring settings ADR-0028 also covered.
