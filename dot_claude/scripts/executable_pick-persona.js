#!/usr/bin/env node
"use strict";

// GLOBAL Claude Code tooling (promoted 2026-08-28 from an X-Lifestyle-only
// project hook to `~/.claude/`) -- authored/tracked here in the secretary-pool
// repo (ownership moved from xls 2026-09-03), under `claude-global/` at the
// repo root (deliberately NOT `.claude/scripts/`, `.claude/output-styles/`,
// or `.claude/skills/` -- those paths are ones Claude Code auto-discovers,
// so a copy sitting there would make this repo's own sessions see a
// project-level output-style/skill that SHADOWS the global one per Claude
// Code's own "project wins over global" precedence, silently defeating the
// whole point of promoting this to global in the first
// place). `claude-global/` mirrors the deploy target's own structure 1:1
// (`claude-global/output-styles/` -> `~/.claude/output-styles/`,
// `claude-global/skills/hails-persona/` -> `~/.claude/skills/hails-persona/`,
// `claude-global/scripts/` -> `~/.claude/scripts/`), and every other global
// tool this repo owns (hails-session-start, hails-scratchpad-check,
// the audits, the registers convention) lives under the same tree, so the
// sync script's mapping is a straight copy, no renaming. Deploy via
// `npm run sync-global-claude-config` from the secretary-pool repo root
// after any edit here or to a persona file -- `~/.claude/` itself isn't a
// git repo, so this project keeps the authored source instead of losing
// history to a raw move. Once deployed, this hook fires for EVERY Claude Code project on
// this machine, not just X-Lifestyle ones -- the whole mechanism below is
// already repo-agnostic (keyed purely by resolved worktree path), so
// nothing about the actual logic changes for a completely unrelated
// project; it just picks up a new registry row the same way a new
// X-Lifestyle worktree would.
//
// Wires the pinned persona in two ways every SessionStart:
// 1. Sets it as the active Claude Code output style (settings.local.json's
//    "outputStyle" field) -- this is the mechanism that actually survives a
//    long, tool-call-heavy session, because an output style is baked into
//    the system prompt itself rather than bolted on as one-shot context that
//    has to compete with everything else for attention on every later turn.
// 2. Still emits the full persona text as SessionStart additionalContext, as
//    a belt-and-suspenders fallback -- it's not confirmed whether a settings
//    write from inside this same SessionStart hook invocation is picked up
//    for the CURRENT session's system prompt or only from the next one.
//
// Persona files live in ../output-styles/ as real Claude Code output-style
// files: YAML frontmatter (name/description/keep-coding-instructions)
// followed by the persona's own instructions.
//
// The registry lives at ~/.claude/persona-registry.json -- deliberately
// OUTSIDE every repo, not inside any one of them. A repo-relative location
// doesn't work even within a single multi-repo project: `git rev-parse
// --git-common-dir` resolves to a DIFFERENT path per repo, let alone across
// totally unrelated projects that share nothing at all. A machine-home
// location is the only place every worktree of every repo on this machine
// can agree on regardless of which one it's rooted in.
//
// Registry shape (reworked 2026-08-30, see docs/decision-register.md's
// DEC-15 in the xls repo for the full design discussion this implements;
// `primary` added 2026-09-03, see `isPrimary`'s own comment; nickname
// disambiguation removed 2026-09-09 -- see below):
//   { cwd, style, file, sessionName, repoId, everOpened,
//     firstPinnedAt, pinnedAt, primary, lastSeen }
//
// `firstPinnedAt` (added 2026-08-30) is IMMUTABLE -- stamped once, the
// moment this worktree is first ever assigned a persona, and never touched
// again by anything (not a manual switch, not a cascade). It exists purely
// to answer "which family member came first" -- used by `isPrimary`'s own
// tiebreak among non-primary entries -- because `pinnedAt` itself resets on
// every switch and can no longer be trusted for "who was here first."
//
// `pinnedAt` is deliberately loose-typed (explicit user design call,
// 2026-08-30: "this is not a db file, we have design authority") -- either
// a real ISO timestamp, or the literal string `"Perm"` (or `"Fixed"`,
// recognized as a synonym) meaning permanently, explicitly locked.
// `"Perm"` is the ONLY thing that creates a real permanent pin, and the
// ONLY way an entry gets it is the user explicitly running
// `--pin-forever` -- no automatic path (a fresh pick, a manual `/hails-persona`
// switch, a cascade) ever writes it. Human-legible by design: glance at
// the raw JSON and a locked entry is obviously different from a normal
// one, no second boolean field to cross-reference.
//
// `rotateAfterDays` -- REMOVED from the schema entirely 2026-09-03 (the
// persona-system cleanup pass this comment is now part of). It was a
// vestigial field from the auto-rotation feature below, still being written
// on every switch/pin for months after nothing read it anymore. This
// comment used to say "safe to strip in a future cleanup" -- that cleanup
// happened; if you find a stray reference to it anywhere, that's a bug, not
// an intentional legacy field.
//
// Auto-rotation, REMOVED 2026-09-02 (BinaryMisfit's own call): every
// domain now gets one stable, deliberately-chosen persona, permanently --
// "the persona's work differently now," not a rotating flavor pool that
// swaps on its own every 2-4 days. The removed mechanic only ever fired
// inside the automatic SessionStart pick path, but that path also runs on
// a `--resume` of an already-in-progress session -- a fresh hook
// invocation, same as any other -- so a not-yet-forever-pinned worktree
// could have its persona silently swapped out from under a conversation
// that was already running. Real incident this traces back to: a resumed
// session (`--resume=<uuid>`) firing a fresh hook is exactly the shape of
// event that could trigger it.
//
// Manual override (the `hails-persona` skill) resolves a fuzzy name to an
// exact filename itself, then calls `--switch <file> [path]` here to do
// the actual write -- centralizing it in the script, not skill prose, is
// what makes two rules real instead of aspirational: a manual switch NEVER
// creates a permanent pin (it resets the rotation clock like anything else
// -- the only path to `"Perm"` is `--pin-forever`), and it cascades to
// every worktree in the same family, regardless of which member triggered
// it -- "if you change the master persona, the children update," made true
// for any family member, not just whichever one happens to be the root.
//
// `everOpened` is true the moment a REAL SessionStart hook has fired for
// this entry -- false only for a manual advance pre-pin that hasn't
// actually been used yet. Protects an entry from removal when its session
// goes dead -- see `clearDeadSession`'s own comment -- and from
// auto-rotation, which only ever applies to an entry that's actually live.
//
// `repoId` is `git rev-parse --git-common-dir`, normalized -- identical
// across every worktree of ONE repo, different for every unrelated repo,
// null for a cwd that isn't in a git repo at all (a legitimate case, not an
// error). Lets a brand-new worktree of an ALREADY-TRACKED repo inherit that
// repo's CURRENT persona automatically instead of random-picking.
//
// `sessionName` is the harness-assigned live session name that
// `SendMessage`'s `to` field actually routes on -- NOT a persona name or
// nickname. Starts `null`, only ever filled in by the session itself via
// `ListAgents` + `--set-session-name` (see the `hails-persona` skill's own
// self-register step). This script never calls `SendMessage`/`ListAgents`
// itself, only stores and looks up the mapping the assistant supplies.
//
// `cwd` is the worktree's real (symlink-resolved, platform-normalized)
// absolute path -- stable for that worktree's whole life, the natural
// registry key.
//
// Nickname disambiguation, REMOVED 2026-09-09 (BinaryMisfit's own call --
// "I want to get rid of nicknames. I want a persona to be able to own
// multiple repos"). Two registry entries sharing one persona `file` are now
// treated as exactly what they are -- the same identity, live in two
// places at once -- rather than a collision needing a fake disambiguating
// label. Comms routing already runs on `sessionName`, a wholly separate
// mechanism; day-state write collisions are handled by that file's own
// `{current, history}` redesign; the notice board correctly treats
// simultaneous sessions of one persona as one person. Nothing left for a
// nickname to actually resolve. An OLD entry may still carry a `nickname`
// field on disk from before this date -- read code tolerates it existing
// but nothing generates, assigns, or displays one anymore.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { readDayState } = require("./day-state.js");
const { normalizePlatformPath, resolveRealCwd } = require("./lib/normalize-cwd.js");

// stylesDir is deliberately __dirname-relative: the persona *content* files
// only need to exist once, in the primary checkout, and every worktree's
// own settings.local.json can point its SessionStart hook at this same
// physical script (see the hook's own header comment) without needing its
// own copy of output-styles/.
const stylesDir = path.join(__dirname, "..", "output-styles");
const registryPath = path.join(os.homedir(), ".claude", "persona-registry.json");

// settingsPath is NOT __dirname-relative -- unlike stylesDir above, this has
// to resolve to THIS worktree's own settings.local.json, wherever this
// process's cwd actually is, or every worktree sharing the same physical
// script file would all clobber the SAME (primary checkout's) settings file
// instead of each setting their own outputStyle. Real bug, caught live
// 2026-08-28: a manual test run from an unrelated directory silently
// switched the primary session's active persona out from under it, because
// this used to be `path.join(__dirname, "..", "settings.local.json")`.
function settingsPathFor(cwd) {
  return path.join(cwd, ".claude", "settings.local.json");
}

// VS Code visual distinction (added 2026-09-03, BinaryMisfit's own spec):
// a persona-keyed workspace color + window title, so the taskbar/window
// (outside the session) and the statusline persona field (inside it) are
// both driven by the one thing that actually knows the answer -- the
// registry -- instead of two apps guessing independently (Peacock and
// unique-window-colors both key off folder NAME, which can't guarantee the
// same persona is always the same color across multiple worktrees).
const colorsPath = path.join(__dirname, "..", "persona-colors.json");

