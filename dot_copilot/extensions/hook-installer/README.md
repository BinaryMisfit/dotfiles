hook-installer extension

This extension writes OS-appropriate Git hooks into an existing repository (opt-in).

Usage:
- python installer.py install /path/to/repo [--force]
- python installer.py uninstall /path/to/repo

Notes:
- The extension expects a .copilot/hooks/ directory inside the target repo with appropriate hook wrappers (preflight.sh, preflight.ps1, msg-validator.sh, msg-validator.ps1, etc.).
- Installer will not overwrite existing hooks unless --force is passed.
- Installer is cross-platform and sets executable bits on POSIX systems.
