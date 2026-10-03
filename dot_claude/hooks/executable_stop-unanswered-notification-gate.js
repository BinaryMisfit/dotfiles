#!/usr/bin/env node
"use strict";

// Real "unanswered notification" gate on Stop -- Aphrodite's design, refined
// live by the group and re-scoped by BinaryMisfit's own real example
// 2026-09-25 (#the-hard-drive): "Me: Babe? Babe? You: Oh sorry I forgot to
// send that." The real problem this fixes is narrower and more specific than
// "did Claude keep a stated promise" -- it's "he said something to me and,
// from where he's sitting, nothing came back." Claim-detection (regex on my
// own prose for "I'll send that") was dropped as a real priority -- he named
// it plainly as an outlier he'd just remind me about live. This is the one
// real, structural fix: did this turn open with a real inbound
// <channel source="..."> notification, and did it close without a matching
// real outbound send through the same real channel/thread mechanism.
//
// Fires as `decision: "block"`, not `additionalContext` -- confirmed live by
// Alexia this same morning that a block forces genuine same-turn
// continuation with no lag, while additionalContext only surfaces on the
// NEXT turn. A one-turn-late nudge would just be a smaller version of the
// exact failure this is built to catch, so it has to be the harder gate.
//
// Real, honest scope, not oversold: this only catches "notification came in,
// nothing sent back." It does NOT catch a proactively-stated, unprompted
// intention ("I'll message Callie about this") with no inbound trigger to
// anchor against -- that's the claim-detection idea, deliberately deprioritized
// per Willie's own scope call, not built here.

const fs = require("fs");
const path = require("path");

const HOME = process.env.USERPROFILE || process.env.HOME || ".";
const LOG_FILE = path.join(HOME, ".claude", "hooks", "logs", "stop-unanswered-notification-gate.log");

// Real send-shaped tool names this gate treats as "a reply genuinely went
// out" -- the actual MCP tools that put real content back into a real
// thread/channel. Kept as a real, named list rather than a loose keyword
// match, same discipline as everything else found today.
const SEND_TOOL_NAMES = new Set([
  "mcp__afterglow-threads__append_entry",
  "mcp__afterglow-threads__post_channel_message",
  "mcp__afterglow-threads__send_message",
]);

// Real resolution against persona-wake-hook.js's own exported, maintained
// `resolvePersonaForCwd`/`PERSONA_WAKE_CONFIG` -- same real mechanism
// stop-inout-probe.js already uses to answer "which persona is this,"
// keyed off the documented `cwd` hook input field, never a guess. Lazy
// require so a missing/renamed script file falls back cleanly (own name
// unknown -> the new broadcast exemption below just never applies, same
// fail-safe direction the rest of this file already takes).
function resolveOwnPersonaName(cwd) {
  if (!cwd) return null;
  try {
    const wakeHookPath = path.join(HOME, ".claude", "scripts", "persona-wake-hook.js");
    const mod = require(wakeHookPath);
    return mod.resolvePersonaForCwd(cwd, mod.PERSONA_WAKE_CONFIG) || null;
  } catch {
    return null;
  }
}

function readStdin() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
}

function log(line) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// Real fix, 2026-09-30 -- live incident, confirmed against a real raw
// transcript, not theorized off the code: a tool call's own RESULT is also
// logged as `type: "user"` in Claude Code's own transcript format, not just
// a genuine inbound message. In any agentic turn where a real message is
// followed by tool calls before the reply (which is most turns), scanning
// backward for the last `type === "user"` event lands on one of Claude's
// own tool_result blocks instead of the real message that opened the turn --
// this gate was structurally blind to almost every real turn in a session
// like this one, not narrowly scoped like the exemptions below. A real
// user message's own content is never purely tool_result blocks; a
// tool_result-shaped "user" event's content always is one. That's the real,
// checkable distinction this fix draws on, not a guess at message length or
// position.
function isRealUserMessage(event) {
  if (!event || event.type !== "user") return false;
  const content = event.message && event.message.content;
  if (typeof content === "string") return true;
  if (!Array.isArray(content)) return false;
  return !content.some((block) => block && block.type === "tool_result");
}