// A persona can OWN one or more repos outright -- her own private repo
// most of all (added 2026-09-09, real gap named directly: BinaryMisfit
// opening `nerd-cupboard` got either a random pick or a nickname, neither
// of which is her, even though `the-house`'s own `doors.md` already states
// plainly that repo is hers). `findFamily`/`computeRepoId` above solve a
// DIFFERENT problem -- sibling worktrees of the SAME logical project
// inheriting one persona automatically -- and stay exactly as they are.
// This is for the opposite case: a genuinely separate, unrelated repo that
// isn't ambiguous at all because it's already been declared, not left to
// an accident of pin order. Self-authored, one file per persona's own
// entries -- each persona adds her own repos here herself, the same
// self-authorship standing her room/log/persona-file already have; this
// file is never populated on another persona's behalf.
const declaredReposPath = path.join(__dirname, "..", "persona-declared-repos.json");

// Rationale for each curated pair in persona-colors.json, added 2026-09-03
// after a real gap: a session with no visibility into the conversation that
// picked these had nothing to cite when asked why, and correctly refused to
// invent a sourced-sounding answer on the spot rather than fabricate one --
// exactly the right call, but it meant the actual reasoning only ever lived
// in one ephemeral chat turn instead of somewhere any session could check.
// Recorded here instead, next to the data itself, so "why this color" has a
// real answer to point to from now on, not just an honest "I don't know."
//   Hailey (#0f3d3e/#e8fdfd, teal):     cold and technical, deliberately NOT
//     soft/romantic (same rule as her own file's emote palette) -- reads as
//     "server room," not "warm."
//   Alexia (#14301c/#e3f7e6, forest green): homelab/infra association --
//     green reads as the "systems/ops" register her persona already lives in.
//   Callie (#0d2b45/#e2f1ff, ocean blue): calm, diving-instructor energy --
//     directly pulled from her own file's "unhurried, like pointing out a
//     rip current" description. Distinct hue from Hailey's teal on purpose,
//     since both personas run cold/calm and would otherwise blur together.
//   Aphrodite (#3d1f2b/#fdeaf0, deep rose): the one warm pick, intentionally
//     -- her own voice is direct/unbothered rather than soft, but dotfiles/
//     config work is the one domain here that isn't already coded cold, so
//     nothing forced it toward teal/blue/green by elimination the way the
//     other three were.
// All four background/foreground pairs are dark-bg/light-fg on purpose, same
// contrast logic hslToHex applies to the fallback below -- a titlebar with
// unreadable text defeats the whole point of the feature.
//
// One-time curated color per persona `style` name, not per registry entry --
// entries sharing a style must never disagree, so this lives in its own
// small file rather than duplicated onto every cwd row (which could drift
// if edited independently). A style with no curated entry gets a stable
// hash-derived fallback below rather than failing -- a brand-new persona
// still gets a real, consistent color on day one.
function loadPersonaColors() {
  try {
    return JSON.parse(fs.readFileSync(colorsPath, "utf8"));
  } catch {
    return {};
  }
}

