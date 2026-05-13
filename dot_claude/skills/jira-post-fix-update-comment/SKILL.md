---
name: jira-post-fix-update-comment
description: >-
  Generate and post the Jira "Fix Update" comment in plain language.
  Invoke for actions like "post fix update", "add fix update comment",
  or "notify ticket of issue behavior addressed".
user-invocable: true
---

# Skill: Jira Post Fix Update Comment

## Purpose
Create and post the non-technical Jira fix update comment.

---

## Required Inputs

- ticket_id
- issue_behavior_addressed
- how_addressed_plain_text

---

## Integration & Authentication

**Try MCP first:** Use available Jira MCP tools (e.g. `addCommentToJiraIssue`).

**Fallback to REST API** with basic auth. Required env vars: `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`.

Stop and report if any env var is missing.

---

## Required Comment Format

- One short human-readable paragraph.
- Include what behavior was addressed, in plain language.
- Include how it was addressed, in plain language.
- Optional: user-impact reassurance, in plain language.

---

## Required Flow

1. Perform the integration and authentication checks defined above. Stop and report if requirements are not met.
2. Build comment draft as a short paragraph using natural language (no bullet points, no label prefixes).
3. Validate no root cause, stack traces, internal identifiers, jargon, PR references, or current-state wording.
4. Preview full comment and wait for affirmation before proceeding.
5. Post comment and return metadata.

---

## Output Contract

Return:
- comment_preview
- posted_comment_id
- execution_result

---

## Failure Handling

- If plain-language validation fails, regenerate preview and block posting.
- If posting fails, report error and stop.
- If MCP fails during posting, stop, report the cause, and offer to retry using REST API.