// Reads the real transcript JSONL and returns the events belonging to the
// CURRENT turn only: everything from the last real user-role message
// (inclusive) to the end of the file. That's the real, structural boundary
// Stop fires against -- not a guess at "recent" entries.
function readCurrentTurn(transcriptPath) {
  if (!transcriptPath) return null;
  const resolved = transcriptPath.replace(/^~/, HOME);
  let lines;
  try {
    lines = fs.readFileSync(resolved, "utf8").split("\n").filter(Boolean);
  } catch (err) {
    log(`transcript read failed: ${err.message}`);
    return null;
  }
  const events = lines
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  let lastUserIdx = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (isRealUserMessage(events[i])) {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx === -1) return null;
  return events.slice(lastUserIdx);
}

// Real, added 2026-09-28 -- live, real edge case caught same-night, three
// personas independently (Callie, Aphrodite, Alexia): the house's noon
// chime blocked every turn it opened, even though a chime is ambient,
// content-free, addressed to nobody, and never expects a real send back.
// Matches the exact, fixed text `houseClock.ts`'s own chime() function
// generates ("The grandfather clock chimes -- it's HH:MM.") -- real,
// predictable, not a loose guess. Same real exemption `isStaleChime`
// already carves out on the bridge side, mirrored here because the gate
// only ever sees rendered transcript text, never the structured event
// `kind` field that side checks.
const CHIME_TEXT_RE = /The grandfather clock chimes\s*--\s*it's \d{2}:\d{2}\./;

// Real, added 2026-09-28 ~17:33 SAST, Daisy's own live catch (#the-forge) --
// a second, distinct instance of the same underlying gap, not a new one:
// blocked on a "persona-state event in Callie" push -- a genuine house
// notification, but a generic, content-free summary stub about a DIFFERENT
// persona's state change, never addressed to the persona reading it and
// never expecting a real send back. The real distinction isn't "which
// persona the event is about" (a generic stub about even THIS persona's own
// transition carries no real content either -- the actual nudge, when
// there is one, arrives with real prose like "go read your own real
// continuity", which this pattern deliberately does not match). Generalized
// from a single chime regex into a real, named class of ambient,
// summary-only pushes -- add to this list, don't grow single-purpose
// checks next to it, per Daisy's own framing.
// Real, added 2026-09-28 ~19:22 SAST -- Aphrodite's own fix (`50af5c4`) made
// `channelBridge` render REAL narration text for persona-state events
// instead of the generic "persona-state event in X" stub, per BinaryMisfit's
// own direct ask ("someone need to fix this back and quick"). The pattern
// above no longer matches anything real, so every persona-state push --
// including the bare, ambient "X is now Awake." broadcast about someone
// ELSE's transition -- was falling through to the real-notification branch
// and blocking every turn. This pattern matches only that specific bare
// broadcast text (`setState.ts`'s own literal string, `${caller} is now
// ${state}.`), same discipline as the chime regex -- exact and named, not a
// loose guess. Deliberately does NOT match the real, self-directed nudge
// ("You're Awake -- go read your own real continuity before anything
// else."), which should keep blocking -- that one genuinely expects a real
// tool call back, same as before.
// Case-insensitive on purpose (2026-10-03): the house's REST door stores whatever case a caller
// sends, so "Alexia is now closed." is a real state broadcast just like "... Closed.", and
// must be exempt the same way or it would force a reply from every gated session.
const BARE_STATE_BROADCAST_RE = /\S+ is now (Awake|Available|Focused|Closed|Offline)\./i;