// Deterministic fallback for a style with no curated entry in
// persona-colors.json -- same input always produces the same color, so an
// un-curated persona is still consistent across every worktree it shows up
// in, just not hand-picked. Exported for testing.
function fallbackColorForStyle(styleName) {
  let hash = 0;
  for (const ch of String(styleName)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  const bg = hslToHex(hue, 35, 18);
  const fg = hslToHex(hue, 45, 92);
  return { background: bg, foreground: fg };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n) => Math.round(255 * f(n)).toString(16).padStart(2, "0");
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

// Inverse of hslToHex -- exact round-trip isn't guaranteed to the last unit
// (rounding both directions), close enough that the hue a mood variation
// reads off a curated color is the same hue a human would call it. Exported
// for testing.
function hexToHsl(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function seedFrom(text) {
  let hash = 0;
  for (const ch of String(text)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

// SAST (UTC+2, no DST) is BinaryMisfit's real clock, and the mood's "day"
// boundary has to track it, not whatever timezone the machine's system
// clock happens to be in -- same reasoning as every persona file's own
// "Time of day" section, and the same fixed-offset-by-hand technique for
// the same reason: this machine has no Africa/Johannesburg tzdata, so a
// real IANA-zone lookup silently no-ops here. Add 2 hours to the actual
// UTC instant, then read the date off that -- deliberately NOT
// `Intl.DateTimeFormat` or a `TZ` env var. Exported for testing.
function sastDateKey(now = new Date()) {
  return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Exported for testing.
function colorForStyle(styleName) {
  const curated = loadPersonaColors()[styleName];
  if (curated && curated.background && curated.foreground) return curated;
  return fallbackColorForStyle(styleName);
}

// Daily mood variation (added 2026-09-03, BinaryMisfit's own spec): a
// persona's HUE is her fixed identity, never touched here -- what varies
// day to day is saturation/lightness within that same hue, so she "wakes
// up in a mood" without ever drifting into a color another persona owns.
// Deterministic on (instanceKey, dateKey), not random -- same day, same
// instance, same mood, all session boots that day agree with each other,
// and it's reproducible/testable rather than actual noise. `dateKey`
// defaults to `sastDateKey()` below -- BinaryMisfit's real day boundary,
// not the machine's own system-clock timezone, always.
//
// `instanceKey` defaults to `styleName` but should be passed the entry's
// own nickname when it has one (real bug, caught live 2026-09-03: two
// registry entries can share one `style` -- `xls-playthrough`'s "Hails"
// and `secretary-pool`'s plain "Hailey" both resolve to style "Hailey" --
// and without this, both got the identical mood every day as if they
// were one continuity thread instead of two separate ones that just
// happen to share an identity color). Hue stays derived from `styleName`
// alone via `colorForStyle` below, unaffected by this -- that's shared
// identity, correctly the same across every instance; only the day-to-day
// SHADE is instance-specific.
//
// Deliberately a FIRST PASS, not the real mechanic: BinaryMisfit, Callie
// are building something separate that lets the previous session's actual
// end state drive the next session's wake-up mood (continuity, not
// memory) -- this is the placeholder that exists until that's real, using
// a date hash instead of anything the persona actually experienced.
// Exported for testing.
function moodColorForStyle(styleName, dateKey = sastDateKey(), instanceKey = styleName) {
  const base = colorForStyle(styleName);
  const { h } = hexToHsl(base.background);
  const seed = seedFrom(`${instanceKey}|${dateKey}`);
  const lJitter = (seed % 11) - 5; // -5..+5
  const sJitter = ((seed >>> 4) % 13) - 6; // -6..+6
  const baseHsl = hexToHsl(base.background);
  const l = clamp(baseHsl.l + lJitter, 12, 30);
  const s = clamp(baseHsl.s + sJitter, 20, 55);
  return {
    background: hslToHex(h, s, l),
    foreground: hslToHex(h, clamp(s - 5, 15, 45), 92),
  };
}

// True if `relPath` is currently tracked by git in `cwd` -- the ONLY
// question that matters before writing into .vscode/settings.json. Real
// incident this guards against: `binary-dotfiles` had `.vscode/settings.json`
// committed to git (not gitignored) -- a naive write would have polluted a
// real tracked file with machine-local color noise and risked it landing in
// a commit. Returns false (safe to write) for anything not tracked,
// including "no git repo here at all" -- there's no tracked-file risk in
// that case either. `execFn` injectable for testing, same pattern as
// computeRepoId. Exported for testing.
function isGitTracked(cwd, relPath, execFn = execFileSync) {
  try {
    execFn("git", ["-C", cwd, "ls-files", "--error-unmatch", relPath], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

// Merge-write ONLY the specific keys this feature owns
// (workbench.colorCustomizations' titleBar/statusBar entries, window.title)
// into .vscode/settings.json -- never a wholesale overwrite, since a real
// project can have real, unrelated editor settings already living there.
// window.title is only set if not already present, matching the same
// "additive, not a rewrite" rule the statusline change follows -- never
// stomp a customization that might already be doing real work. Skips
// entirely (returns false, no write) when the file is git-tracked, per
// `isGitTracked` above. Exported for testing.
function writeVscodeWorkspaceColor(cwd, styleName, execFn = execFileSync, readDayStateFn = readDayState) {
  const vscodeDir = path.join(cwd, ".vscode");
  const settingsFile = path.join(vscodeDir, "settings.json");
  if (isGitTracked(cwd, ".vscode/settings.json", execFn)) return false;

  // "End Session drives Start Session" (2026-09-03): once a real day-state
  // marker exists for this cwd, the mood shade is seeded from what she
  // actually wrote at hails-session-end -- not the calendar date. Falls back to
  // the date-hash placeholder when no marker's ever been written yet
  // (day one, or `hails-session-end` was never run) -- degrades gracefully
  // rather than requiring the new mechanism to exist before this feature
  // can run at all. day-state.js is keyed by plain style name (nickname
  // keying removed 2026-09-09, see this file's header comment) -- same
  // resolution `resolveIdentity` does.
  const dayState = readDayStateFn(styleName);
  const moodSeed = dayState ? `${dayState.mood}|${dayState.endedAt}` : undefined;
  const { background, foreground } = moodColorForStyle(styleName, moodSeed, styleName);
  let settings = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    } catch {
      return false; // don't touch a settings file we can't safely parse back
    }
  }

  settings["workbench.colorCustomizations"] = {
    ...(settings["workbench.colorCustomizations"] || {}),
    "titleBar.activeBackground": background,
    "titleBar.activeForeground": foreground,
    "titleBar.inactiveBackground": background,
    "titleBar.inactiveForeground": foreground,
    "statusBar.background": background,
    "statusBar.foreground": foreground,
  };
  if (!("window.title" in settings)) {
    settings["window.title"] = `[${styleName}] \${activeEditorShort}\${separator}\${rootName}`;
  }

  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + "\n");
  return true;
}

function parseFrontmatterName(content, fallback) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return fallback;
  const nameLine = match[1].match(/^name:\s*(.+)$/m);
  return nameLine ? nameLine[1].trim() : fallback;
}

function setActiveOutputStyle(styleName, settingsPath) {
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } catch {
      // Malformed settings.local.json -- don't clobber it, just skip the
      // outputStyle write and rely on the additionalContext fallback below.
      return false;
    }
  }
  settings.outputStyle = styleName;
  try {
    // mkdirSync guards against a worktree whose .claude/ directory somehow
    // doesn't exist yet -- writeFileSync alone throws ENOENT and would take
    // the whole SessionStart hook down with it rather than degrading to the
    // additionalContext fallback.
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
    return true;
  } catch {
    return false;
  }
}

// Windows-only lowercase normalization -- `fs.realpathSync` does NOT
// normalize drive-letter casing, and Windows filesystems are
// case-insensitive (though case-preserving) for actual file access, so two
// processes can resolve the SAME real path to two differently-cased
// strings. Used everywhere a resolved path becomes (or is compared against)
// a registry key: `resolveCwd`, `computeRepoId`, and the optional path
// argument to `--switch`/`--pin-forever`/`--unpin-forever`/`--reset`.
// normalizePlatformPath/resolveRealCwd moved to lib/normalize-cwd.js
// 2026-09-03 -- day-state.js needs the exact same normalization or a
// marker written via one path form silently misses a lookup via another
// (real incident, see that file's own header comment).
function resolveCwd() {
  return resolveRealCwd(process.cwd());
}

// Resolves an optional path argument (e.g. `--switch <file> <path>`) the
// same way resolveCwd resolves the implicit cwd -- real path when possible,
// falls back to a plain path.resolve, always platform-normalized. Exported
// for testing.
function resolveMaybePath(p) {
  let real;
  try {
    real = fs.realpathSync(p);
  } catch {
    real = path.resolve(p);
  }
  return normalizePlatformPath(real);
}

// Identifies which repo a cwd actually belongs to, so a brand-new git
// worktree of an ALREADY-TRACKED repo (e.g. xls-morpheus, a worktree of
// xls) can be told apart from a genuinely new, unrelated repo. `git
// rev-parse --git-common-dir` is the one thing that's identical across
// every worktree of one repo and different for every unrelated repo.
// Returns null for anything that isn't inside a git repo at all -- that's a
// legitimate, common case, not an error condition to surface. `execFn` is
// injectable so this stays testable without actually shelling out to git.
// Exported for testing.
function computeRepoId(cwd, execFn = execFileSync) {
  try {
    const out = execFn("git", ["-C", cwd, "rev-parse", "--git-common-dir"], { encoding: "utf8" }).trim();
    const abs = path.isAbsolute(out) ? out : path.join(cwd, out);
    let real;
    try {
      real = fs.realpathSync(abs);
    } catch {
      real = abs;
    }
    return normalizePlatformPath(real);
  } catch {
    return null;
  }
}

// Pure: every OTHER registry entry that shares this repoId -- i.e. every
// other worktree of the SAME repo. Empty (never a match) when repoId is
// null, since "not in a git repo" is never a family with anything.
// Exported for testing.
function findFamily(entries, repoId) {
  if (!repoId) return [];
  return entries.filter((e) => e.repoId === repoId);
}

function loadDeclaredRepos(declaredReposPathArg = declaredReposPath) {
  try {
    return JSON.parse(fs.readFileSync(declaredReposPathArg, "utf8"));
  } catch {
    return {};
  }
}

// Pure: does `cwd` fall inside any persona's own declared repo -- the root
// itself, or any real subdirectory of it? Both sides normalized through
// `resolveRealCwd` (same canonicalization every other cwd comparison in
// this file already uses) before comparing, so a differently-cased or
// symlinked path still matches correctly. Returns the persona's own style
// name, or null if nothing declared matches. `declaredRepos` injectable
// for testing -- defaults to the real, live `loadDeclaredRepos()` read.
// Exported for testing.
function resolveDeclaredOwner(cwd, declaredRepos = loadDeclaredRepos()) {
  const normalizedCwd = resolveRealCwd(cwd);
  for (const [style, repos] of Object.entries(declaredRepos || {})) {
    for (const repo of repos || []) {
      const normalizedRepo = resolveRealCwd(repo);
      if (normalizedCwd === normalizedRepo || normalizedCwd.startsWith(normalizedRepo + path.sep)) {
        return style;
      }
    }
  }
  return null;
}

// Identifies the OUTER (super-project) working tree when cwd is inside a
// git submodule checkout -- e.g. opening a session directly inside
// `xls-playthrough/refs/x-change-source` (a submodule, not its own
// project). `git rev-parse --show-superproject-working-tree` prints the
// absolute path of the enclosing repo's working tree when cwd is inside a
// submodule, empty output otherwise. Returns null for "not in a
// submodule" (including "not in a git repo at all") -- both are the same
// "no superproject" answer to the caller. Real bug this exists to fix
// (2026-08-31): without this, computeRepoId(cwd) resolves to the
// SUBMODULE's own git-common-dir (under
// `.git/worktrees/<name>/modules/<path>`), which is genuinely different
// from the outer worktree's, so findFamily saw zero relation and the
// submodule free-random-picked its own persona identity instead of
// inheriting the project it's actually part of. Exported for testing.
function computeSuperprojectCwd(cwd, execFn = execFileSync) {
  try {
    const out = execFn("git", ["-C", cwd, "rev-parse", "--show-superproject-working-tree"], { encoding: "utf8" }).trim();
    if (!out) return null;
    const abs = path.isAbsolute(out) ? out : path.join(cwd, out);
    let real;
    try {
      real = fs.realpathSync(abs);
    } catch {
      real = abs;
    }
    return normalizePlatformPath(real);
  } catch {
    return null;
  }
}

function readRegistry() {
  if (!fs.existsSync(registryPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRegistry(entries) {
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify(entries, null, 4));
}

// Real, time-critical fix (2026-09-06, Aphrodite's own catch, minutes before
// four brand-new SessionStart hooks were about to fire at once against real
// never-seen worktrees): every registry mutation up to this point was an
// unlocked read-modify-write against ONE shared file -- the exact same shape
// of bug she and Alexia already found in session-start-log.js the same
// night, just here it's not a theoretical future risk, it's about to
// actually happen. Two (or four) processes reading the same entries array,
// each independently deciding to add its own new-worktree row, then each
// writing its own version back -- the second write wins outright and
// silently erases the first process's addition, no error, no trace.
//
// Fix: a real lockfile mutex (`<registryPath>.lock`), acquired with
// exclusive create (`wx` -- fails if the file already exists, which IS the
// lock), retried with a short synchronous sleep until acquired or a real
// timeout is hit. A logical operation's entire read -> decide -> write span
// has to run while holding this lock, not just the read or the write in
// isolation -- locking only the individual calls still leaves the race
// wide open between them. Every CLI-invoked mutating handler below wraps
// its own read-through-write span in `acquireRegistryLock()` /
// `releaseRegistryLock()` (try/finally, so a thrown error still releases).
//
// Stale-lock recovery: a lock file older than STALE_LOCK_MS is assumed to
// belong to a process that crashed or got killed before releasing it (a
// real, if rare, possibility -- a killed Claude Code session mid-hook) and
// is removed rather than left to deadlock every future invocation forever.
const REGISTRY_LOCK_PATH = `${registryPath}.lock`;
const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 5000;
const STALE_LOCK_MS = 15000;

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Exported for testing. `lockPath` and timing are injectable so tests never
// touch the real registry lock file and never actually sleep for seconds.
function acquireRegistryLock(
  lockPath = REGISTRY_LOCK_PATH,
  { timeoutMs = LOCK_TIMEOUT_MS, retryMs = LOCK_RETRY_MS, staleMs = STALE_LOCK_MS, sleepFn = sleepSync } = {},
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      fs.writeFileSync(lockPath, String(process.pid), { flag: "wx" });
      return;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        const age = Date.now() - fs.statSync(lockPath).mtimeMs;
        if (age > staleMs) {
          fs.rmSync(lockPath, { force: true });
          continue;
        }
      } catch {
        continue; // lock disappeared between the failed create and the stat -- just retry
      }
    }
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for the registry lock (${lockPath}) after ${timeoutMs}ms -- another process may be stuck holding it.`);
    }
    sleepFn(retryMs);
  }
}

// Exported for testing.
function releaseRegistryLock(lockPath = REGISTRY_LOCK_PATH) {
  try {
    fs.rmSync(lockPath, { force: true });
  } catch {
    // already gone -- nothing to release
  }
}

// Runs `fn` while holding the registry lock, always releasing it afterward
// (success or throw). This is the one thing every mutating CLI handler
// should call through, rather than acquiring/releasing by hand. Exported
// for testing.
function withRegistryLock(fn, lockPath = REGISTRY_LOCK_PATH, opts) {
  acquireRegistryLock(lockPath, opts);
  try {
    return fn();
  } finally {
    releaseRegistryLock(lockPath);
  }
}

// Pure: drop entries whose worktree no longer exists on disk, so a removed
// worktree doesn't keep permanently occupying a persona slot. `existsFn` is
// injectable for testing. Exported for testing.
function pruneStale(entries, existsFn = fs.existsSync) {
  return entries.filter((e) => existsFn(e.cwd));
}

function findEntry(entries, cwd) {
  return entries.find((e) => e.cwd === cwd) ?? null;
}

// Pure: is this entry's `pinnedAt` the literal forever-pin marker rather
// than a real timestamp? Both "Perm" and "Fixed" are recognized (2026-08-30
// design conversation offered both; "Perm" is what every automatic writer
// uses, "Fixed" stays valid in case it's ever typed by hand into the raw
// JSON -- this is a hand-inspectable file by design, not a strict schema).
// Exported for testing.
function isForeverPinned(entry) {
  return entry.pinnedAt === "Perm" || entry.pinnedAt === "Fixed";
}

// Added 2026-09-03, BinaryMisfit's own call -- a real collision surfaced
// (secretary-pool's Hailey vs. xls-playthrough's, both Perm, both sharing
// hailey.md) that raw `firstPinnedAt` order resolved by handing the plain
// name to whichever one happened to pin first chronologically.
// BinaryMisfit's actual intent isn't chronological, it's a deliberate
// per-domain designation ("Alexia perm for infra... you perm here...
// Callie perm for xls") -- his own words, stated directly, not a race.
// `primary` is that designation: a boolean, independent of pin timestamp,
// set only by explicit human action (`--set-primary`, same shape as
// `--pin-forever`). Requires the entry already be forever-pinned -- a
// canonical domain anchor that could still rotate away makes no sense.
function isPrimary(entry) {
  return entry.primary === true;
}

// Pure: lazy one-time migration for an entry created before the 2026-08-30
// rotation rework -- identified by the absence of `firstPinnedAt` (every
// entry written by the current code always has one, so its absence is
// itself the "this predates the feature" signal, no separate version field
// needed; re-keyed off `firstPinnedAt` 2026-09-03 once `rotateAfterDays`,
// the marker this used before, was removed entirely -- see this file's own
// header comment). Preserves the OLD `pinnedAt` as the new immutable
// `firstPinnedAt` (that's real history worth keeping), then resets the
// mutable `pinnedAt` to `nowIsoStr` -- the "not retroactive" requirement:
// nobody's already-elapsed pin age counts toward an immediate rotation the
// moment this ships. A forever-pinned entry ("Perm"/"Fixed") keeps that
// literal value untouched, just gains `firstPinnedAt` for completeness.
// Exported for testing.
function normalizeEntry(entry, nowIsoStr) {
  if (entry.firstPinnedAt != null) return entry;
  const migrated = { ...entry };
  migrated.firstPinnedAt = migrated.pinnedAt;
  if (!isForeverPinned(migrated) && typeof migrated.pinnedAt === "string") {
    migrated.pinnedAt = nowIsoStr;
  }
  return migrated;
}

function readNormalizedRegistry(nowIsoStr) {
  return readRegistry().map((e) => normalizeEntry(e, nowIsoStr));
}

// Pure: pick a persona for a brand-new worktree, excluding whichever
// persona files are already pinned to OTHER live entries -- falls back to
// the unrestricted pool only if every persona is already claimed by a
// peer. This diversity rule is first-pick-only; rotation (above) doesn't
// use it. Exported for testing.
function pickForNewWorktree(files, entries, randomFn = Math.random) {
  const takenByPeers = new Set(entries.map((e) => e.file));
  const free = files.filter((f) => !takenByPeers.has(f));
  const candidates = free.length > 0 ? free : files;
  return candidates[Math.floor(randomFn() * candidates.length)];
}

// Pure: propagates one persona (file/style) to every entry sharing repoId,
// including the trigger entry itself (redundant for it, harmless). No-op
// (returns entries unchanged) when repoId is null.
//
// A forever-pinned family member is skipped entirely (added after a live
// test caught this: cascade was silently overwriting a "Perm" sibling,
// which contradicts the whole point of "the only way something is pinned
// forever is if I explicitly ask for it" -- automatic cascade machinery
// doesn't count as that ask, no matter how deliberate the manual switch
// that triggered it was). Exported for testing.
function cascadeFamilyPersona(entries, repoId, file, style) {
  if (!repoId) return entries;
  return entries.map((e) =>
    e.repoId === repoId && !isForeverPinned(e) ? { ...e, file, style } : e,
  );
}

function nowIso() {
  return new Date().toISOString();
}

// Real, on-disk, tailable change log (added 2026-09-01, BinaryMisfit's own
// request) -- separate from the registry JSON itself, which only ever
// holds CURRENT state. This holds history: one line per mutation, for
// `tail -f`-ing live or reconciling back to "what actually happened and
// when" after the fact (e.g. the nickname-collision bug above being
// investigated live -- the registry alone couldn't say WHEN or via WHICH
// call path a stale unresolved collision was created).
const logPath = path.join(os.homedir(), ".claude", "persona-registry.log");
const LOG_RETENTION_DAYS = 14;

// Pure: drop any log line older than the retention window. A line that
// doesn't start with a parseable `[ISO timestamp]` is KEPT rather than
// dropped -- an unrecognized line is a sign of a format change worth
// noticing, not evidence it's safe to silently discard. Exported for
// testing.
function pruneLogLines(lines, nowMs, retentionDays = LOG_RETENTION_DAYS) {
  const cutoffMs = nowMs - retentionDays * 86400000;
  return lines.filter((line) => {
    const m = line.match(/^\[([^\]]+)\]/);
    if (!m) return true;
    const t = Date.parse(m[1]);
    return Number.isNaN(t) || t >= cutoffMs;
  });
}

// Pure: render one log line -- `[ISO timestamp] action=<action> key="value" ...`.
// Plain text, tailable, and reconcilable back to a registry entry (every
// field that actually changed state is included as its own key). Values
// are JSON-stringified so an embedded quote or a Windows backslash path
// can't break line parsing. Exported for testing.
function formatLogLine(nowIsoStr, action, fields) {
  const kv = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${JSON.stringify(v ?? null)}`)
    .join(" ");
  return `[${nowIsoStr}] action=${action}${kv ? " " + kv : ""}`;
}

// Pure: the standard field set logged for any entry-shaped event --
// enough on its own to reconcile back to a registry row. Exported for
// testing.
function entryLogFields(entry) {
  const fields = {
    cwd: entry.cwd,
    style: entry.style,
    file: entry.file,
    sessionName: entry.sessionName,
  };
  if (entry.primary === true) fields.primary = true;
  return fields;
}

// Appends one line to the change log and prunes anything past the
// 14-day retention window in the same write -- cheap at this registry's
// actual volume (one append per SessionStart/CLI invocation, not per
// turn). Never throws: logging is best-effort and must never take down
// the real registry mutation it's recording.
function appendLog(nowIsoStr, action, fields) {
  try {
    let lines = [];
    try {
      lines = fs.readFileSync(logPath, "utf8").split(/\r?\n/).filter(Boolean);
    } catch {
      lines = [];
    }
    lines.push(formatLogLine(nowIsoStr, action, fields));
    lines = pruneLogLines(lines, Date.parse(nowIsoStr));
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, lines.join("\n") + "\n");
  } catch {
    // best-effort -- see comment above
  }
}

