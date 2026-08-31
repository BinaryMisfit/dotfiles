# 0012 — Every run script ships as a Windows/POSIX pair, no exceptions

`chezmoi apply` crashed on Windows (2026-08-31) with `remove-codex.sh: fork/exec ...: %1 is
not a valid Win32 application` — `run_once_after_remove-codex.sh.tmpl` was a bare POSIX
shell script with no Windows counterpart and no OS gate, so Windows tried to execute a
shebang script directly as a native binary. Every other paired script in this repo
(`run_onchange_install-tools.*.tmpl`, etc.) already self-gates its own OS with
`{{ if eq/ne .chezmoi.os "windows" -}} ... {{ end -}}` wrapping the whole body — this one
was the one exception, added without a Windows sibling.

**Status:** Decided

**Decision:** every run script (`run_once_*`, `run_onchange_*`) ships as a `.ps1.tmpl` +
`.sh.tmpl` pair, same base name, each self-gated with the standard `{{ if eq/ne
.chezmoi.os "windows" }}` wrapper — never a single-OS script with no counterpart. Fixed by
adding `run_once_after_remove-codex.ps1.tmpl` alongside the existing `.sh.tmpl`.
Documented directly in `CLAUDE.md`'s Run Scripts section.

**Why:** a bare `.sh` script doesn't just no-op on Windows, it crashes `chezmoi apply`
outright — this is a correctness requirement, not a style preference. Chezmoi treats the
non-matching OS's empty rendered template output as a no-op, which is the mechanism that
makes the pairing safe to always apply, on every platform, unconditionally.

**How to apply:** any new run script added to this repo gets both halves in the same
change, gated by the standard wrapper — never add just the `.sh.tmpl` or just the
`.ps1.tmpl` half and defer the other.
