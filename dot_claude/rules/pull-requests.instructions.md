## Pull Requests

Policy: User-initiated only. Invoke `pr-prep-and-submit` to prepare and submit.

---

## Confirmation Gates

**Keyword:** `Approve` — the single confirmation keyword across all operations, agent-level and skill-level.

**Soft confirm** (any affirmative — "yes", "ok"):
- Low-risk local actions with no external side effects

**Hard confirm (`Approve` required):**
- PR creation and submission

**Rules:**
- Always show a full preview before triggering any confirmation gate
- Never bundle multiple hard-confirm actions into a single gate