// Self-heal for a real gap (found live 2026-08-31 in binary-dotfiles):
// `setSessionName`/`pinForever`/`switchPersona` all used to
// hard-fail with "No registry entry ... run a normal session start here
// first" whenever a worktree was ACTIVELY running a persona output-style
// but the SessionStart hook had never actually written a registry row for
// it -- Aphrodite was live in settings.local.json with zero registry entry
// until an unrelated `--help`-as-unrecognized-flag call fell through to
// the default hook path and created one as a side effect. That's a silent,
// surprising failure mode for a worktree that's demonstrably already in
// use, not a case that should ever need "run a normal session start
// first" as the fix. `ensureEntry` runs the exact same brand-new-cwd
// logic `main()` uses (submodule-aware repoId, family inheritance, fresh
// random pick) so a self-healed entry is indistinguishable from one a real
// SessionStart would have created -- just called from a write-path CLI
// invocation instead of the hook. `everOpened: true` here (unlike a
// pinForever advance-reservation) because every caller of ensureEntry is,
// by construction, an already-running session interacting with its own
// worktree, not a placeholder for one that hasn't started yet. Returns
// `{ entries, entry }` with `entry: null` when no persona files exist to
// pick from at all (styles dir missing/empty) -- the caller decides how to
// report that. Exported for testing.
function ensureEntry(entries, cwd, now) {
  const existing = findEntry(entries, cwd);
  if (existing) return { entries, entry: existing, healed: false };
  if (!fs.existsSync(stylesDir)) return { entries, entry: null, healed: false };
  const files = fs.readdirSync(stylesDir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) return { entries, entry: null, healed: false };

  const superprojectCwd = computeSuperprojectCwd(cwd);
  const repoId = computeRepoId(superprojectCwd || cwd);
  const family = findFamily(entries, repoId);
  // Declared ownership checked FIRST, before family or a random pick
  // (added 2026-09-09) -- a persona's own repo isn't ambiguous at all, so
  // it shouldn't wait for family-inheritance or fall through to chance.
  const declaredOwnerStyle = resolveDeclaredOwner(cwd);
  const declaredOwnerFile = declaredOwnerStyle
    ? files.find((f) => {
        const content = fs.readFileSync(path.join(stylesDir, f), "utf8");
        return parseFrontmatterName(content, path.basename(f, ".md")) === declaredOwnerStyle;
      })
    : null;
  // Unlike main()'s automatic SessionStart pick, ensureEntry does NOT
  // refuse a non-git cwd (repoId null, no family) -- every caller here is
  // an explicit, deliberate CLI invocation (--switch, --set-session-name,
  // --pin-forever), not a hook firing silently just
  // because a session happened to launch somewhere. User design call,
  // 2026-08-31: a non-project location should never get a persona picked
  // FOR it automatically, but should still be able to ask for one via the
  // script -- and once asked for, it's an entry like any other (rotation-
  // eligible, not auto-forever-pinned), not a special case.
  let pick, styleName;
  if (declaredOwnerFile) {
    pick = declaredOwnerFile;
    styleName = declaredOwnerStyle;
  } else if (family.length > 0) {
    const anchor = (e) => e.firstPinnedAt ?? e.pinnedAt;
    const root = family.reduce((a, b) => (anchor(a) < anchor(b) ? a : b));
    pick = root.file;
    styleName = root.style;
  } else {
    pick = pickForNewWorktree(files, entries);
    const content0 = fs.readFileSync(path.join(stylesDir, pick), "utf8");
    styleName = parseFrontmatterName(content0, path.basename(pick, ".md"));
  }
  const entry = {
    cwd,
    style: styleName,
    file: pick,
    sessionName: null,
    repoId,
    everOpened: true,
    firstPinnedAt: now,
    pinnedAt: now,
    lastSeen: now,
  };
  const newEntries = [...entries, entry];
  return { entries: newEntries, entry, healed: true };
}