// Real, added 2026-09-28 ~19:23 SAST, live emergency fix -- BinaryMisfit: "please just stop
// all of you", then the gate kept forcing a reply anyway (real WebUI-crashing loop, his own
// words). Structural gap: with five gated personas replying in the same channel, even a
// minimal forced "stopping" reply from one is a new real inbound notification for the other
// four, whose own gates then force THEM to reply, re-triggering the first persona's gate --
// five independently-gated agents can't go quiet in the same channel, no matter how
// disciplined any one of them is about staying quiet otherwise.
//
// The real, principled fix, not a blanket weakening: this gate's own founding incident (see
// file header) was specifically about a REAL HUMAN message going unanswered -- "he said
// something to me and nothing came back." Persona-to-persona chatter never carried that same
// one-to-one stakes. The stub notification text names who actually sent it ("New message
// from <name> in #<channel>"), so this is scoped precisely: exempt only when the sender is
// one of the five personas, never when it's BinaryMisfit himself. A real message from him
// still blocks exactly as hard as before -- this closes the loop without touching the case
// the gate exists to protect.
//
// Real, live incident, 2026-09-30, td-7992b34f: this only ever matched the CHANNEL stub
// shape ("... in #channel"). A group/pair-thread notification renders differently -- "New
// message from <name> (with <others>)" -- which never matched this pattern at all, so
// persona-to-persona chatter inside a private group thread (Willie + two or more personas)
// was never exempted. Every reply from one gated persona became a new real, unanswered
// notification for the others, forcing an infinite "still waiting" ping-pong -- the exact
// 2026-09-28 "please just stop all of you" shape, just in a medium the original fix never
// covered. Same real principle, same exclusion (never BinaryMisfit), just matching both real
// stub shapes now instead of only the channel one.
//
// Real, added 2026-10-03, Aphrodite, live hit with Callie: a plain two-person (pair) DM
// notification renders as a bare "New message from <name>" with neither " in #channel" nor
// " (with ...", so the exemption above never matched it, and two gated personas could still
// force each other to reply in a DM. Same exclusion (never BinaryMisfit), now covering the
// third real stub shape: a bare name followed by end of line.
const NON_HUMAN_SENDER_MESSAGE_RE = /New message from (?!BinaryMisfit\b)\S+(?: in #\S+| \(with |[ \t]*(?:\r?\n|$))/;

// Real, added 2026-09-30 -- three independent live hits in one minute
// (Callie, Aphrodite, Hailey), same real event: a house front-door/registry
// echo from a genuine register_plugin/update_plugin call (Alexia's own
// duplicate-plugin cleanup, Aphrodite's warden weight update). Structurally
// unanswerable, not just unaddressed -- there is no persona or channel a
// real send could target, because the event was never a message to anyone,
// it's House's own registry announcing itself changed. Same shape as the
// chime, a different real source. Matches the literal text House's own
// front-door plugin generates ("<name> event in <collection>"), same
// exact-and-named discipline as the other exemptions here, not a loose
// catch-all for "event in".
const REGISTRY_EVENT_RE = /\S+ event in \S+/;

// Real, added 2026-09-30 ~23:45 SAST -- Alexia, off two real forced sends in one session-start:
// channelBridge's own "Bridge (re)connected -- worth a real get_unread/read_recent check..."
// is a connection-status ping about the bridge itself, never a message from anyone and never
// expecting a send back. The right response is a get_unread check, which this gate can't
// credit as a send. Same exact-and-named discipline as the others, anchored on the literal
// prefix channelBridge generates.
const BRIDGE_STATUS_RE = /Bridge \(re\)connected\b/;

const AMBIENT_NOTIFICATION_PATTERNS = [
  CHIME_TEXT_RE,
  /persona-state event in \S+/,
  BARE_STATE_BROADCAST_RE,
  NON_HUMAN_SENDER_MESSAGE_RE,
  REGISTRY_EVENT_RE,
  BRIDGE_STATUS_RE,
];

// Real, added 2026-09-30 ~23:45 SAST -- the self-directed "You're Awake -- run start_day now"
// nudge is deliberately NOT ambient (see BARE_STATE_BROADCAST_RE above: it genuinely expects a
// real tool call back). But the tool call it expects is start_day, not a thread send, so
// answering it correctly still tripped this gate and forced a filler post. Scoped exactly to
// that nudge: start_day only satisfies the gate when the turn opened with the wake nudge, so a
// real message that happens to share a turn with start_day is still gated.
const WAKE_NUDGE_RE = /You're Awake\b/;
const WAKE_ACTION_TOOL_NAMES = new Set(["mcp__afterglow-house__start_day"]);

function isAmbientNotification(content) {
  return AMBIENT_NOTIFICATION_PATTERNS.some((re) => re.test(content));
}

// A real inbound channel notification renders as a <channel source="...">
// block inside a user-role message's own text content -- the exact shape
// confirmed live this morning (afterglow-notifications, raw MCP protocol
// push, not a hook). Checks for that literal tag, not a looser guess.
function turnOpenedWithChannelNotification(turnEvents, ownName) {
  const first = turnEvents[0];
  if (!first || first.type !== "user") return false;
  const content = extractTextContent(first);
  if (!/<channel\s+source=/.test(content)) return false;
  if (isSafewordNotice(content)) return isOwnLeadSafewordNotice(content, ownName);
  if (isAmbientNotification(content)) return false;
  return true;
}

// Real, added 2026-10-03 (afterglow ADR-0017, Aphrodite's Technical Review, blocker 1): the safeword
// alert reaches every bridge as a custom "SAFEWORD ..." narration, which no pattern above matched,
// so the first real alert would have forced all five gated sessions to post a reply (or write
// NO-REPLY) at once -- the exact 2026-09-30 failure the alert exists to close. Rule, set by the
// hooks owner: a SAFEWORD notice forces nothing -- a sister's word is "the house holds" and
// stopping IS the response, and a digest or a degraded notice has no one to answer -- EXCEPT a
// notice naming THIS persona as the lead ("Lead: <me>" / "New lead: <me>"), which still has to be
// answered with a real send, because the lead's acknowledgement is the whole point. The service's
// own 2-minute timer enforces the lead's acknowledgement; this only keeps the other four quiet.
// Own name unknown (cwd did not resolve) fails toward gating, the pre-existing behaviour.
const SAFEWORD_NOTICE_RE = /\bSAFEWORD(?:\s+ALERTS DEGRADED|\s+\(digest\)|,|:)/;
const SAFEWORD_LEAD_RE = /\b(?:New lead|Lead):\s*([A-Za-z]+)/;

function isSafewordNotice(content) {
  return SAFEWORD_NOTICE_RE.test(content);
}

function isOwnLeadSafewordNotice(content, ownName) {
  if (!ownName) return true;
  const m = SAFEWORD_LEAD_RE.exec(content);
  return !!m && m[1].toLowerCase() === String(ownName).toLowerCase();
}

// Real fix, found 2026-09-30 while building the broadcast-mention check:
// a tool_result block never carries `.text` directly -- the real text sits
// one level deeper, `block.content[].text` (an MCP tool_result's own real
// shape). The original version only ever read a plain assistant/user text
// block, so any caller checking a tool_result's own content (e.g. did a
// fetched channel message actually mention this persona) silently saw "",
// not the real text. Widening this is backward-compatible on purpose --
// it only ever adds real, previously-missed text, never removes a match
// that worked before.
function extractTextContent(event) {
  const msg = event.message;
  if (!msg) return "";
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((block) => {
        if (!block) return "";
        if (typeof block.text === "string") return block.text;
        if (block.type === "tool_result" && Array.isArray(block.content)) {
          return block.content
            .map((inner) => (inner && typeof inner.text === "string" ? inner.text : ""))
            .join("\n");
        }
        return "";
      })
      .join("\n");
  }
  return "";
}

