"use strict";

// Shared by pick-persona.js and day-state.js -- both need to agree on the
// SAME real, normalized cwd for the same worktree, or a lookup keyed by one
// silently misses an entry written by the other. Extracted 2026-09-03 after
// exactly that happened live: day-state.js's own realCwd() didn't apply the
// platform normalization pick-persona.js's resolveCwd() already used, so a
// day-state marker written via the CLI (original path casing) was never
// found by the SessionStart hook (which resolves cwd through
// resolveCwd() -> normalizePlatformPath(), lowercased on Windows) -- two
// different case sensitivities for the same real directory.
//
// Real bug this platform normalization itself guards against, caught live
// 2026-08-28: without it, two sessions started in the exact same directory
// could get `process.cwd()` back with different drive-letter casing
// (depending on how the shell/parent process launched them), producing two
// DIFFERENT registry entries for one real worktree.

const fs = require("fs");

function normalizePlatformPath(p) {
  return process.platform === "win32" ? p.toLowerCase() : p;
}

// Real path when possible (resolves symlinks, canonical casing from the
// filesystem), platform-normalized on top. Falls back to the raw path if
// realpath fails (e.g. the directory doesn't exist -- not an error worth
// throwing over here).
function resolveRealCwd(cwd) {
  let real;
  try {
    real = fs.realpathSync(cwd);
  } catch {
    real = cwd;
  }
  return normalizePlatformPath(real);
}

module.exports = { normalizePlatformPath, resolveRealCwd };
