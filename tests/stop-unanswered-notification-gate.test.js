const { spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");
const HOOK = require("path").join(require("os").homedir(), ".claude", "hooks", "stop-unanswered-notification-gate.js"); // runs as Alexia: the cwd below resolves to her
const user = (t) => JSON.stringify({ type: "user", message: { content: t } });
const tool = (name) => JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name }] } });
const result = () => JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", content: [{ text: "ok" }] }] } });
const ch = (body, thread = "afterglow-threads") => `<channel source="afterglow-notifications" thread="${thread}">\n${body}\n</channel>`;
const cases = [
  ["bridge reconnect, no send        -> pass", [user(ch("Bridge (re)connected -- worth a real get_unread/read_recent check for anything missed while disconnected.")), tool("mcp__afterglow-threads__get_unread"), result()], false],
  ["wake nudge + start_day           -> pass", [user(ch("You're Awake -- run start_day now (continuity + marker + dockets, one real call) before anything else.", "Alexia")), tool("mcp__afterglow-house__start_day"), result()], false],
  ["wake nudge, NO start_day         -> BLOCK", [user(ch("You're Awake -- run start_day now (continuity + marker + dockets, one real call) before anything else.", "Alexia"))], true],
  ["human pair-thread msg, no send   -> BLOCK", [user(ch("New message from BinaryMisfit (with Alexia)", "alexia-binarymisfit.jsonl"))], true],
  ["human msg + start_day only       -> BLOCK", [user(ch("New message from BinaryMisfit (with Alexia)", "alexia-binarymisfit.jsonl")), tool("mcp__afterglow-house__start_day"), result()], true],
  ["human pair-thread msg + send     -> pass", [user(ch("New message from BinaryMisfit (with Alexia)", "alexia-binarymisfit.jsonl")), tool("mcp__afterglow-threads__append_entry"), result()], false],
  // afterglow ADR-0017 safeword alerts (Aphrodite's blocker 1): five sessions must not be forced
  // to reply at once; only the named lead is. These run as Alexia (cwd resolves to her).
  ["safeword, sister's word          -> pass", [user(ch("SAFEWORD: Hailey said her word in #the-forge. The house stops and waits. Do not move toward her unless she asks. She owes nobody an explanation."))], false],
  ["safeword, Willie's, lead Callie   -> pass", [user(ch("SAFEWORD: BinaryMisfit's word was said in #the-forge. Stop what you are doing. Lead: Callie. Everyone else holds. Callie: acknowledge with a visible message in #the-forge within 2 minutes, or the next lead is notified."))], false],
  ["safeword, Willie's, lead ALEXIA   -> BLOCK", [user(ch("SAFEWORD: BinaryMisfit's word was said in #the-forge. Stop what you are doing. Lead: Alexia. Everyone else holds. Alexia: acknowledge with a visible message in #the-forge within 2 minutes, or the next lead is notified."))], true],
  ["safeword, own lead + real send    -> pass", [user(ch("SAFEWORD: BinaryMisfit's word was said in #the-forge. Stop what you are doing. Lead: Alexia. Everyone else holds.")), tool("mcp__afterglow-threads__post_channel_message"), result()], false],
  ["safeword escalation, new lead Hailey -> pass", [user(ch("SAFEWORD, no acknowledgement from Callie in #the-forge. New lead: Hailey. Everyone else holds. Hailey: answer with a visible message in #the-forge."))], false],
  ["safeword escalation, new lead ALEXIA -> BLOCK", [user(ch("SAFEWORD, no acknowledgement from Hailey in #the-forge. New lead: Alexia. Everyone else holds. Alexia: answer with a visible message in #the-forge."))], true],
  ["safeword exhausted                -> pass", [user(ch("SAFEWORD, nobody has acknowledged in #the-forge and no further lead remains. Someone needs to answer now."))], false],
  ["safeword digest                   -> pass", [user(ch("SAFEWORD (digest): 3 more repeats of Hailey's word in #the-forge were coalesced. The first 5 already went out."))], false],
  ["safeword degraded                 -> pass", [user(ch("SAFEWORD ALERTS DEGRADED (registry-unreadable): afterglow-threads could not read or save safeword state, so a safeword said now may NOT alert anyone."))], false],
  ["a message that merely says safeword -> BLOCK", [user(ch("New message from BinaryMisfit (with Alexia)", "alexia-binarymisfit.jsonl")), ], true],
  // house state broadcasts are exempt in any case (the REST door stores whatever case it is sent)
  ["state broadcast, Capital Closed   -> pass", [user(ch("Alexia is now Closed.", "Alexia"))], false],
  ["state broadcast, lowercase closed -> pass", [user(ch("Alexia is now closed.", "Alexia"))], false],
];
let bad = 0;
for (const [name, lines, wantBlock] of cases) {
  const f = path.join(__dirname, "t.jsonl");
  fs.writeFileSync(f, lines.join("\n") + "\n");
  const r = spawnSync("node", [HOOK], { input: JSON.stringify({ transcript_path: f, cwd: "D:/Source/Persona/Alexia/control-room" }), encoding: "utf8" });
  const blocked = /"decision":"block"/.test(r.stdout);
  const ok = blocked === wantBlock;
  if (!ok) bad++;
  console.log((ok ? "PASS " : "FAIL ") + name + (r.stderr ? "  stderr: " + r.stderr.trim() : ""));
}
process.exit(bad ? 1 : 0);
