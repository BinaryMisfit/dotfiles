LLM client scaffold

Provide a single summarize(text, max_tokens) function. Implement provider integrations in separate modules and keep this file free of credentials.

Environment variables:
- LLM_PROVIDER (optional)
- LLM_API_KEY (if provider requires)

This module is used by gitflow-guard skill when LLM summarization is enabled.