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

---

## Output Format (STRICT)

Always output inside a copy-friendly plain text box using this exact structure.
Start on a new line before the opening delimiter, and end with a newline after the closing delimiter:

================ CONTINUATION CONTEXT PACK ================
Prepare continuation context:
- Current state:
- Key decisions:
- Next action: [describe step — wait for explicit user instruction before executing]
- Constraints:
[- Files: only if needed for the next step]
===========================================================

The opening and closing delimiter lines must always be standalone lines.
Omit any field with nothing relevant to include.

---

## Rules

- Bullet points only
- 1–2 bullets per field
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

- Current state → what exists now (code, plan, progress)
- Key decisions → irreversible or important choices
- Next action → immediate executable step, or "Start new session" if no pending work
- Constraints → limits, requirements, edge conditions
- Files → only if needed for the next step
