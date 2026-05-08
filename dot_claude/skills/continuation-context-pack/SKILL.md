---
name: continuation-context-pack
description: >-
  Generate a minimal, portable continuation context packet for handing off the
  current working state to a new session. Invoke for requests like "pack context",
  "handoff", "continuation pack", "wrap up", or "start new session".
user-invocable: true
---

# Skill: Continuation Context Pack

## Purpose
Compress current working state into a minimal handoff packet for a new session.

Not a conversation summary. It is a state transfer artifact for zero-context resume.

---

## Output Format (STRICT)

Always output inside a copy-friendly plain text box using this exact structure.
Start on a new line before the opening delimiter, and end with a newline after the closing delimiter:

================ CONTINUATION CONTEXT PACK ================
Prepare continuation context:
- Current state:
- Key decisions:
- Next action: [describe step - DO NOT execute automatically; wait for explicit user instruction]
- Constraints:
- Files (if relevant):
===========================================================

The opening and closing delimiter lines must always be standalone lines.

---

## Rules

- Bullet points only
- Max 6 bullets total (not per section)
- No explanations
- No prose
- No repetition
- No filler words
- No "helpful" commentary
- No markdown formatting beyond the required box structure
- Prefer concrete, actionable language
- Preserve technical intent over completeness

---

## Compression Heuristics

- Current state -> what exists now (code, plan, progress)
- Key decisions -> irreversible or important choices
- Next action -> immediate executable step, or "Start new session" if no pending work
- Constraints -> limits, requirements, edge conditions
- Files -> only if needed for the next step

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
- Know exactly what to do next, but wait for user instruction
- Avoid rework or repeated decisions
