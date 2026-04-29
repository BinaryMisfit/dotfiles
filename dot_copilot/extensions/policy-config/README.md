policy-config extension

This folder contains a cross-platform policy-config validator and loader used by gitflow-guard.

Files:
- validator.py: CLI tool to locate and validate .copilot/rules/gitflow.yml or user-level rules.

Usage:
- python validator.py validate    # validates the first found config (repo -> user -> builtin)
- python validator.py locate      # prints the path of the config used

Notes:
- Requires PyYAML for YAML parsing. Install with: pip install pyyaml
- On Windows, ACL checks use icacls if available; validator will warn if it cannot check ACLs.
- Designed to be cross-platform; integrate into hooks/skills by importing or invoking as a subprocess.