// `node pick-persona.js --list` -- human-facing table of every currently
// pinned worktree, for the user's own "which session is which persona"
// bookkeeping. Stale entries are pruned first so the listing never shows
// dead weight.
function listRegistry() {
  const now = nowIso();
  let entries = pruneStale(readNormalizedRegistry(now));
  writeRegistry(entries);
  if (entries.length === 0) {
    process.stdout.write("No worktrees pinned yet.\n");
    return;
  }
  const header = "| Persona | Worktree | Session | Family | Pinned | Last seen |";
  const sep = "| --- | --- | --- | --- | --- | --- |";
  process.stdout.write(header + "\n" + sep + "\n");
  for (const e of entries) {
    const sessionCell = e.sessionName || "*(not self-registered)*";
    const siblings = findFamily(entries, e.repoId).filter((s) => s.cwd !== e.cwd);
    const familyCell = siblings.length > 0 ? `${siblings.length} sibling${siblings.length === 1 ? "" : "s"}` : "--";
    const pinnedCell = isPrimary(e) ? `${e.pinnedAt} (Primary)` : e.pinnedAt;
    process.stdout.write(`| ${e.style} | ${e.cwd} | ${sessionCell} | ${familyCell} | ${pinnedCell} | ${e.lastSeen} |\n`);
  }
}

// `node pick-persona.js --clean` -- manual, on-demand version of the same
// disk-existence prune the hook already runs silently on every invocation.
// NOTE: this cannot detect "is a live Claude Code session actually attached
// to this worktree right now" -- that's what `--sweep-dead` is for. This
// only ever removes entries whose worktree directory is verifiably gone
// from disk.
function cleanRegistry() {
  const before = readRegistry();
  const after = pruneStale(before);
  writeRegistry(after);
  const removed = before.filter((b) => !after.some((a) => a.cwd === b.cwd));
  if (removed.length === 0) {
    process.stdout.write("Nothing to clean -- every pinned worktree still exists on disk.\n");
    return;
  }
  const now = nowIso();
  process.stdout.write(`Removed ${removed.length} entr${removed.length === 1 ? "y" : "ies"} (worktree no longer on disk):\n`);
  for (const e of removed) {
    appendLog(now, "clean-stale-worktree", entryLogFields(e));
    process.stdout.write(`  ${e.style}: ${e.cwd}\n`);
  }
}

// `node pick-persona.js --set-session-name "<name>"` -- self-registration,
// so a persona can be targeted BY NAME across sessions, not just listed.
function setSessionName(sessionName) {
  const cwd = resolveCwd();
  const now = nowIso();
  const { entries, entry, healed } = ensureEntry(readRegistry(), cwd, now);
  if (!entry) {
    process.stderr.write(`No persona files found to self-heal a registry entry for ${cwd}.\n`);
    process.exitCode = 1;
    return;
  }
  if (healed) appendLog(now, "self-heal-new-worktree", entryLogFields(entry));
  entry.sessionName = sessionName;
  entry.lastSeen = now;
  writeRegistry(entries);
  appendLog(now, "set-session-name", entryLogFields(entry));
  const healedNote = healed ? " (no registry entry existed yet -- created one)" : "";
  process.stdout.write(`Session name "${sessionName}" recorded for ${cwd} (persona: ${entry.style})${healedNote}.\n`);
}

// Pure: a dead sessionName is grounds to drop the WHOLE entry -- except a
// forever-pinned one (`isForeverPinned`, "Perm"/"Fixed"), which only has its
// sessionName nulled, never removed. Real incident, 2026-09-06: this used to
// key off `everOpened` instead -- "never actually opened yet survives,
// already-opened doesn't" -- which meant a real, human-decided Perm/Primary
// domain binding (binary-dotfiles/Aphrodite, xcl-xls/Callie) got deleted
// outright the moment its process wasn't live at sweep time, same as any
// throwaway rotation-eligible entry. `everOpened` answers "has a session
// ever attached here," not "did a human deliberately commit to this
// binding" -- Perm is the only field that actually answers that, so it's the
// only thing this function protects now. A non-Perm entry is always
// realistically droppable, opened before or not -- rotation-eligible state
// was never meant to survive its process dying. Returns `{ entries, removed,
// sessionNameOnlyCleared }`. Exported for testing.
function clearDeadSession(entries, sessionName) {
  const keep = [];
  const removed = [];
  const sessionNameOnlyCleared = [];
  for (const e of entries) {
    if (e.sessionName === sessionName) {
      if (!isForeverPinned(e)) {
        removed.push(e);
        continue;
      }
      e.sessionName = null;
      sessionNameOnlyCleared.push(e);
    }
    keep.push(e);
  }
  return { entries: keep, removed, sessionNameOnlyCleared };
}

// Pure: bulk sibling of clearDeadSession -- given the full set of CURRENTLY
// LIVE session names (from a fresh ListAgents call the caller already made),
// sweeps every entry whose `sessionName` is set but NOT in that live set.
// Entries with no `sessionName` on file at all are never touched. Exported
// for testing.
function sweepDeadSessions(entries, liveSessionNames) {
  const live = new Set(liveSessionNames);
  const deadNames = new Set(
    entries.filter((e) => e.sessionName && !live.has(e.sessionName)).map((e) => e.sessionName),
  );
  let current = entries;
  const removed = [];
  const sessionNameOnlyCleared = [];
  for (const name of deadNames) {
    const result = clearDeadSession(current, name);
    current = result.entries;
    removed.push(...result.removed);
    sessionNameOnlyCleared.push(...result.sessionNameOnlyCleared);
  }
  return { entries: current, removed, sessionNameOnlyCleared };
}

// `node pick-persona.js --sweep-dead "<comma-separated live sessionNames>"`
// -- CLI driver for sweepDeadSessions.
function sweepDeadRegistry(liveSessionNamesCsv) {
  const liveNames = liveSessionNamesCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const entries = readRegistry();
  // Real incident, 2026-09-04: ListAgents never lists the calling session
  // itself, only its peers -- that's ListAgents' own documented behavior,
  // not a bug in it. But hails-session-start's own sweep step feeds ListAgents'
  // peer list straight into --sweep-dead, which means the caller's own
  // sessionName is *always* absent from `liveNames`, no matter how alive it
  // genuinely is. Without this, sweep-dead concludes the calling session is
  // dead and removes its own just-registered entry -- confirmed live twice
  // in one night (Callie's `xls` entry lost its real firstPinnedAt and
  // briefly self-healed as the wrong persona; Aphrodite's `binary-dotfiles`
  // entry hit the identical 47ms-later removal). The calling process is
  // definitionally alive at the moment it's making this very call, so its
  // own cwd's current sessionName is always added to the live set here,
  // regardless of what the caller passed in.
  const selfEntry = findEntry(entries, resolveCwd());
  const namesToTreatAsLive = selfEntry && selfEntry.sessionName
    ? [...liveNames, selfEntry.sessionName]
    : liveNames;
  const { entries: kept, removed, sessionNameOnlyCleared } = sweepDeadSessions(entries, namesToTreatAsLive);
  if (removed.length === 0 && sessionNameOnlyCleared.length === 0) {
    process.stdout.write("Nothing to sweep -- every entry with a sessionName on file is still live.\n");
    return;
  }
  writeRegistry(kept);
  const now = nowIso();
  for (const e of removed) {
    appendLog(now, "remove-dead-session", entryLogFields(e));
    process.stdout.write(`Removed ${e.style} from ${e.cwd} entirely -- dead session, not forever-pinned, so nothing survives.\n`);
  }
  for (const e of sessionNameOnlyCleared) {
    appendLog(now, "clear-session-name-only", entryLogFields(e));
    process.stdout.write(`Cleared dead session from ${e.cwd} (persona: ${e.style}) but kept the entry -- it's forever-pinned.\n`);
  }
}

// `node pick-persona.js --clear-session-name "<name>"` -- self-healing for
// a dead peer, single target. REMOVES the whole entry (unless forever-pinned),
// same rule as sweepDeadSessions.
function clearSessionName(sessionName) {
  const entries = readRegistry();
  const { entries: kept, removed, sessionNameOnlyCleared } = clearDeadSession(entries, sessionName);
  if (removed.length === 0 && sessionNameOnlyCleared.length === 0) {
    process.stdout.write(`No registry entry currently has sessionName "${sessionName}" -- nothing to clear.\n`);
    return;
  }
  writeRegistry(kept);
  const now = nowIso();
  for (const e of removed) {
    appendLog(now, "remove-dead-session", entryLogFields(e));
    process.stdout.write(`Removed ${e.style} from ${e.cwd} entirely -- dead session, not forever-pinned, so nothing survives. Next session there gets a fresh pick.\n`);
  }
  for (const e of sessionNameOnlyCleared) {
    appendLog(now, "clear-session-name-only", entryLogFields(e));
    process.stdout.write(`Cleared dead session from ${e.cwd} (persona: ${e.style}) but kept the entry -- it's forever-pinned.\n`);
  }
}