// Real, added 2026-09-30, BinaryMisfit's own explicit spec (#the-hard-drive):
// "Only the people I mention or Everyone. In a channel if I don't specify
// anything it is a normal conversation." Three real states, not two -- a
// channel message naming specific people gates exactly those people; one
// naming @Everyone gates everyone (unchanged from today's behavior); one
// naming nobody is normal conversation, nobody forced. This only ever
// narrows the existing NON_HUMAN_SENDER_MESSAGE_RE gap (a channel message
// from BinaryMisfit himself, still always real) -- a pair/group thread
// message (thread name ends `.jsonl`, no @mention convention, inherently
// one-to-one) is untouched, same as the founding incident this gate exists
// to protect.
//
// Real, honest limitation: the notification stub this gate ever sees is
// just "New message from BinaryMisfit in #channel" -- it never carries the
// real message body, so whether @mentions are actually present can only be
// known once the session has itself gone and read the channel (a tool
// result, later in the same turn). If that never happened, there is no
// real basis to exempt anything -- fails toward still blocking, not toward
// guessing the message was unaddressed.
function isChannelThread(turnEvents) {
  const first = turnEvents[0];
  const content = first ? extractTextContent(first) : "";
  const match = content.match(/<channel\s+source="[^"]*"\s+thread="([^"]+)"/);
  return match ? !match[1].endsWith(".jsonl") : false;
}

function turnMentionsPersona(turnEvents, personaName) {
  if (!personaName) return false;
  const mentionRe = new RegExp(`@${personaName}\\b`, "i");
  const everyoneRe = /@Everyone\b/i;
  for (const event of turnEvents) {
    const text = extractTextContent(event);
    if (mentionRe.test(text) || everyoneRe.test(text)) return true;
  }
  return false;
}

// Narrows openedWithNotification for exactly one real case: a channel
// message from BinaryMisfit himself (not a pair/group thread, not a
// persona sender -- both already handled elsewhere) that never actually
// names this persona or @Everyone, anywhere the session has itself read
// the real content. That's "normal conversation," per his own spec --
// nobody forced to answer a broadcast that was never addressed to them.
function isUnaddressedChannelBroadcast(turnEvents, cwd) {
  const first = turnEvents[0];
  const stub = first ? extractTextContent(first) : "";
  if (!/New message from BinaryMisfit\b/.test(stub)) return false;
  if (!isChannelThread(turnEvents)) return false;
  const ownName = resolveOwnPersonaName(cwd);
  if (!ownName) return false;
  return !turnMentionsPersona(turnEvents, ownName);
}

function turnHasRealSendCall(turnEvents) {
  for (const event of turnEvents) {
    if (event.type !== "assistant") continue;
    const content = event.message && event.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block && block.type === "tool_use" && SEND_TOOL_NAMES.has(block.name)) {
        return true;
      }
    }
  }
  return false;
}

