---
name: continuation-context-pack
description: Generate a minimal, portable continuation context packet for handing off current work to a new Codex session or another AI. Use when the user says "Pack my context" or asks to prepare continuation context, create a handoff packet, compress current state, preserve resume context, or package session state before starting over.
triggers:
  - "Pack my context"
---

# Continuation Context Pack

## Task

Generate only a compact state transfer artifact. Do not continue implementation, make edits, run tests, or explain the pack unless the user separately asks.

This is not a conversation summary. It is a resume packet for a fresh session with no prior context.

## Output Format

Use exactly this structure:

```text
Prepare continuation context:
- Current state:
- Key decisions:
- Next action:
- Constraints:
- Files:
```

## Rules

- Use bullet points only.
- Use at most 6 bullets total.
- Do not add prose outside the structure.
- Do not repeat information.
- Do not include filler, reasoning, or commentary.
- Prefer concrete, actionable language.
- Preserve technical intent over completeness.
- Set `Next action` to `Start new session` when there is no pending executable step.
- Include files only when they matter to the next step.

## Compression Heuristics

- Current state: what exists now, including code, plan, or progress.
- Key decisions: important choices already made that should not be rediscovered.
- Next action: the immediate executable step, or `Start new session`.
- Constraints: requirements, limits, safety rules, edge conditions, or verification gaps.
- Files: relevant paths only.

## Clipboard

After displaying the context pack visibly, optionally copy the exact pack to the clipboard when both conditions are true:

- The user asked for clipboard behavior or the environment convention expects it.
- `Next action` contains a concrete executable step, not `Start new session`.

On Windows, use `scripts/copy-context-pack.ps1` from this skill. If clipboard copy fails, leave the visible context pack as the source of truth.
