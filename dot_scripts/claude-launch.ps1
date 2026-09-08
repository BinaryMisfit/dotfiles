#!powershell
# Wraps resume-decision.js (TODO-91, secretary-pool-owned) so a Windows Terminal
# launch profile can pick `claude -c` vs `claude` without embedding that logic
# inline in wt.exe's own commandline argument, which can't safely nest the
# quotes/semicolons an inline if/else would need. Run from the pane's own
# starting directory (set via wt.exe's `-d`) -- resume-decision.js resolves
# "resume or fresh" off that cwd against the persona registry.
#
# Pane coloring added 2026-09-08, proven end to end against real panes before
# landing here: pane-color.js (secretary-pool-owned, reuses pick-persona.js's own
# moodColorForStyle) prints "bgHex,fgHex" for this cwd's own persona, mood-shaded,
# blended 50% toward the terminal's real default so it reads as a quiet tint, not
# a saturated wall of color. No registry entry for this cwd -> empty output,
# painted nothing, launches plain -- real, expected case, not an error.
# `theme: "auto"` in settings.json.tmpl is what lets Claude Code's own UI read
# through this instead of a fixed dark palette fighting it.
$colorOutput = & node "$HOME\.claude\scripts\pane-color.js" "$PWD"
if ($colorOutput -match "^#([0-9a-fA-F]{6}),#([0-9a-fA-F]{6})$") {
    $bg = $matches[1]
    $fg = $matches[2]
    $br = [Convert]::ToInt32($bg.Substring(0, 2), 16)
    $bgG = [Convert]::ToInt32($bg.Substring(2, 2), 16)
    $bb = [Convert]::ToInt32($bg.Substring(4, 2), 16)
    $fr = [Convert]::ToInt32($fg.Substring(0, 2), 16)
    $fgG = [Convert]::ToInt32($fg.Substring(2, 2), 16)
    $fb = [Convert]::ToInt32($fg.Substring(4, 2), 16)
    Write-Host -NoNewline "$([char]27)[48;2;$br;$bgG;${bb}m$([char]27)[38;2;$fr;$fgG;${fb}m$([char]27)[2J$([char]27)[H"
}

$decision = & node "$HOME\.claude\scripts\resume-decision.js"
if ($decision -eq "resume") {
    claude -c
} else {
    claude
}
