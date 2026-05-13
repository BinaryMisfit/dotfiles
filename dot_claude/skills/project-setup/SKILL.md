---
name: project-setup
description: Bootstrap or refresh Claude Code configuration for the current git repo. Initializes CLAUDE.md if missing, updates it if stale, creates/updates .claude/settings.json with toolchain-appropriate allowed commands (file writes and read-only git/gh auto-approved; write git/gh operations prompt at runtime). Invoke for actions like "setup project", "init claude config", "refresh project setup", "bootstrap claude for this repo".
user-invocable: true
tools: Read, Glob, Grep, Bash, Write, Edit
---

# Skill: Project Setup

Bootstrap Claude Code for the current git repo in one pass: generate or patch `CLAUDE.md`, then write/merge `.claude/settings.json` with a toolchain-aware permission allowlist. Only the project-local `.claude/settings.json` is written — global user settings are never touched.

**Optional flags** (all default `false`): `force_reinit` · `skip_claude_md` · `skip_settings`

## Phase 1: Prerequisite Checks

Confirm git repo (`git rev-parse --show-toplevel`). Capture repo root. Note if `.claude/` is absent.

## Phase 2: Toolchain Detection

Probe for indicator files. Collect all matches — projects can have multiple.

| Toolchain | Indicator files |
|---|---|
| .NET / MAUI | `*.sln`, `*.csproj`, `Directory.Packages.props`, `Directory.Build.props`, `global.json` |
| Node / npm | `package.json`, `package-lock.json` |
| Node / yarn | `yarn.lock` |
| Node / pnpm | `pnpm-lock.yaml` |
| Python / pip | `requirements.txt`, `setup.py`, `pyproject.toml` (no `[tool.poetry]`) |
| Python / poetry | `pyproject.toml` with `[tool.poetry]` |
| Rust | `Cargo.toml` |
| Go | `go.mod` |
| Java / Maven | `pom.xml` |
| Java / Gradle | `build.gradle`, `build.gradle.kts`, `gradlew` |
| Ruby | `Gemfile` |
| PHP | `composer.json` |

Also check `Makefile`, `justfile`, CI configs (`.github/workflows/`, `azure-pipelines.yml`, `buildspec.yml`), and existing CLAUDE.md/README for actual commands used.

## Phase 3: CLAUDE.md Assessment

### Missing (or `force_reinit=true`)

Generate from scratch. Include only sections with discovered content — no placeholders.

```markdown
## Solutions / Entry Points
## Build Commands
## Test Commands
## Architecture Overview
## Key Conventions
## Environments / Configuration   ← only if present
## Infrastructure / Deployment    ← only if present
```

All commands must be copy-paste ready and verified against actual files. No generic advice.

### Existing — Staleness Check

| Check | Method |
|---|---|
| Build/test commands valid | Verify referenced paths exist on disk |
| Solution files listed | Verify `.sln` references exist |
| Architecture section current | Spot-check directories mentioned |
| Conventions current | Check `Directory.Packages.props`, `.editorconfig` |
| New structure since last update | `git log --oneline --diff-filter=A --name-only -20` |

Rating: **Fresh** (no action) · **Minor drift** (patch 1–2 items) · **Stale** (section rewrites) · **Obsolete** (stop, recommend `force_reinit=true`).

Output the staleness report before proposing any edits.

## Phase 4: Settings Construction

Target file: `.claude/settings.json` (project-local only).

### Always allowed

```json
"mcp__*",
"Bash(git status*)",   "PowerShell(git status*)",
"Bash(git log*)",      "PowerShell(git log*)",
"Bash(git diff*)",     "PowerShell(git diff*)",
"Bash(git show*)",     "PowerShell(git show*)",
"Bash(git blame*)",    "PowerShell(git blame*)",
"Bash(git branch*)",   "PowerShell(git branch*)",
"Bash(git remote*)",   "PowerShell(git remote*)",
"Bash(git rev-parse*)","PowerShell(git rev-parse*)",
"Bash(git stash list*)","Bash(git describe*)","Bash(git shortlog*)",
"Bash(gh pr list*)","Bash(gh pr view*)","Bash(gh pr checks*)","Bash(gh pr diff*)",
"Bash(gh issue list*)","Bash(gh issue view*)",
"Bash(gh run list*)","Bash(gh run view*)","Bash(gh repo view*)",
"PowerShell(gh pr list*)","PowerShell(gh pr view*)",
"PowerShell(gh issue list*)","PowerShell(gh run list*)"
```

Write git/gh operations (`commit`, `push`, `pull`, `fetch`, `merge`, `rebase`, `add`, `checkout`, `reset`, `stash pop/drop`, `pr create/merge/close`, `issue create/close`, etc.) are intentionally absent — they prompt at runtime.

### Toolchain allowlist

Add per detected toolchain. Both `Bash(...)` and `PowerShell(...)` variants for .NET; `Bash(...)` only for others.

| Toolchain | Patterns |
|---|---|
| .NET | `dotnet build*` `dotnet restore*` `dotnet test*` `dotnet run*` `dotnet format*` `dotnet list*` `dotnet clean*` `dotnet publish*` |
| .NET + MAUI | add `dotnet build* -f net*-android*` `dotnet build* -f net*-ios*` |
| npm | `npm install*` `npm ci*` `npm run *` `npm test*` `npx *` |
| yarn | `yarn install*` `yarn *` |
| pnpm | `pnpm install*` `pnpm run *` `pnpm test*` |
| pip | `pip install*` `python -m pytest*` `python -m build*` `python -m mypy*` `python -m ruff*` `python -m black*` |
| poetry | `poetry install*` `poetry run *` `poetry build*` |
| cargo | `cargo build*` `cargo test*` `cargo run*` `cargo check*` `cargo clippy*` `cargo fmt*` |
| go | `go build*` `go test*` `go run*` `go vet*` `go mod tidy*` `gofmt*` `golangci-lint*` |
| Maven | `mvn clean*` `mvn compile*` `mvn test*` `mvn package*` `mvn install*` |
| Gradle | `./gradlew build*` `./gradlew test*` `./gradlew clean*` `./gradlew check*` `./gradlew assemble*` |
| Ruby | `bundle install*` `bundle exec rspec*` `bundle exec rake*` `rails test*` |
| PHP | `composer install*` `composer require*` `php artisan*` `./vendor/bin/phpunit*` |

### Merge strategy

If `.claude/settings.json` exists: union existing `allow` with new entries; preserve all other keys; never remove existing `allow` or `deny` entries. If absent: create with `permissions` key only.

## Phase 5: Preview and Confirmation

Show before writing:
- Repo root, toolchains detected
- CLAUDE.md: status + action + diff/full content if changing
- `.claude/settings.json`: action + final JSON

Prompt: **"Proceed? (yes / Approve / skip-settings / skip-claude-md)"** — any other response aborts.

## Phase 6: Apply

Create `.claude/` if absent. Write approved files. Report paths written. Do not commit or stage.

## Guardrails

- Never write global `~/.claude/settings.json`.
- Never add write git/gh subcommands to the allowlist (see list above).
- Ambiguous toolchain (e.g., `pyproject.toml`) → emit entries for both candidates.
- Obsolete CLAUDE.md → stop, recommend `force_reinit=true`; do not attempt partial repair.
- CLAUDE.md must never contain generic advice, placeholder text, or TODO markers.
