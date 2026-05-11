## Pull Requests

Policy: User-initiated only. Invoke `pr-prep-and-submit` to prepare and submit.

---

## Confirmation Gates

**Keyword:** `Approve` — the single confirmation keyword across all operations, agent-level and skill-level.

**Soft confirm** (any affirmative — "yes", "ok"):
- Low-risk local actions with no external side effects

**Hard confirm (`Approve` required):**
- Protected branch push or force-push
- Destructive Git ops
- PR creation and submission
- Branch deletion

**Note:** Skills define their own confirmation gates. JIRA skills (transitions, comments, unassign) use preview-first and only gate on generated suggestions — JIRA will reject invalid operations server-side.

**Rules:**
- Always show a full preview before triggering any confirmation gate
- Never bundle multiple hard-confirm actions into a single gate
- This definition applies across all instruction files

---

## Scope

- All Git ops in current repo
- Exceptions: .claude/settings.json, .claude/settings.local.json, CLAUDE.md, .claude/CLAUDE.md
- Emergency: user can request "force" + explicit confirmation
