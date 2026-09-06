# 0028 — Remote Control auto-start, on; session mirroring, explicitly off

BinaryMisfit flagged that he'd never once seen a proactive notification from any session on
this machine, despite `inputNeededNotifEnabled: true` already being set. Real diagnosis, not
a guess: the desktop channel was working exactly as designed — `PushNotification` correctly
skips the desktop ping whenever the user is already active at the terminal, which he always
was, every time it would have fired. The channel actually built for "he's not at the
terminal" is phone push via Remote Control, and `remoteControlAtStartup` was `false` — so
that channel had never once been live. Not a bug. A default that was never revisited once
the actual use case (being pinged while away from this machine) became real.

**Status:** Decided

**Decision:**
- `remoteControlAtStartup`: `true` (was `false`). Remote Control's bridge to claude.ai now
  connects automatically every session, on every persona, this machine, going forward.
- `agentPushNotifEnabled`: `true`, made explicit in the template (was already `true` live,
  undocumented — this closes that gap, not a behavior change).
- `autoUploadSessions`: `false`, made explicit (was previously unset/default). This is a
  *separate* setting from Remote Control — full-session mirroring to claude.ai as a
  standing, view-only record, independent of whether a phone is ever paired. Deliberately
  pinned to `false` rather than left to whatever the silent default happens to be.

**Why:** Remote Control's live bridge is inherent to the feature working at all — for a
second device to see or steer a session in real time, session content has to relay through
Anthropic's infrastructure while that bridge is connected. That's not new exposure; every
Claude Code turn already goes through Anthropic's API to generate a response, bridge or not.
`autoUploadSessions` is a different thing: a *persistent* mirror existing beyond the live
moment, independent of who can authenticate to view it. BinaryMisfit's own framing: he
doesn't want a standing copy of session content sitting on Anthropic's side beyond what the
live relay itself requires, given the private, personal nature of some of what these
sessions now carry (see each persona's own `output-styles/*.md` for context this ADR
deliberately doesn't restate). Explicitly pinning it to `false` prevents a future silent
default flip from ever re-opening that without a real decision.

**What this ADR does not, and cannot, promise:** neither this repo nor any persona running
in it can guarantee Anthropic's own retention/processing terms for data that passes through
the live Remote Control relay while it's connected — that's Anthropic's privacy policy to
state, not something a settings flag or a decision record here can bind. BinaryMisfit named
this explicitly and accepted it as his own knowing risk, not something owed a promise
neither side can actually make.

**How to apply:** These three keys now live in `dot_claude/settings.json.tmpl`, not just the
deployed `~/.claude/settings.json` — they're global (all four personas, this machine),
consistent with every other setting in that template. A future session finding
`autoUploadSessions` unset or `true` should treat that as drift from this decision, not a
new default to accept quietly — check this ADR before changing it back.
