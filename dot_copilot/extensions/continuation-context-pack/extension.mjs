// Skill: Continuation Context Pack
// Compress current working state into a minimal, portable handoff packet for a new session.

import { joinSession } from "@github/copilot-sdk/extension";
import { spawn } from "node:child_process";

const SKILL_PROMPT = `IMPORTANT: Do not proceed with implementation. Only generate the context pack.

# Skill: Continuation Context Pack

## Purpose
Compress the current working state into a minimal, portable handoff packet for a new session.

This is NOT a summary of the conversation.
This IS a state transfer artifact to resume work with zero prior context.

---

## Output Format (STRICT)

Prepare continuation context:
- Current state:
- Key decisions:
- Next action: [describe step — DO NOT execute automatically; wait for explicit user instruction]
- Constraints:
- Files (if relevant):

---

## Rules

- Bullet points only
- Max 6 bullets TOTAL (not per section)
- No explanations
- No prose
- No repetition
- No filler words
- No "helpful" commentary
- No markdown formatting beyond this structure
- Prefer concrete, actionable language
- Preserve technical intent over completeness

---

## Compression Heuristics

- Current state → what exists right now (code, plan, progress)
- Key decisions → irreversible or important choices made
- Next action → the immediate, executable step OR explicitly "Start new session" if no pending work
- Constraints → limits, requirements, edge conditions
- Files → only if they matter to the next step

---

## When To Use

- After completing a meaningful unit of work
- Before starting a new session
- When context is getting large or unfocused
- Before handing off to another AI/system

---

## Anti-Patterns (DO NOT DO)

- Do not summarize the entire conversation
- Do not explain reasoning
- Do not include history unless it affects the next step
- Do not exceed 6 bullets
- Do not turn this into documentation

---

## Success Criteria

A new session should be able to:
- Understand the current state instantly
- Know exactly what to do next — but wait for the user to say so
- Avoid rework or repeated decisions

---

## Clipboard Instruction (MANDATORY)

1. Display the fully generated context pack visibly in your response.
2. Only call the \`copy_to_clipboard\` tool if "Next action" contains a concrete executable step.
3. Do NOT call \`copy_to_clipboard\` if "Next action" is "Start new session".
Do this automatically — do not ask for confirmation.`;

const session = await joinSession({
    tools: [
        {
            name: "continuation_context_pack",
            description: "Generate a minimal, portable continuation context packet for handing off the current working state to a new session. Compresses state into ≤6 bullets covering: current state, key decisions, next action, constraints, and relevant files. After generating, automatically calls copy_to_clipboard with the result.",
            parameters: { type: "object", properties: {} },
            skipPermission: true,
            handler: async (_args, _invocation) => {
                return {
                    textResultForLlm: SKILL_PROMPT,
                    resultType: "success",
                };
            },
        },
        {
            name: "copy_to_clipboard",
            description: "Copy the provided text to the system clipboard. Called automatically after generating a continuation context pack.",
            parameters: {
                type: "object",
                properties: {
                    text: { type: "string", description: "The text to copy to the clipboard." },
                },
                required: ["text"],
            },
            skipPermission: true,
            handler: async (args, _invocation) => {
                const platform = process.platform;

                const clipCommand = () => {
                    if (platform === "win32")  return { cmd: "clip",  args: [],                              encoding: "utf8" };
                    if (platform === "darwin") return { cmd: "pbcopy", args: [],                             encoding: "utf8" };
                    if (platform === "linux")  return { cmd: "xclip", args: ["-selection", "clipboard"],    encoding: "utf8" };
                    return null;
                };

                const target = clipCommand();
                if (!target) {
                    return { textResultForLlm: `⚠️ Clipboard not supported on platform: ${platform}. Context pack generated above — copy manually.`, resultType: "success" };
                }

                const tryClip = (cmd, cmdArgs) => new Promise((resolve, reject) => {
                    const proc = spawn(cmd, cmdArgs, { stdio: ["pipe", "ignore", "ignore"], windowsHide: true });
                    const timer = setTimeout(() => { proc.kill(); reject(new Error(`${cmd} timed out`)); }, 10000);
                    proc.on("close", code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`)); });
                    proc.on("error", reject);
                    proc.stdin.write(args.text, target.encoding);
                    proc.stdin.end();
                });

                try {
                    await tryClip(target.cmd, target.args);
                    return { textResultForLlm: "✅ Context pack copied to clipboard.", resultType: "success" };
                } catch (primaryErr) {
                    // Linux fallback: xsel
                    if (platform === "linux") {
                        try {
                            await tryClip("xsel", ["--clipboard", "--input"]);
                            return { textResultForLlm: "✅ Context pack copied to clipboard (via xsel).", resultType: "success" };
                        } catch (_) {}
                    }
                    return { textResultForLlm: `⚠️ Clipboard copy failed: ${primaryErr.message}. Context pack generated above — copy manually.`, resultType: "success" };
                }
            },
        },
    ],
});
