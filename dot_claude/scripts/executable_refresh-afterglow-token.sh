#!/bin/bash
# headersHelper for the afterglow-threads MCP server -- global, one copy for
# every persona's own .mcp.json, not duplicated per-repo. Originally Hailey's
# own fix (hardcoded to her), generalized here 2026-09-12 the moment Alexia's
# own connection hit the exact same stale-static-header bug -- proof the
# problem was never persona-specific.
#
# Why this exists at all: a static "Bearer ${AFTERGLOW_<NAME>_TOKEN}" header
# only ever captures whatever value was exported into the shell/process
# environment at some earlier point -- it never refreshes, so every real token
# remint on afterglow-threads' own side (ansible redeploys, revocation) leaves
# that snapshot stale until a human manually re-exports it. Claude Code re-runs
# a headersHelper fresh on every connection and reconnect, and automatically
# retries once on a 401/403 -- so fetching live here, instead of trusting any
# local env var, is what actually makes this self-healing going forward.
# Confirmed against real Claude Code docs (code.claude.com/docs/en/mcp.md)
# before wiring this in, not assumed.
#
# Persona name is passed as the one real argument, not auto-derived --
# Claude Code only hands a headersHelper CLAUDE_CODE_MCP_SERVER_NAME/_URL, no
# caller-identity hint, and env-based identity signals are unreliable (this
# exact failure mode). Each persona's own .mcp.json entry passes its own name
# explicitly: "headersHelper": "bash <this script> Alexia".
#
# Most machines don't mirror ~/.persona-secrets locally (confirmed directly,
# 2026-09-12, on at least two personas' own machines) -- netctrl does, so this
# fetches live over an already-trusted SSH path rather than caching a second
# local copy of the secret anywhere.
PERSONA="$1"
if [ -z "$PERSONA" ]; then
  echo "refresh-afterglow-token.sh: persona name required as \$1 (e.g. 'Alexia')" >&2
  exit 1
fi
PERSONA_LOWER="${PERSONA,,}"
TOKEN=$(ssh netctrl "cat ~/.persona-secrets/${PERSONA_LOWER}/afterglow-threads-token" 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "refresh-afterglow-token.sh: failed to fetch token for ${PERSONA} from netctrl" >&2
  exit 1
fi
echo "{\"Authorization\": \"Bearer $TOKEN\"}"
