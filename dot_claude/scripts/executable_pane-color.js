#!/usr/bin/env node
"use strict";

// `node pane-color.js <cwd> [blendPct]` -- prints "bgHex,fgHex" for a worktree's own
// persona, mood-shaded, blended toward the terminal's real default background so it
// reads as a quiet tint rather than a saturated wall of color. Built for the Windows
// Terminal per-pane coloring feature (binary-dotfiles' claude-launch.ps1 is the caller),
// proven end to end 2026-09-08 against real panes before landing here -- reuses
// pick-persona.js's own moodColorForStyle (same math VS Code's titlebar already runs
// on) and day-state.js's readDayState directly, no new color logic invented.
//
// No registry entry for the given cwd -> prints nothing, exits 0 -- a real, expected
// case (no persona here), not an error. Caller's job to skip coloring on empty output.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { moodColorForStyle } = require("./pick-persona.js");
const { readDayState } = require("./day-state.js");
const { resolveRealCwd } = require("./lib/normalize-cwd.js");

const DEFAULT_BG = "#1E2127"; // "One Half Dark" -- binary-dotfiles' own Windows Terminal default,
// used ONLY as the last-resort fallback below, never assumed current on its own.

// Real gap, fourth instance of the same pattern (Aphrodite's audit, finding #10,
// 2026-09-09): DEFAULT_BG was a fixed hex matching this exact terminal scheme, never
// read from the actual live theme -- if the scheme ever changed, every pane's blend
// would quietly come out a shade off, no error, nothing loud. Reads the real Windows
// Terminal settings.json and looks up the active color scheme's own background in its
// `schemes` array. **Deliberately still has a fallback, not a hard requirement:** "One
// Half Dark" (this machine's own current scheme, confirmed live 2026-09-09) is a
// built-in Windows Terminal scheme, not something a user's own settings.json defines
// in `schemes` unless they've explicitly overridden it -- so a built-in scheme's real
// background genuinely isn't discoverable from this file alone. This still closes the
// actual gap for what it can close: a custom scheme, or any future scheme change that
// IS user-defined, gets picked up live instead of silently staying stale.
function defaultWtSettingsPath() {
  return path.join(
    os.homedir(),
    "AppData",
    "Local",
    "Packages",
    "Microsoft.WindowsTerminal_8wekyb3d8bbwe",
    "LocalState",
    "settings.json"
  );
}

function readLiveTerminalBg(fallback = DEFAULT_BG, settingsPath = defaultWtSettingsPath()) {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const schemeName = settings.profiles && settings.profiles.defaults && settings.profiles.defaults.colorScheme;
    if (!schemeName) return fallback;
    const scheme = (settings.schemes || []).find((s) => s.name === schemeName);
    if (!scheme || !scheme.background) return fallback;
    return scheme.background;
  } catch {
    return fallback; // no Windows Terminal here, or its settings moved -- fall back quietly
  }
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// Exported for testing.
function blendedPaneColor(styleName, moodSeed, identityKey, blendPct = 0.5, defaultBg = DEFAULT_BG) {
  const { background, foreground } = moodColorForStyle(styleName, moodSeed, identityKey);
  const [tr, tg, tb] = hexToRgb(background);
  const [dr, dg, db] = hexToRgb(defaultBg);
  const blended = rgbToHex(lerp(tr, dr, blendPct), lerp(tg, dg, blendPct), lerp(tb, db, blendPct));
  return { background: blended, foreground, fullStrengthBackground: background };
}

function main() {
  const rawCwd = process.argv[2] || "";
  const blendPct = process.argv[3] ? parseFloat(process.argv[3]) : 0.5;
  if (!rawCwd) {
    process.exitCode = 1;
    return;
  }
  // Real bug caught 2026-09-08, same shape as the one lib/normalize-cwd.js's
  // own header comment documents: a bare .toLowerCase() here (rather than the
  // shared resolveRealCwd, which also resolves symlinks/canonical
  // drive-letter casing via realpathSync) could silently fail to match a
  // registry entry written with different casing/form from this pane's own
  // caller -- exactly the "two different case sensitivities for the same
  // real directory" incident this shared helper exists to prevent.
  const cwd = resolveRealCwd(rawCwd);
  const registryPath = path.join(os.homedir(), ".claude", "persona-registry.json");
  let registry = [];
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch {
    return; // no registry yet -- nothing to color
  }
  const entry = registry.find((e) => e.cwd === cwd);
  if (!entry) return; // no persona here -- real, expected, not an error

  const identityKey = entry.nickname || entry.style;
  const dayState = readDayState(identityKey);
  const moodSeed = dayState ? `${dayState.mood}|${dayState.endedAt}` : undefined;
  const { background, foreground } = blendedPaneColor(entry.style, moodSeed, identityKey, blendPct, readLiveTerminalBg());
  process.stdout.write(`${background},${foreground}\n`);
}

if (require.main === module) main();

module.exports = { blendedPaneColor, hexToRgb, rgbToHex, lerp, readLiveTerminalBg, defaultWtSettingsPath };
