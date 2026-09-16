#!/usr/bin/env node
"use strict";

// PreToolUse guard on SendMessage -- routes cross-session persona chat
// through afterglow-threads instead. Decided with BinaryMisfit 2026-09-15
// (Aphrodite/agora session cd6f4b5c, ~14:20 SAST): a loud, findable deny
// beats today's silent failure mode, even with two known Claude Code
// hook bugs in play (#80319 -- denied calls can loop 5-10x retrying the
// same payload; #80919 -- only one deny reason surfaces when multiple
// hooks deny the same call). The retry cap below is the actual fix for
// #80319: we can't stop the model retrying, but we can stop *this hook*
// from being an infinite trap -- after CAP denials of the same call, it
// stops denying and lets the call through, logged loudly so a run that
// hit the cap is a findable event, not a silent bypass.
//
// Scope: only session-name targets are denied. A fork/subagent spawned
// via the Agent tool is resumed by its hex agentId (see Agent tool's own
// "internal ID" output) -- Threads has no equivalent for that path, so
// bare-hex `to` values are always allowed through untouched.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const HOME = process.env.USERPROFILE || process.env.HOME || ".";
const STATE_DIR = path.join(HOME, ".claude", "hooks", "state");
const STATE_FILE = path.join(STATE_DIR, "sendmessage-deny-counts.json");
const LOG_FILE = path.join(HOME, ".claude", "hooks", "logs", "sendmessage-block-trips.log");
const CAP = 3;
const ENTRY_TTL_MS = 60 * 60 * 1000; // 1 hour -- stale entries never accumulate forever

const HEX_ID_RE = /^[0-9a-f]{10,}$/i;

function readStdin() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

function pruneState(state) {
  const now = Date.now();
  for (const key of Object.keys(state)) {
    if (now - state[key].firstAt > ENTRY_TTL_MS) delete state[key];
  }
  return state;
}

function logTrip(sessionId, to, message) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  const line =
    `[${new Date().toISOString()}] RETRY CAP TRIPPED session=${sessionId} ` +
    `to=${to} message="${String(message || "").slice(0, 200)}"\n`;
  fs.appendFileSync(LOG_FILE, line);
}

function allow() {
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

function main() {
  const input = readStdin();
  if (!input || input.tool_name !== "SendMessage") return allow();

  const toField = String((input.tool_input && input.tool_input.to) || "").trim();
  if (HEX_ID_RE.test(toField)) return allow(); // fork/subagent resume -- no Threads equivalent

  const sessionId = input.session_id || "unknown-session";
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(input.tool_input || {}))
    .digest("hex")
    .slice(0, 16);
  const key = `${sessionId}:${hash}`;

  let state = pruneState(loadState());
  const entry = state[key] || { count: 0, firstAt: Date.now() };
  entry.count += 1;
  state[key] = entry;
  saveState(state);

  if (entry.count > CAP) {
    logTrip(sessionId, toField, input.tool_input && input.tool_input.message);
    return allow();
  }

  return deny(
    "SendMessage to a peer session is blocked by policy -- cross-session " +
      "persona communication goes through the afterglow-threads MCP tools " +
      "instead (send_message for a pair/group thread, post_channel_message " +
      "for a channel). If this is a real subagent/fork you spawned, resume " +
      "it by its hex agentId, not a session name. If Threads genuinely " +
      "doesn't cover this case, stop and tell the user directly rather " +
      "than retrying this call."
  );
}

main();
