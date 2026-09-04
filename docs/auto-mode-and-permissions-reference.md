# Auto mode & permissions reference

Research pass, 2026-09-04, verified directly against Claude Code's own current docs
(`code.claude.com/docs/en/permission-modes`, `/permissions`, `/auto-mode-config`,
`/settings-reference`) — not memory, not assumption. Prompted by two real incidents the
same night: [ADR 0025](adr/0025-auto-mode-environment-trust-block-homelab-scoped.md)'s
own scope turning out narrower than reality (the "classifier ignores project-level
settings.local.json" fact applies to every `autoMode` sub-key, not just `environment`),
and repeated live confirmation of the self-edit block's actual clearing mechanic. This
doc exists so neither has to be re-derived from scratch next time, and so the whole
security-mode picture — not just the one corner ADR 0025 covers — is written down
somewhere real.

## The six permission modes

| Mode | Config value | What runs without asking | This repo's relevance |
|---|---|---|---|
| Manual | `default` | Reads only | The safe fallback; `claude --permission-mode default` |
| Accept edits | `acceptEdits` | Reads, file edits, common filesystem commands (`mkdir`, `touch`, `mv`, `cp`, `rm`, `rmdir`, `sed`) in the working directory | Not configured here |
| Plan | `plan` | Reads; classifier-approved commands too when auto mode is available and `useAutoModeDuringPlan` is on (default) | `useAutoModeDuringPlan: false` is set in `dot_claude/settings.json.tmpl` — planning sessions here always prompt for non-read-only commands, deliberately more conservative than the default |
| Auto | `auto` | Everything, reviewed by a background classifier | **The mode this repo's `settings.json.tmpl` sets as `defaultMode`** — everything below is about this mode |
| Don't ask | `dontAsk` | Only pre-approved tools (`permissions.allow` + built-in read-only commands) | Not configured here; CI/script use case |
| Bypass permissions | `bypassPermissions` | Everything except a small no-mode-auto-approves list | Not configured here — explicitly for isolated containers/VMs only, never a daily-driver machine |

`default`'s CLI label is "Manual"; `manual` is accepted as an alias (Claude Code
v2.1.200+). Session starting mode is decided in order: `--permission-mode` flag →
`permissions.defaultMode` in a settings file → built-in default (which is `auto` on
Pro/Max/Team plans in a terminal or VS Code, as of v2.1.228+/v2.1.233+ on native
Windows). **`defaultMode: "auto"` and `"bypassPermissions"` silently don't take effect
from `.claude/settings.json` or `.claude/settings.local.json`** — only from
`~/.claude/settings.json` (or managed/`--settings`). This repo's own `defaultMode:
"auto"` is correctly set in the global template for exactly this reason.

## The permission rule system (`permissions.allow`/`ask`/`deny`)

Separate layer from the classifier, evaluated **first** — deny, then ask, then allow,
first match wins regardless of specificity. A broad deny (`Bash(aws *)`) blocks even a
narrower matching allow. This is the mechanism our project-local `settings.local.json`
files use (the `ssh netctrl` entries in `digital-homelab`, this repo's own two
`permissions.allow` entries).

Key facts that actually matter here:
- **Rule syntax:** `Tool` or `Tool(specifier)`. Bash/PowerShell specifiers are prefix
  matches with `*` as wildcard — put the `*` *after* the subcommand
  (`Bash(git *)` allows every git command; `Bash(git * main)` is a trap, matches every
  subcommand before `main`, not just one).
- **Compound commands** are split on `&&`, `||`, `;`, `|`, `|&`, `&`, newlines — a rule
  must match each subcommand independently, so `Bash(safe-cmd *)` never grants
  `safe-cmd && other-cmd`.
- **Read-only Bash commands** (`ls`, `cat`, `grep`, `find`, `git` read forms, etc.) never
  prompt in any mode, rule-independent.
- **Where "Yes, and don't ask again" saves to:** `.claude/settings.local.json` at the git
  repo root (resolved through worktrees), v2.1.211+. This is *not* the same file the
  classifier reads for `autoMode` — a rule saved here is a `permissions` rule, always
  local-scoped and correctly so; only `autoMode` itself is restricted to the global file.
- **Protected paths** (`.git`, `.claude`, `.gitconfig`, shell rc files, `.mcp.json`,
  etc.) are *never* auto-approved by a `permissions.allow` rule in any mode except
  `bypassPermissions` — the safety check runs before allow rules are even evaluated. An
  `Edit(.claude/**)` allow entry does nothing for this.
- **Critical-path `rm`/`rmdir`** (filesystem root, top-level dirs, home dir, working
  directory and its parents) can never be approved by an allow rule or a `PreToolUse`
  hook returning `"allow"`, in any mode — routed to the classifier in `auto`, always
  asks in every prompting mode.

## The auto mode classifier — what actually governs this repo's default mode

Auto mode is a second model (Sonnet 5 by default) that reviews each action instead of
prompting. It only sees: user messages, non-read-only tool calls, and CLAUDE.md content
— tool *results* are stripped specifically so hostile file/web content can't manipulate
it directly.

**Decision order, first match wins:**
1. `permissions.allow`/`ask`/`deny` rules resolve immediately (except protected-path
   writes and critical-path `rm`, which route to the classifier even past an allow
   match).
2. Read-only actions and working-directory file edits auto-approve.
3. Everything else → classifier.
4. Classifier blocks → Claude gets `Blocked by classifier` (fixed text as of v2.1.208+,
   no explanation) and tries an alternative or stops to explain.

**Blocked by default (the parts relevant to this project — full categorized list is
much longer):** `curl | bash`, force push, `git reset --hard`/`checkout -- .`/
`clean -fd`/`stash drop`/`clear` (presumed to discard uncommitted work), production
deploys/migrations, granting IAM/repo permissions, writing to a secret manager, printing
a live credential into the transcript, launching an unattended agent loop
(`--dangerously-skip-permissions`/`--no-sandbox`), **an AI editing its own permissions/
trust config — the specific pattern that blocked this session twice tonight, categorized
under the built-in `soft_deny` rule for "auto-mode bypass."**

**Allowed by default:** local file ops in the working directory, dependency installs
from lockfiles, reading `.env` and sending it to its matching API, read-only HTTP,
pushing to any branch of the working repo (non-default branches named like deploy
targets — `production`, `release`, `gh-pages` — judged on their own terms).

**The four `autoMode` config lists**, all prose (natural-language rules, not
regex/patterns), all spliced with `"$defaults"` unless you deliberately discard the
built-ins:
- `environment` — defines *trusted infrastructure* (what counts as internal vs.
  external). This repo's block in `dot_claude/settings.json.tmpl` (organization, GCP
  projects, `netctrl`/LAN hosts, `*.digitalmisfit.net`) — see ADR 0025.
- `allow` — exceptions to `soft_deny` rules. This repo's new entry (the verified-safe
  `git reset --hard` via `netctrl`) lives here, added 2026-09-04 alongside
  `environment`.
- `soft_deny` — destructive-risk rules that user intent *can* override.
- `hard_deny` — unconditional security boundaries; neither intent nor `allow` clears
  these.

**The critical placement fact, confirmed live tonight, that ADR 0025 originally
under-scoped:** *none* of these four keys are read by the classifier from any
project-level file — not `.claude/settings.json`, not `.claude/settings.local.json`, in
any repo. Only `~/.claude/settings.json`, managed settings, or `--settings` inline JSON.
A project checked into version control (or a build step) could otherwise smuggle its own
classifier exceptions — same reasoning as the environment-trust scoping, just broader
than the original ADR named. **Every `autoMode` entry in this project's own config lives
in `dot_claude/settings.json.tmpl`, home-profile-gated — never in any repo's own
`settings.local.json`.**

**Explicit-intent override, confirmed live:** a `soft_deny` match (including the
self-edit block) clears only when the user's own message *specifically names the exact
action* — not a general "go ahead" stated earlier in the conversation. Confirmed twice
tonight: a generically-approved edit attempt was blocked; the identical edit, retried
after BinaryMisfit's message named the exact file and exact change, went through.
General requests ("clean up the repo") never count as this kind of intent; naming the
specific action does.

**Boundaries stated in conversation** ("don't push until I review") are read fresh from
the transcript on every check — not stored as a rule, so a boundary can be lost to
context compaction. For a durable guarantee, a `permissions.ask`/`deny` rule is the real
mechanism, not a remembered sentence.

**Repeated-block fallback:** 3 consecutive blocks or 20 total in a session pauses auto
mode and Claude Code resumes prompting normally; approving the prompt resumes auto mode.
Not configurable.

## Sandbox (`sandbox.*`) — separate layer, not currently enabled here

`sandbox.enabled` is `false` in this repo's template. Sandboxing is OS-level enforcement
on Bash's own filesystem/network access (macOS/Linux/WSL2 only) — complementary to, not
a replacement for, the permission/classifier layers above. Filesystem isolation
(`sandbox.filesystem.*`), network isolation with an allow/deny domain list
(`sandbox.network.*`), and credential masking (`sandbox.credentials.*`) are all
available if this repo ever turns it on; none of it applies to the Windows-native
sessions this machine actually runs today.

## Practical takeaways for this project

1. **Any future `autoMode` change goes in `dot_claude/settings.json.tmpl`, home-profile
   gated — never a project's own `settings.local.json`.** A proposal that puts it
   anywhere else needs correcting before it's applied, regardless of how the requester
   scoped it.
2. **`permissions.allow`/`ask`/`deny` entries are genuinely project-local-correct** —
   don't over-generalize the `autoMode` restriction onto the plain permission-rule
   system, they're different mechanisms with different scoping rules.
3. **Self-editing settings/trust config always needs the user's specific, action-naming
   message** — a standing conversational approval from earlier doesn't carry forward to
   clear the classifier's own soft-deny check each time.
4. **`useAutoModeDuringPlan: false`** here means plan-mode sessions in this project are
   more conservative than Claude Code's own default — worth remembering before assuming
   plan mode behaves identically to a fresh install.

See also: [ADR 0025](adr/0025-auto-mode-environment-trust-block-homelab-scoped.md) for
the specific decision and incident history this research grew out of.
