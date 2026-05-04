## Skill Integration

### When to Use Built-in Workflows

**Defect Triage:**
When you mention investigating, triaging, or fixing a defect (e.g., "UATD-1234", "bug", "crash", "defect"), invoke the **defect-workflow skill**:
- Automatically runs Phases 1–4 (load ticket, reproduce, root cause, blast radius)
- Saves 10–15 turns of manual investigation
- Structured briefing on fix approach before implementation

**Feature Development:**
When you mention starting, implementing, or kicking off a feature (e.g., "UA-1234", "feature", "implement", "start work on"), invoke the **feature-workflow skill**:
- Automatically runs Phases 1–4 (load ticket, analyze repo, gap analysis, blockers)
- Saves 10–15 turns of manual planning
- Structured briefing on gaps and blockers before implementation

**How to invoke:**
- Say: "Investigate [TICKET_ID]" or "Start feature [TICKET_ID]"
- Or explicitly: "Run defect-workflow for UATD-1234"

---

## Pull Requests

**Policy:** User-initiated only. Agent generates summary; user must explicitly request submission.

**Agent generates:** title, body, file list, breaking-tags (if [BREAKING] in commits).

**User confirms:** base, head, and replies "Proceed" to submit.

**Always set on every PR:**
- Auto-complete enabled (set by PR creator)
- Merge strategy: `noFastForward` (merge commit — never squash or rebase)
- Delete source branch on completion: `true`

---

## Confirmation Gates

- **Local, safe:** one-line summary → proceed
- **Protected branches, PRs, destructive Git ops (force-push, branch delete):** summary/description → require "Proceed"

Note: Local workspace file deletion is handled separately from this policy (immediate, with summary). This section addresses Git-level operations only.

---

## Scope

- All Git ops in current repo
- Exceptions: .copilot/project-config.md (project overrides)
- Emergency: user can request "force" + explicit confirmation