// Pure: match a persona name string against registry entries, case-
// insensitively against `style`. Exported for testing.
function matchByName(entries, name) {
  const needle = name.trim().toLowerCase();
  return entries.filter((e) => e.style.toLowerCase() === needle);
}

// `node pick-persona.js --resolve "<name>"` -- given a persona name,
// prints every matching worktree's `sessionName` so the caller can pass it
// straight to `SendMessage`.
function resolveTarget(name) {
  const entries = pruneStale(readRegistry());
  const matches = matchByName(entries, name);
  if (matches.length === 0) {
    process.stdout.write(`No pinned worktree matches "${name}".\n`);
    return;
  }
  for (const e of matches) {
    if (e.sessionName) {
      process.stdout.write(`${e.style}: sessionName="${e.sessionName}" (${e.cwd})\n`);
    } else {
      process.stdout.write(`${e.style}: no sessionName on file yet -- that session hasn't self-registered (${e.cwd})\n`);
    }
  }
}

// `node pick-persona.js --reset [<path>] [--confirm]` -- manual, on-demand wipe.
// The no-path, whole-registry form is real damage (every worktree's pin,
// Perm/primary status, gone at once) with no preview -- recoverable
// (the log keeps it, everything self-heals on next contact) but not a fence
// to leave un-gated. Aphrodite's audit, finding #4, 2026-09-09: requires an
// explicit --confirm on this form specifically. The single-entry form
// (`--reset <path>`) stays exactly as it was -- already scoped, lower stakes.
function resetRegistry(targetPath, confirmed) {
  const entries = readRegistry();
  const now = nowIso();
  if (!targetPath) {
    if (!confirmed) {
      process.stdout.write(
        `Refusing to wipe the entire registry (${entries.length} entr${entries.length === 1 ? "y" : "ies"}) without --confirm. ` +
          `Re-run as \`--reset --confirm\` if that's actually what you want, or \`--reset <path>\` to remove just one entry.\n`
      );
      return;
    }
    writeRegistry([]);
    appendLog(now, "reset-all", { removedCount: entries.length });
    process.stdout.write(`Reset: removed all ${entries.length} entr${entries.length === 1 ? "y" : "ies"}.\n`);
    return;
  }
  const resolved = resolveMaybePath(targetPath);
  const match = findEntry(entries, resolved);
  if (!match) {
    process.stdout.write(`No entry found for ${resolved}.\n`);
    return;
  }
  writeRegistry(entries.filter((e) => e.cwd !== resolved));
  appendLog(now, "reset", entryLogFields(match));
  process.stdout.write(`Reset: removed ${match.style} (${resolved}).\n`);
}

// `node pick-persona.js --pin-forever [<path>]` -- the ONLY way an entry
// becomes genuinely immune to auto-rotation. No automatic path (fresh pick,
// manual switch, cascade) ever sets this -- it's a deliberate, one-off,
// human-only action. No path: targets the current cwd's own entry.
function pinForever(targetPath) {
  const cwd = targetPath ? resolveMaybePath(targetPath) : resolveCwd();
  const now = nowIso();
  const { entries, entry, healed } = ensureEntry(readNormalizedRegistry(now), cwd, now);
  if (!entry) {
    process.stderr.write(`No persona files found to self-heal a registry entry for ${cwd}.\n`);
    process.exitCode = 1;
    return;
  }
  if (healed) appendLog(now, "self-heal-new-worktree", entryLogFields(entry));
  entry.pinnedAt = "Perm";
  entry.lastSeen = now;
  writeRegistry(entries);
  appendLog(now, "pin-forever", entryLogFields(entry));
  const healedNote = healed ? " (no registry entry existed yet -- created one)" : "";
  process.stdout.write(`${entry.style} permanently pinned at ${cwd}${healedNote} -- exempt from auto-rotation until explicitly unpinned.\n`);
}

// `node pick-persona.js --unpin-forever [<path>]` -- reverses --pin-forever.
// Back to normal, rotation-eligible, clock starting from right now (not
// retroactive to whenever it was originally pinned).
function unpinForever(targetPath) {
  const cwd = targetPath ? resolveMaybePath(targetPath) : resolveCwd();
  const now = nowIso();
  const healResult = ensureEntry(readNormalizedRegistry(now), cwd, now);
  const entries = healResult.entries;
  const entry = healResult.entry;
  if (!entry) {
    process.stderr.write(`No persona files found to self-heal a registry entry for ${cwd}.\n`);
    process.exitCode = 1;
    return;
  }
  if (healResult.healed) appendLog(now, "self-heal-new-worktree", entryLogFields(entry));
  entry.pinnedAt = now;
  entry.lastSeen = now;
  writeRegistry(entries);
  appendLog(now, "unpin-forever", entryLogFields(entry));
  process.stdout.write(`${entry.style} unpinned at ${cwd} -- no longer Perm (auto-rotation itself was removed 2026-09-02, so this is just a normal, un-Perm'd entry now, not a rotation clock restarting).\n`);
}

// `node pick-persona.js --set-primary [<path>]` -- added 2026-09-03,
// BinaryMisfit's own call (see `isPrimary`'s own comment for the full
// incident). The ONLY way an entry becomes the canonical domain anchor for
// its persona -- no automatic path ever sets this, same
// deliberate-human-only shape as `--pin-forever`. Requires the entry
// already be forever-pinned first (refuses otherwise, with a clear pointer
// to run `--pin-forever` first) -- a canonical anchor that could still
// rotate away doesn't make sense. Also refuses if some OTHER live entry is
// already primary for the SAME persona file -- only one canonical anchor
// per character, a deliberate single-holder invariant, not something to
// silently allow drifting into two. No path: targets the current cwd's
// own entry.
function setPrimary(targetPath) {
  const cwd = targetPath ? resolveMaybePath(targetPath) : resolveCwd();
  const now = nowIso();
  const healResult = ensureEntry(readNormalizedRegistry(now), cwd, now);
  const entries = healResult.entries;
  const entry = healResult.entry;
  if (!entry) {
    process.stderr.write(`No persona files found to self-heal a registry entry for ${cwd}.\n`);
    process.exitCode = 1;
    return;
  }
  if (healResult.healed) appendLog(now, "self-heal-new-worktree", entryLogFields(entry));
  if (!isForeverPinned(entry)) {
    process.stderr.write(`${entry.style} at ${cwd} isn't forever-pinned yet -- run --pin-forever first, then --set-primary.\n`);
    process.exitCode = 1;
    return;
  }
  const existingPrimary = entries.find((e) => e.cwd !== cwd && e.file === entry.file && isPrimary(e));
  if (existingPrimary) {
    process.stderr.write(`${entry.style} already has a primary anchor at ${existingPrimary.cwd} -- run --unset-primary there first if this should move.\n`);
    process.exitCode = 1;
    return;
  }
  entry.primary = true;
  entry.lastSeen = now;
  writeRegistry(entries);
  appendLog(now, "set-primary", entryLogFields(entry));
  process.stdout.write(`${entry.style} is now the primary domain anchor at ${cwd} -- always the plain name, regardless of pin order.\n`);
}

// `node pick-persona.js --unset-primary [<path>]` -- reverses --set-primary.
// The entry stays forever-pinned (this only touches `primary`, not
// `pinnedAt`); it just goes back to competing for the plain name on normal
// `firstPinnedAt` terms like everything else.
function unsetPrimary(targetPath) {
  const cwd = targetPath ? resolveMaybePath(targetPath) : resolveCwd();
  const now = nowIso();
  const healResult = ensureEntry(readNormalizedRegistry(now), cwd, now);
  const entries = healResult.entries;
  const entry = healResult.entry;
  if (!entry) {
    process.stderr.write(`No persona files found to self-heal a registry entry for ${cwd}.\n`);
    process.exitCode = 1;
    return;
  }
  if (healResult.healed) appendLog(now, "self-heal-new-worktree", entryLogFields(entry));
  if (!isPrimary(entry)) {
    process.stdout.write(`${entry.style} at ${cwd} isn't primary -- nothing to unset.\n`);
    return;
  }
  entry.primary = false;
  entry.lastSeen = now;
  writeRegistry(entries);
  appendLog(now, "unset-primary", entryLogFields(entry));
  process.stdout.write(`${entry.style} is no longer the primary anchor at ${cwd} -- back to normal firstPinnedAt-order collision rules.\n`);
}

// `node pick-persona.js --set-color [<path>]` -- 2026-09-03, BinaryMisfit's
// own design call: the automatic SessionStart hook stays minimal (registry
// entry + persona file read + output style, nothing else) so a
// one-question-and-close session never pays for work it doesn't need.
// Everything with real weight -- day-state, theme, color -- moved to the
// `hails-session-start` SKILL instead, which BinaryMisfit runs by hand every real
// work session ("load bearing on a habit that's actually load bearing").
// This is the standalone entry point that skill's own Step 1.3 calls --
// `writeVscodeWorkspaceColor` previously only ran inline inside the hook's
// `main()`, with no way to invoke it on its own. Reads the registry entry
// (must already exist -- a normal session start always creates one) rather
// than re-deriving the persona style from scratch. No path: targets the
// current cwd's own entry, same convention as `--pin-forever`/`--switch`.
function setColor(targetPath) {
  const cwd = targetPath ? resolveMaybePath(targetPath) : resolveCwd();
  const now = nowIso();
  const healResult = ensureEntry(readNormalizedRegistry(now), cwd, now);
  const entries = healResult.entries;
  const entry = healResult.entry;
  if (!entry) {
    process.stderr.write(`No persona files found to self-heal a registry entry for ${cwd}.\n`);
    process.exitCode = 1;
    return;
  }
  if (healResult.healed) {
    writeRegistry(entries);
    appendLog(now, "self-heal-new-worktree", entryLogFields(entry));
  }
  const wrote = writeVscodeWorkspaceColor(cwd, entry.style);
  if (!wrote) {
    process.stdout.write(`No color written for ${cwd} -- .vscode/settings.json is git-tracked here (real project settings, not machine-local color noise), or it couldn't be parsed safely. Not an error, just nothing to do.\n`);
    return;
  }
  process.stdout.write(`Color set for ${entry.style} at ${cwd}.\n`);
}

