## Pull Requests

**Policy:** User-initiated only. Agent generates summary; user must explicitly request submission.

**Agent generates:** title, body, file list, breaking-tags (if [BREAKING] in commits).

**User confirms:** base, head, and replies "Proceed" to submit.

**Always set on every PR:**
- Auto-complete: attempt to enable via API; if the API does not support it (e.g. identity ID required), note the limitation and instruct user to enable manually.
- Merge strategy: `noFastForward` (merge commit — never squash or rebase)
- Delete source branch on completion: `true`

---

## Confirmation Gates

**Keyword:** `"Proceed"` — the single confirmation keyword across all operations, Git, JIRA, and external services.

**Soft confirm** (any affirmative — "yes", "ok", "approved"):
- Low-risk local actions with no external side effects

**Hard confirm** (`"Proceed"` required):
- PRs (creation and submission)
- Protected branch operations (push, force-push, branch delete)
- Destructive Git ops
- JIRA status transitions
- JIRA comment posting
- Any ADO or external service write operation

**Rules:**
- Always show a full preview before triggering a gate
- Never bundle multiple hard-confirm actions into a single "Proceed"
- This definition applies across all instruction files

---

## Scope

- All Git ops in current repo
- Exceptions: .copilot/project-config.md (project overrides)
- Emergency: user can request "force" + explicit confirmation
