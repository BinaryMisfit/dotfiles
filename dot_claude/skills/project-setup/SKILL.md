---
name: project-setup
description: Bootstrap or refresh Claude Code configuration for the current git repo. Initializes CLAUDE.md if missing, updates it if stale, creates/updates .claude/settings.local.json with toolchain-appropriate allowed commands (file writes and read-only git/gh auto-approved; write git/gh operations prompt at runtime). Invoke for actions like "setup project", "init claude config", "refresh project setup", "bootstrap claude for this repo".
user-invocable: true
tools: Read, Glob, Grep, Bash, Write, Edit
---

# Skill: Project Setup

Bootstrap Claude Code for the current git repo in one pass: generate or patch `CLAUDE.md`, then write/merge `.claude/settings.local.json` with a toolchain-aware permission allowlist. Only the project-local `.claude/settings.local.json` is written — global user settings are never touched.

Two deterministic paths — no flags, no overrides:
- **New repo** (no `CLAUDE.md` and no `.claude/`): create `CLAUDE.md` and `.claude/settings.local.json` from scratch.
- **Existing repo** (has `CLAUDE.md` or `.claude/`): update `CLAUDE.md` and enforce the settings merge/delete flow.

## Phase 1: Prerequisite Checks

Confirm git repo (`git rev-parse --show-toplevel`). Capture repo root.

Detect repo state:
- `CLAUDE.md` exists → **existing repo path**
- `CLAUDE.md` absent, `.claude/` exists → **existing repo path** (CLAUDE.md will be generated as new)
- Neither present → **new repo path**

Check for `.claude/settings.json` — if present, it will be merged into `.claude/settings.local.json` and deleted in Phase 6.

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

Ambiguous toolchain (e.g., `pyproject.toml`) → emit allowlist entries for both candidates.

## Phase 3: CLAUDE.md Assessment

### New repo path

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

All commands must be copy-paste ready and verified against actual files. Never include generic advice, placeholder text, or TODO markers.

### Existing repo path — Staleness Check

| Check | Method |
|---|---|
| Build/test commands valid | Verify referenced paths exist on disk |
| Solution files listed | Verify `.sln` references exist |
| Architecture section current | Spot-check directories mentioned |
| Conventions current | Check `Directory.Packages.props`, `.editorconfig` |
| New structure since last update | `git log --oneline --diff-filter=A --name-only -20` |

Rating: **Fresh** (no action) · **Minor drift** (patch 1–2 items) · **Stale** (section rewrites) · **Obsolete** (full regeneration required — treat as new repo path).

Output the staleness report before proposing any edits.

## Phase 4: Settings Construction

Target file: `.claude/settings.local.json` (project-local only). Never write to global `~/.claude/settings.json`.

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

If `.claude/settings.local.json` exists: union existing `allow` with new entries; preserve all other keys; never remove existing `allow` or `deny` entries. If absent: create with `permissions` key only.

If `.claude/settings.json` exists in the project: merge its `allow` and `deny` entries into `.claude/settings.local.json` first (deduplicating), then delete `.claude/settings.json`. This step is always enforced and cannot be skipped.

## Phase 5: Preview and Confirmation

Show before writing:
- Repo root, path (new / existing), toolchains detected
- CLAUDE.md: status + action + diff/full content if changing
- `.claude/settings.local.json`: action + final JSON
- `.claude/settings.json`: merge-and-delete if present

Show preview and wait for affirmation before proceeding.

## Phase 6: Apply

1. Create `.claude/` if absent.
2. If `.claude/settings.json` present: merge into `.claude/settings.local.json`, then delete `.claude/settings.json`.
3. Write `.claude/settings.local.json`.
4. Write (new/obsolete path) or Edit (Minor drift/Stale path) `CLAUDE.md` per Phase 3 rating. Skip if Fresh.
5. Report paths written and deleted. Do not commit or stage.