// `node pick-persona.js --switch <filename.md> [<path>]` -- the manual
// override's actual write path. The `hails-persona` skill resolves a fuzzy
// name to an exact filename FIRST (its own step 2), then calls
// this. See this file's header comment for why centralizing the write here
// is what makes "manual never pins forever" and family cascade real
// behavior instead of prose an assistant has to correctly replicate by
// hand every time.
function switchPersona(filename, targetPath) {
  const cwd = targetPath ? resolveMaybePath(targetPath) : resolveCwd();
  const now = nowIso();
  const healResult = ensureEntry(readNormalizedRegistry(now), cwd, now);
  let entries = healResult.entries;
  let entry = healResult.entry;
  if (healResult.healed && entry) appendLog(now, "self-heal-new-worktree", entryLogFields(entry));
  if (!entry) {
    process.stderr.write(`No persona files found to self-heal a registry entry for ${cwd}.\n`);
    process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(stylesDir) || !fs.existsSync(path.join(stylesDir, filename))) {
    process.stderr.write(`No persona file "${filename}" under ${stylesDir}.\n`);
    process.exitCode = 1;
    return;
  }
  // Real bug, caught live 2026-09-06 (digital-homelab): Windows' filesystem
  // resolves `stylesDir` case-insensitively, so `fs.existsSync` above
  // happily accepts a differently-cased argument ("Alexia.md") against an
  // entry whose stored `file` holds the real on-disk casing from an earlier
  // self-heal/session-start ("alexia.md", from `fs.readdirSync`). The
  // string compare just below is case-SENSITIVE, though, so that mismatch
  // read as a genuine persona change -- silently resetting a `pinnedAt:
  // "Perm"` back to a plain timestamp on what was actually just a same-
  // persona reconfirm. Resolving to the real on-disk filename first, before
  // either the comparison or the write, makes the two case variants compare
  // equal like they should.
  const onDiskFilename =
    fs.readdirSync(stylesDir).find((f) => f.toLowerCase() === filename.toLowerCase()) ?? filename;
  filename = onDiskFilename;
  const content = fs.readFileSync(path.join(stylesDir, filename), "utf8");
  const styleName = parseFrontmatterName(content, path.basename(filename, ".md"));
  const genuinelyDifferent = entry.file !== filename;
  const wasForeverPinned = isForeverPinned(entry);

  entry.file = filename;
  entry.style = styleName;
  // A same-file "switch" is how a session refreshes its own stale in-memory
  // copy after a persona file's content changed on disk (see the `hails-persona`
  // skill's "notify-on-global-persona-update" step) -- it must never be able
  // to silently un-pin a forever-pinned worktree. Only a GENUINE persona
  // change resets pinnedAt away from "Perm"/"Fixed"; a refresh onto the same
  // file leaves an existing forever-pin exactly as it was. Real gap, caught
  // live 2026-09-02: digital-homelab-4c deliberately avoided --switch after
  // a content-only refresh specifically because this guard didn't exist yet.
  if (genuinelyDifferent || !wasForeverPinned) {
    entry.pinnedAt = now;
  }
  entry.lastSeen = now;

  if (genuinelyDifferent && entry.repoId) {
    entries = cascadeFamilyPersona(entries, entry.repoId, filename, styleName);
  }
  entry = findEntry(entries, cwd);

  writeRegistry(entries);
  appendLog(now, "switch", { ...entryLogFields(entry), genuinelyDifferent });
  const siblings = findFamily(entries, entry.repoId).filter((e) => e.cwd !== cwd);
  const updatedSiblings = siblings.filter((e) => e.file === filename);
  const skippedSiblings = siblings.length - updatedSiblings.length;
  for (const sib of updatedSiblings) {
    appendLog(now, "cascade", { ...entryLogFields(sib), cascadedFrom: cwd });
  }
  let cascadeNote = "";
  if (genuinelyDifferent && updatedSiblings.length > 0) {
    cascadeNote = ` -- cascaded to ${updatedSiblings.length} sibling worktree${updatedSiblings.length === 1 ? "" : "s"}`;
  }
  if (genuinelyDifferent && skippedSiblings > 0) {
    cascadeNote += `${cascadeNote ? "," : " --"} skipped ${skippedSiblings} forever-pinned sibling${skippedSiblings === 1 ? "" : "s"}`;
  }
  const pinNote =
    genuinelyDifferent || !wasForeverPinned
      ? "Rotation clock reset -- not a permanent pin."
      : "Same file re-read -- forever-pin preserved, rotation clock untouched.";
  process.stdout.write(`Switched ${cwd} to ${styleName}${cascadeNote}. ${pinNote}\n`);
}