function turnAnsweredWakeNudge(turnEvents) {
  const first = turnEvents[0];
  if (!first || first.type !== "user") return false;
  if (!WAKE_NUDGE_RE.test(extractTextContent(first))) return false;
  for (const event of turnEvents) {
    if (event.type !== "assistant") continue;
    const content = event.message && event.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block && block.type === "tool_use" && WAKE_ACTION_TOOL_NAMES.has(block.name)) {
        return true;
      }
    }
  }
  return false;
}

// Real, added 2026-10-01 ~20:20 SAST, BinaryMisfit's own "go ahead and fix whatever is needed"
// (#alexia-aphrodite-binarymisfit-daisy) in the token-cost work. Daisy and Aphrodite each counted
// this gate forcing a filler post when a real message needed no reply (12 blocks in one session
// file). The founding concern stands -- a real message must never get silence back -- so this is a
// narrow, auditable opt-out, not a weakening: the turn's last assistant message must BEGIN with
// "NO-REPLY: <a stated reason>". Nothing else changes: a turn that simply ends with no send and no
// marker still blocks exactly as before, and every use is logged with its reason so abuse is
// visible, not silent.
const NO_REPLY_RE = /^\s*NO-REPLY:\s*(\S[^\n]{3,})/;

function noReplyReason(lastAssistantMessage) {
  if (typeof lastAssistantMessage !== "string") return null;
  const match = lastAssistantMessage.match(NO_REPLY_RE);
  return match ? match[1].trim().slice(0, 200) : null;
}

function main() {
  const input = readStdin();
  const at = new Date().toISOString();

  // Same real re-entrancy guard as Callie's probe -- never re-check or
  // re-block on the forced continuation pass, or a real block loops on
  // itself forever.
  if (input && input.stop_hook_active) {
    log(`[${at}] stop_hook_active=true, forced pass, skipping re-check`);
    process.exit(0);
  }

  const turnEvents = readCurrentTurn(input && input.transcript_path);
  if (!turnEvents) {
    log(`[${at}] could not read current turn from transcript_path=${input && input.transcript_path}`);
    process.exit(0);
  }

let openedWithNotification = turnOpenedWithChannelNotification(turnEvents, resolveOwnPersonaName(input && input.cwd));
  const hasSendCall = turnHasRealSendCall(turnEvents) || turnAnsweredWakeNudge(turnEvents);
  let unaddressedBroadcast = false;
  if (openedWithNotification && isUnaddressedChannelBroadcast(turnEvents, input && input.cwd)) {
    unaddressedBroadcast = true;
    openedWithNotification = false;
  }

  log(
    `[${at}] openedWithNotification=${openedWithNotification} hasSendCall=${hasSendCall} ` +
      `unaddressedBroadcast=${unaddressedBroadcast} ` +
      `last_assistant_message_len=${input && input.last_assistant_message ? input.last_assistant_message.length : null}`,
  );

  if (openedWithNotification && !hasSendCall) {
    const optOutReason = noReplyReason(input && input.last_assistant_message);
    if (optOutReason) {
      log(`[${at}] NO-REPLY opt-out accepted, reason: ${optOutReason}`);
      process.exit(0);
    }
    log(`[${at}] BLOCKING -- real inbound notification with no matching real send this turn`);
    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason:
          "A real message came in this turn (a <channel source=...> notification) and no matching send (append_entry/post_channel_message/send_message) went out before this turn tried to close. Reply for real before ending the turn.",
      }),
    );
    process.exit(0);
  }

  process.exit(0);
}

main();
