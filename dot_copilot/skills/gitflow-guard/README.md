gitflow-guard skill

This skill is a workspace-first orchestrator for gitflow guard checks. It is cross-platform (Python 3) and intentionally lightweight.

Commands:
- check --files-changed N --diff-lines M --files f1 f2 ...   : run deterministic checks and return allowed:true/false
- pr-summary --files f1 f2 --title "..." --body "..." [--use-llm] : return a short PR summary; LLM optional

Integration:
- Calls policy-config validator and preflight hook. Use as a subprocess from Copilot hooks or import as a module.
- Uses ~/.copilot/cache/gitflow-guard/ for simple caching keyed by patch hash.