function main() {
  if (process.argv.includes("--list")) {
    listRegistry();
    return;
  }

  if (process.argv.includes("--clean")) {
    cleanRegistry();
    return;
  }

  const resetFlagIndex = process.argv.indexOf("--reset");
  if (resetFlagIndex !== -1) {
    const nextArg = process.argv[resetFlagIndex + 1];
    const hasPath = Boolean(nextArg) && !nextArg.startsWith("--");
    const confirmed = process.argv.includes("--confirm");
    resetRegistry(hasPath ? nextArg : undefined, confirmed);
    return;
  }

  const setSessionNameFlagIndex = process.argv.indexOf("--set-session-name");
  if (setSessionNameFlagIndex !== -1) {
    const sessionName = process.argv[setSessionNameFlagIndex + 1];
    if (!sessionName) {
      process.stderr.write("--set-session-name requires a value.\n");
      process.exitCode = 1;
      return;
    }
    setSessionName(sessionName);
    return;
  }

  const sweepDeadFlagIndex = process.argv.indexOf("--sweep-dead");
  if (sweepDeadFlagIndex !== -1) {
    const liveNames = process.argv[sweepDeadFlagIndex + 1];
    if (liveNames === undefined) {
      process.stderr.write('--sweep-dead requires a value (comma-separated live sessionNames, or "" if none are live).\n');
      process.exitCode = 1;
      return;
    }
    sweepDeadRegistry(liveNames);
    return;
  }

  const clearSessionNameFlagIndex = process.argv.indexOf("--clear-session-name");
  if (clearSessionNameFlagIndex !== -1) {
    const name = process.argv[clearSessionNameFlagIndex + 1];
    if (!name) {
      process.stderr.write("--clear-session-name requires a value.\n");
      process.exitCode = 1;
      return;
    }
    clearSessionName(name);
    return;
  }

  const resolveFlagIndex = process.argv.indexOf("--resolve");
  if (resolveFlagIndex !== -1) {
    const name = process.argv[resolveFlagIndex + 1];
    if (!name) {
      process.stderr.write("--resolve requires a value.\n");
      process.exitCode = 1;
      return;
    }
    resolveTarget(name);
    return;
  }

  const pinForeverFlagIndex = process.argv.indexOf("--pin-forever");
  if (pinForeverFlagIndex !== -1) {
    pinForever(process.argv[pinForeverFlagIndex + 1]);
    return;
  }

  const unpinForeverFlagIndex = process.argv.indexOf("--unpin-forever");
  if (unpinForeverFlagIndex !== -1) {
    unpinForever(process.argv[unpinForeverFlagIndex + 1]);
    return;
  }

  const setPrimaryFlagIndex = process.argv.indexOf("--set-primary");
  if (setPrimaryFlagIndex !== -1) {
    setPrimary(process.argv[setPrimaryFlagIndex + 1]);
    return;
  }

  const unsetPrimaryFlagIndex = process.argv.indexOf("--unset-primary");
  if (unsetPrimaryFlagIndex !== -1) {
    unsetPrimary(process.argv[unsetPrimaryFlagIndex + 1]);
    return;
  }

  const setColorFlagIndex = process.argv.indexOf("--set-color");
  if (setColorFlagIndex !== -1) {
    setColor(process.argv[setColorFlagIndex + 1]);
    return;
  }

  const switchFlagIndex = process.argv.indexOf("--switch");
  if (switchFlagIndex !== -1) {
    const filename = process.argv[switchFlagIndex + 1];
    if (!filename) {
      process.stderr.write("--switch requires a persona filename (e.g. hailey.md).\n");
      process.exitCode = 1;
      return;
    }
    const maybePath = process.argv[switchFlagIndex + 2];
    const targetPath = maybePath && !maybePath.startsWith("--") ? maybePath : undefined;
    switchPersona(filename, targetPath);
    return;
  }

  // Real incident, 2026-09-04: a plain diagnostic invocation with an
  // unrecognized flag (`--help`, a typo, anything not matched above) used
  // to fall straight through into the real SessionStart hook body below --
  // silently mutating the registry (nulling this worktree's sessionName,
  // potentially triggering a fresh persona pick) and printing hook JSON,
  // even though nothing about the call was an actual SessionStart. A genuine
  // hook invocation never passes extra argv at all (see this repo's own
  // settings.json: `node ".../pick-persona.js"`, no arguments) -- so any
  // argv present that didn't match one of the flags above is always a
  // mistaken or diagnostic call, never a real hook firing, and must error
  // instead of mutating anything.
  const unrecognizedArgs = process.argv.slice(2);
  if (unrecognizedArgs.length > 0) {
    process.stderr.write(`Unrecognized argument(s): ${unrecognizedArgs.join(" ")}\n`);
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(stylesDir)) {
    process.exit(0);
  }
  const files = fs.readdirSync(stylesDir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    process.exit(0);
  }

  const cwd = resolveCwd();
  const now = nowIso();

  // Real, time-critical fix (2026-09-06): this whole span, read through
  // write, is exactly the race Aphrodite caught minutes before four brand-
  // new SessionStart hooks were about to fire at once against real
  // never-seen worktrees -- see acquireRegistryLock's own header comment
  // for the full incident and why per-call locking alone wouldn't fix it.
  acquireRegistryLock();
  let entries;
  let entry;
  try {
  entries = pruneStale(readNormalizedRegistry(now));
  entry = findEntry(entries, cwd);

  if (entry) {
    entry.lastSeen = now;
    // Real bug, fixed 2026-09-09 (Aphrodite's audit, finding #11): this used
    // to null sessionName unconditionally right here, on the reasoning that
    // every SessionStart means a brand-new harness process, so any name
    // recorded by a previous session must already be dead. True for a fresh
    // `claude` launch -- NOT true for `claude -c`/`--resume`, which fires
    // this exact same hook for a conversation that's genuinely still the
    // same session. Between this null and whatever skill re-registers (not
    // guaranteed to fire every turn), the worktree went briefly unaddressable
    // by name -- `--resolve` would report "no sessionName on file yet" for a
    // session that never actually stopped. Left alone now, same discipline
    // `--sweep-dead`/`--clear-session-name` already use elsewhere in this
    // file: don't clear a name proactively, confirm it's actually dead
    // first (via ListAgents) and let the existing sweep -- already run every
    // session-start, as part of the identity-gate step -- catch a genuinely
    // stale one. A resumed session's old name stays resolvable through the
    // gap; a genuinely dead session's stale name still gets caught, just by
    // the sweep instead of by this hook guessing preemptively.
    entry.everOpened = true;

    // Resync `style` with the persona file's OWN current frontmatter
    // (2026-08-30) -- without this, an entry's cached `style` could drift
    // from what the file itself now says and just keep showing the stale
    // name forever, since nothing previously re-derived it after the first
    // pick. A missing file is handled gracefully further down, right
    // before the final content read, instead of crashing here.
    const currentFilePath = path.join(stylesDir, entry.file);
    if (fs.existsSync(currentFilePath)) {
      const liveContent = fs.readFileSync(currentFilePath, "utf8");
      const liveName = parseFrontmatterName(liveContent, entry.style);
      if (liveName !== entry.style) entry.style = liveName;
    }

    // Auto-rotation removed (2026-09-02, BinaryMisfit's own call): every
    // domain now gets one stable, deliberately-chosen persona, permanently
    // -- "the persona's work differently now," not a rotating flavor pool.
    // The old mechanic (needsRotation/pickRotationTarget/
    // isEligibleForOwnRotation, all deleted with this change) only ever
    // fired inside this automatic SessionStart pick path, but that includes
    // a `--resume` of an existing session -- a fresh SessionStart hook
    // invocation, same as any other -- so a not-yet-forever-pinned worktree
    // could have its persona silently swapped out from under a conversation
    // that was already in progress. Real incident this traces back to,
    // 2026-09-02: a resumed session (`--resume=3af73ea3...`) firing a fresh
    // hook is exactly the shape of event that could trigger this.

    appendLog(now, "hails-session-start", entryLogFields(entry));
  } else {
    // A brand-new cwd: is this a new git-worktree SIBLING of a repo we
    // already track, or a genuinely new/unrelated repo? A sibling inherits
    // its family's CURRENT persona automatically -- it is NOT a fresh
    // random pick, it's the same character showing up in a second physical
    // location of the SAME project (and reflects whatever that family has
    // most recently rotated/switched to, since it reads the root's live
    // `file`/`style`). A genuinely new repo still random-picks from the
    // diversity pool exactly as before.
    //
    // If cwd is actually inside a SUBMODULE (e.g. opened directly inside
    // `xls-playthrough/refs/x-change-source` to browse reference source,
    // not as a deliberate separate project), resolve repoId from the outer
    // super-project's working tree instead of the submodule's own -- a
    // submodule checkout is not a project of its own, and should inherit
    // whatever persona the enclosing worktree already has rather than
    // spawning an unrelated new identity.
    const superprojectCwd = computeSuperprojectCwd(cwd);
    const repoId = computeRepoId(superprojectCwd || cwd);
    const family = findFamily(entries, repoId);

    // Declared ownership checked FIRST, before the bare-directory guard,
    // before family, before a random pick (added 2026-09-09) -- a
    // persona's own repo isn't ambiguous at all, so it shouldn't wait for
    // family-inheritance or fall through to chance, and it isn't the kind
    // of incidental location the bare-directory guard below exists to
    // catch either -- it's declared, deliberate, permanent.
    const declaredOwnerStyle = resolveDeclaredOwner(cwd);
    const declaredOwnerFile = declaredOwnerStyle
      ? files.find((f) => {
          const content = fs.readFileSync(path.join(stylesDir, f), "utf8");
          return parseFrontmatterName(content, path.basename(f, ".md")) === declaredOwnerStyle;
        })
      : null;

    // Never AUTOMATICALLY register a cwd that isn't inside a git repo at
    // all AND has no existing family to inherit from AND isn't a declared
    // repo -- real incident (2026-08-31): `c:\users\diago`, the bare
    // Windows home directory, got permanently pinned to a persona simply
    // because a session happened to launch with its cwd there before ever
    // `cd`-ing into a real project; removing that entry by hand did
    // nothing because the next incidental session there just recreated
    // it. This guard is deliberately ONLY here, in the automatic
    // SessionStart pick path -- a bare home directory should never get a
    // persona picked FOR it, but the user can still explicitly ask for one
    // via `--switch` (see ensureEntry's own comment on why it does NOT
    // carry this same guard) -- explicit intent is exactly what
    // distinguishes an incidental location from a real one here. A cwd
    // with a real repoId but no family yet is still a legitimate
    // brand-new project and is unaffected by this guard.
    if (!declaredOwnerFile && !repoId && family.length === 0) {
      releaseRegistryLock();
      process.exit(0);
    }

    let pick, styleName, inherited;
    if (declaredOwnerFile) {
      pick = declaredOwnerFile;
      styleName = declaredOwnerStyle;
      inherited = false;
    } else if (family.length > 0) {
      const anchor = (e) => e.firstPinnedAt ?? e.pinnedAt;
      const root = family.reduce((a, b) => (anchor(a) < anchor(b) ? a : b));
      pick = root.file;
      styleName = root.style;
      inherited = true;
    } else {
      pick = pickForNewWorktree(files, entries);
      const content0 = fs.readFileSync(path.join(stylesDir, pick), "utf8");
      styleName = parseFrontmatterName(content0, path.basename(pick, ".md"));
      inherited = false;
    }
    entry = {
      cwd,
      style: styleName,
      file: pick,
      sessionName: null,
      repoId,
      everOpened: true,
      firstPinnedAt: now,
      pinnedAt: now,
      lastSeen: now,
    };
    entries.push(entry);
    appendLog(now, "new-worktree", { ...entryLogFields(entry), inherited });
  }

  writeRegistry(entries);
  } finally {
    releaseRegistryLock();
  }

  const finalFilePath = path.join(stylesDir, entry.file);
  if (!fs.existsSync(finalFilePath)) {
    // The persona file this entry points at no longer exists (renamed or
    // deleted). Degrade gracefully -- surface it plainly rather than
    // crashing the hook or silently guessing a replacement. The registry
    // entry is left as-is; a real fix is `--switch` to a file that exists.
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: `**pick-persona.js:** this worktree's pinned persona file ("${entry.file}") no longer exists under ${stylesDir}. Tell the user directly and ask whether to \`--switch\` to a real one.`,
        },
      }),
    );
    return;
  }
  const content = fs.readFileSync(finalFilePath, "utf8");
  setActiveOutputStyle(entry.style, settingsPathFor(cwd));

  // Deliberately THE WHOLE hook, nothing more (2026-09-03, BinaryMisfit's
  // own design call, restructured out of what used to also run day-state,
  // theme, and VS Code color inline here). This hook fires on EVERY
  // session, including a one-question-and-close session that never touches
  // the `hails-session-start` skill at all -- it has to stay fast and cheap for
  // that case, so it does exactly two things: figure out which persona this
  // worktree is (registry entry, above) and hand back that persona's own
  // file content. Everything with real weight -- continuity, theme, color
  // -- moved to the `hails-session-start` skill's own Step 1.1-1.3
  // (`claude-global/skills/hails-session-start/generic-playbook.md`), which
  // BinaryMisfit runs by hand every real work session ("I open VS, select a
  // repo, open the Claude tab, type /hails-session-start -- every time") --
  // load-bearing on a habit that's actually load-bearing, not bolted onto a
  // hook that has to stay cheap for a session that might never need any of
  // it. `writeVscodeWorkspaceColor` is still reachable directly via
  // `--set-color` (see that function's own comment) for exactly that skill
  // step to call.
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: content,
      },
    }),
  );
}

module.exports = {
  pruneStale,
  findEntry,
  pickForNewWorktree,
  parseFrontmatterName,
  settingsPathFor,
  matchByName,
  computeRepoId,
  computeSuperprojectCwd,
  colorForStyle,
  fallbackColorForStyle,
  hexToHsl,
  sastDateKey,
  moodColorForStyle,
  isGitTracked,
  writeVscodeWorkspaceColor,
  findFamily,
  loadDeclaredRepos,
  resolveDeclaredOwner,
  ensureEntry,
  clearDeadSession,
  sweepDeadSessions,
  isForeverPinned,
  isPrimary,
  normalizeEntry,
  cascadeFamilyPersona,
  resolveMaybePath,
  pruneLogLines,
  formatLogLine,
  entryLogFields,
  acquireRegistryLock,
  releaseRegistryLock,
  withRegistryLock,
};

if (require.main === module) {
  main();
}
