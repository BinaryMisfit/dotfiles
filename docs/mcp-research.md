# MCP/plugin research — verdict table

Real evaluation, 2026-09-07, 17 tool calls cross-checked against GitHub's own API for
stars/last-push, not snippet-guessed. Never written up at the time — brought into
`docs/todo-register.md` as `TODO-11` on 2026-09-08 from a scratchpad that no longer exists
on disk. Recovered from the original session transcript and reviewed candidate-by-candidate
with BinaryMisfit, 2026-09-12, real changes applied where the ground had actually moved
since the original research (`ai-nadia` moving to AWS, `binary-dotfiles` itself moving off
GitHub, a real Grafana deployment surfacing that didn't exist in the original read).

**Standing decision, 2026-09-12:** every adopted MCP server goes into global config, never
local-only — the marginal cost of running one isn't worth the inconsistency of scoping it
to one project.

## Final verdicts

| Candidate | Verdict | Why | Routes to |
|---|---|---|---|
| `hashicorp/terraform-mcp-server` | **KEEP** | Official, 1.52k★, 35+ tools, live provider/module docs plus HCP workspace/run management. Directly hits the netctrl Terraform work already happening. Write-ops gated off by default. | Alexia |
| `containers/kubernetes-mcp-server` | **KEEP, get her feel first, not adopted yet** | Red Hat, official-adjacent, actively maintained. Real K8s + OpenShift capability if homelab work grows into that. Must default to read-only/non-destructive. | Alexia |
| `microsoft/playwright-mcp` | **KEEP, firm** | Official Microsoft, 36.9k★, accessibility-snapshot browser control, no vision model needed — the most trusted candidate on the whole list. `claude-in-chrome` was the original comparison point; moot, since BinaryMisfit doesn't use Chrome and there's no official Firefox equivalent. Already effectively in use as ad hoc automation; this gives it real structure. | Stays here, global |
| `grafana/mcp-grafana` | **KEEP (reopened 2026-09-12)** | Original cut ("no Grafana deployed") no longer true — a real Grafana deployment predates this whole project and Alexia now owns it, plus Prometheus/Grafana endpoints on the router and Home Assistant. Direct query/dashboard access as structured tool calls. | Alexia |
| `googleapis/mcp-toolbox` | **CUT (2026-09-12)** | Originally the closest fit on the list specifically because `ai-nadia` lived on GCP — `ai-nadia` has since moved to AWS, and the entire rationale moved with it. An AWS-equivalent is a real, separate future question, not this candidate. | — |
| `dbhub` | **CUT (2026-09-12)** | Original condition was "pick one lane" against `mcp-toolbox`'s GCP-only scope; with `mcp-toolbox` gone, dropped alongside it rather than promoted. | — |
| `github/github-mcp-server` | **CUT (2026-09-12)** | Original scope was "stays in this repo's own domain" — `binary-dotfiles` is moving off GitHub to self-hosted git, so there's no GitHub-specific surface left here for it to serve. | — |
| `korotovsky/slack-mcp-server` | **CUT (2026-09-12)** | Never actually adopted; Threads now covers the real comms need natively, with less overhead and none of Slack's real flagged risk (its "stealth mode" scrapes browser session tokens without workspace admin approval — the weakest trust signal of anything on the original keep list). | — |
| `bitwarden/mcp-server` | **CUT** | General vault interaction, not confirmed scoped to Secrets Manager — real scope creep past the read-only-account model `ADR-0027` already established. Confirmed 2026-09-12: not a trust question, a structural security-boundary one — the same "nobody's own good behavior should be what makes a guarantee hold" principle as the rest of this project's real security work. | — |
| Notion | **CUT** | No confirmed use anywhere in the fleet; the register system already does this job. | — |
| Linear | **CUT** | Same reasoning as Notion. | — |
| `docker/mcp-gateway` | **CUT** | Infrastructure for infrastructure — a gateway for other containerized servers, not a capability of its own. Doubly dead as of 2026-09-12: ContextForge (Hermes) is already live and already federates tools/resources/prompts, the actual job this would have done. | — |
| `mcp-knowledge-graph` | **CUT** | Weakest trust signal on the whole list, redundant with the register system. | — |
| The 7 official reference servers (Fetch, Filesystem, Git, Time, Memory, Sequential-Thinking, Everything) | **CUT, all seven** | Each duplicates a tool already in hand — Fetch↔WebFetch, Filesystem/Git↔Read/Write/Bash, Time↔a real `date -u` lookup, Memory↔the session's own memory system, Sequential-Thinking↔extended thinking, Everything↔a demo. Filesystem specifically confirmed cut on real experience, 2026-09-12: not reliable across multiple concurrent local sessions, the same class of concurrency problem this project spent real effort fixing for Threads. | — |

## Separate, real follow-up — not part of this list

**Investigate ContextForge (Hermes) more deeply as the actual way to root MCP routing
going forward**, raised 2026-09-12. Real, but lower priority right now, and Alexia's own
domain — not scoped into this research pass.

## Original research notes, for context

Two foundational things worth knowing before individual servers: `registry.modelcontextprotocol.io`
is the official live registry (several old Anthropic reference servers — GitHub, GitLab,
Postgres, Puppeteer, Brave, Slack, Redis, Sentry, Google Maps — were archived in favor of
dedicated official ones); the `claude-plugins-official` marketplace has 200+ curated
plugins already loaded by default (LSP servers for 11 languages, GitHub/Figma/Slack/Sentry
integrations, security-review tooling), worth a browse before reaching for anything bespoke.

**Real gaps found, not filled, as of the original research:** no MCP-shaped Ansible server
exists at all — only generic tutorial repos. No Discord MCP server has real traction either.
