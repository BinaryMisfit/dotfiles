# 0005 — `settings.json` stays machine-portable; machine-specific state moves to `settings.local.json`

Comparing this repo's tracked `dot_claude/settings.json.tmpl` against what's actually live
on this machine (2026-08-30) surfaced two divergences worth settling rather than just
reconciling silently.

**Status:** Decided

**Decision:**
1. `permissions.additionalDirectories` does not belong in the shared, chezmoi-templated
   `settings.json` — it names paths specific to this one machine's project layout
   (`D:\Source\xcl\...`), which wouldn't exist the same way on another machine this repo
   targets. It now lives in `~/.claude/settings.local.json` instead, which is explicitly
   excluded from chezmoi management (`.chezmoiignore`: "Runtime-only state... never manage
   it").
2. `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` moves from the raw homelab IP
   (`http://192.168.50.31:14320/v1/logs`) to `https://ai-usage.digitalmisfit.net/v1/logs`
   — tested reachable (DNS resolves via internal pi-hole to `192.168.50.15`, TLS/HTTP
   connects) before making the switch. The template previously pointed at a third value,
   `ai-usage.fairview.zone`, which was never actually live anywhere — corrected to match
   the tested, intended domain.

**Why:** `settings.json` is meant to be the same shape on every machine this repo
provisions (Windows/macOS/Linux, work/home profile) — a key listing one machine's local
directory structure breaks that portability the moment it's synced anywhere else.
`settings.local.json` already exists precisely for machine-local, non-shared state; this
was drift that hadn't been swept into it yet.

**How to apply:** any future `additionalDirectories` grant, or anything else genuinely
specific to one machine's own layout, goes in that machine's `settings.local.json`, never
in the template. The OTEL endpoint in both the template and this machine's live
`settings.json` now agree on `ai-usage.digitalmisfit.net`.
