## Commit Readiness

Invoke `commit-ready-check` to validate and commit.

---

## Auto-Commit

Proactively invoke `commit-ready-check` (with `auto_commit=true`) only when ALL true:
- Single concern, ≤5 files changed
- No protected files in the change set
- User has not indicated the work is incomplete

If uncertain: ask before committing.
