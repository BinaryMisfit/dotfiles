#!powershell
# Wraps resume-decision.js (TODO-91, secretary-pool-owned) so a Windows Terminal
# launch profile can pick `claude -c` vs `claude` without embedding that logic
# inline in wt.exe's own commandline argument, which can't safely nest the
# quotes/semicolons an inline if/else would need. Run from the pane's own
# starting directory (set via wt.exe's `-d`) -- resume-decision.js resolves
# "resume or fresh" off that cwd against the persona registry.
$decision = & node "$HOME\.claude\scripts\resume-decision.js"
if ($decision -eq "resume") {
    claude -c
} else {
    claude
}
