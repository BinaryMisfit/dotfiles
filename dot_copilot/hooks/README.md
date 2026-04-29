Copilot hooks

preflight.py - cross-platform preflight hook (validator, tests, linters, protected path scan)
preflight.ps1 - PowerShell wrapper for Windows
preflight.sh - POSIX wrapper for macOS/Linux

Usage:
- Run the wrapper appropriate for your platform, or invoke preflight.py directly with Python 3.
- Integrate into hook-installer to write OS-specific hooks into repositories when opting in.
