#!/usr/bin/env node
"use strict";

// GLOBAL Claude Code tooling (promoted 2026-08-28 from an X-Lifestyle-only
// project hook to `~/.claude/`) -- authored/tracked here in the xls repo,
// under `claude-global/` at the repo root (deliberately NOT `.claude/scripts/`,
// `.claude/output-styles/`, or `.claude/skills/` -- those paths are ones
// Claude Code auto-discovers, so a copy sitting there would make xls's own
// sessions see a project-level output-style/skill that SHADOWS the global
// one per Claude Code's own "project wins over global" precedence, silently
// defeating the whole point of promoting this to global in the first
// place). `claude-global/` mirrors the deploy target's own structure 1:1
// (`claude-global/output-styles/` -> `~/.claude/output-styles/`,
// `claude-global/skills/persona/` -> `~/.claude/skills/persona/`,
// `claude-global/scripts/` -> `~/.claude/scripts/`), and every other global
// tool this repo owns (session-start, scratchpad-check, worktree-sync-check,
// the audits, the registers convention) lives under the same tree, so the
// sync script's mapping is a straight copy, no renaming. Deploy via
// `npm run sync-global-claude-config` from the xls repo root after any
// edit here or to a persona file -- `~/.claude/` itself isn't a git repo,
// so this project keeps the authored source instead of losing history to a
// raw move. Once deployed, this hook fires for EVERY Claude Code project on
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
// followed by the persona's own instructions, including its "Instance
// nicknames" section (see below).
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
// DEC-15 in the xls repo for the full design discussion this implements):
//   { cwd, style, file, nickname, sessionName, repoId, everOpened,
//     firstPinnedAt, pinnedAt, rotateAfterDays, lastSeen }
//
// `firstPinnedAt` (added 2026-08-30) is IMMUTABLE -- stamped once, the
// moment this worktree is first ever assigned a persona, and never touched
// again by anything (not a manual switch, not a cascade). It exists purely
// to answer "which family member came first" -- used by `needsNickname`
// (nickname precedence) -- because `pinnedAt` itself resets on every
// switch and can no longer be trusted for "who was here first."
//
// `pinnedAt` is deliberately loose-typed (explicit user design call,
// 2026-08-30: "this is not a db file, we have design authority") -- either
// a real ISO timestamp, or the literal string `"Perm"` (or `"Fixed"`,
// recognized as a synonym) meaning permanently, explicitly locked.
// `"Perm"` is the ONLY thing that creates a real permanent pin, and the
// ONLY way an entry gets it is the user explicitly running
// `--pin-forever` -- no automatic path (a fresh pick, a manual `/persona`
// switch, a cascade) ever writes it. Human-legible by design: glance at
// the raw JSON and a locked entry is obviously different from a normal
// one, no second boolean field to cross-reference.
//
// `rotateAfterDays` is a vestigial field from the removed auto-rotation
// feature (see below) -- still written on every switch/pin for schema
// continuity, but nothing reads it anymore. Safe to strip from the schema
// entirely in a future cleanup; not urgent on its own.
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
// Manual override (the `persona` skill) resolves a fuzzy name/nickname to
// an exact filename itself, then calls `--switch <file> [path]` here to do
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
// `ListAgents` + `--set-session-name` (see the `persona` skill's own
// self-register step). This script never calls `SendMessage`/`ListAgents`
// itself, only stores and looks up the mapping the assistant supplies.
//
// `cwd` is the worktree's real (symlink-resolved, platform-normalized)
// absolute path -- stable for that worktree's whole life, the natural
// registry key.
//
// `nickname` starts `null`, exists purely to resolve a collision between
// two entries sharing the same `file` (see `needsNickname`) -- the
// earliest-`firstPinnedAt` holder never needs one. `dropStaleNicknames`
// clears a nickname automatically, on every registry read that touches it,
// once the collision that required it is gone (the other side left the
// registry, or a cascade unified everyone onto the same persona/nickname
// slate) -- nicknames track a live collision, not a permanent identity.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

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
function normalizePlatformPath(p) {
  return process.platform === "win32" ? p.toLowerCase() : p;
}

// Real bug, caught live 2026-08-28: without this, two sessions started in
// the exact same directory could get `process.cwd()` back with different
// drive-letter casing (depending on how the shell/parent process launched
// them), producing two DIFFERENT registry entries for one real worktree.
function resolveCwd() {
  let real;
  try {
    real = fs.realpathSync(process.cwd());
  } catch {
    real = process.cwd();
  }
  return normalizePlatformPath(real);
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

// Pure: the small random rotation window, 2-4 days inclusive, rolled once
// per assignment and held stable -- "small random but still a random," not
// re-rolled on every check. Exported for testing.
function randomRotateAfterDays(randomFn = Math.random) {
  return 2 + Math.floor(randomFn() * 3);
}

// Pure: lazy one-time migration for an entry created before the 2026-08-30
// rotation rework -- identified by the absence of `rotateAfterDays` (every
// entry written by the current code always has one, so its absence is
// itself the "this predates the feature" signal, no separate version field
// needed). Preserves the OLD `pinnedAt` as the new immutable
// `firstPinnedAt` (that's real history worth keeping), then resets the
// mutable `pinnedAt` to `nowIsoStr` -- the "not retroactive" requirement:
// nobody's already-elapsed pin age counts toward an immediate rotation the
// moment this ships. A forever-pinned entry ("Perm"/"Fixed") keeps that
// literal value untouched, just gains `firstPinnedAt`/`rotateAfterDays` for
// completeness (rotateAfterDays is inert while forever-pinned, but every
// entry having one keeps the shape uniform). Exported for testing.
function normalizeEntry(entry, nowIsoStr, randomFn = Math.random) {
  if (entry.rotateAfterDays != null) return entry;
  const migrated = { ...entry };
  if (migrated.firstPinnedAt == null) {
    migrated.firstPinnedAt = migrated.pinnedAt;
  }
  if (!isForeverPinned(migrated) && typeof migrated.pinnedAt === "string") {
    migrated.pinnedAt = nowIsoStr;
  }
  migrated.rotateAfterDays = randomRotateAfterDays(randomFn);
  return migrated;
}

function readNormalizedRegistry(nowIsoStr) {
  return readRegistry().map((e) => normalizeEntry(e, nowIsoStr));
}

// Pure: does this entry need a nickname? Only true when some OTHER entry
// holds the SAME persona (`file`) with an EARLIER `firstPinnedAt` -- i.e.
// this worktree is a later duplicate of a persona already claimed
// elsewhere. Uses `firstPinnedAt` (immutable), not `pinnedAt` (which now
// resets on every rotation/switch and would otherwise scramble precedence
// over time) -- falls back to `pinnedAt` only for an entry that somehow
// still lacks `firstPinnedAt` (shouldn't happen post-`normalizeEntry`, kept
// defensive). The first-ever holder of a persona never needs a nickname, no
// matter how many sessions or rotations it racks up -- nicknames exist
// purely to resolve a collision, not to reward tenure. Exported for
// testing.
function needsNickname(entry, allEntries) {
  const anchor = (e) => e.firstPinnedAt ?? e.pinnedAt;
  return allEntries.some(
    (e) => e.cwd !== entry.cwd && e.file === entry.file && anchor(e) < anchor(entry),
  );
}

// Pure: clears `nickname` on any entry that no longer actually needs one --
// e.g. the collision partner left the registry, or a cascade just unified
// the whole family onto one persona/nickname slate. Nicknames track a LIVE
// collision, not a permanent identity, so this runs on every registry
// read/write path that touches nicknames at all. Exported for testing.
function dropStaleNicknames(entries) {
  return entries.map((e) => (e.nickname && !needsNickname(e, entries) ? { ...e, nickname: null } : e));
}

// Pure: extract nickname candidates from a persona file's own "##
// Instance nicknames" section, in the order they're listed there --
// matches "- **"Text"**" bullet lines, the format every current persona
// file uses. Returns [] if the section or no matching bullets are found;
// `pickNickname` below falls back to a generic scheme when that happens.
// Exported for testing.
function extractNicknameCandidates(content) {
  // Deliberately NOT using the `m` flag: with it, `$` matches the end of
  // EVERY line, not just the end of the string, which made the lazy
  // `[\s\S]*?` stop after the section's very first line every time (a real
  // bug caught live while writing this function's own test). Without `m`,
  // `$` means "end of the whole string" -- exactly the fallback boundary
  // wanted when the section happens to be the last thing in the file.
  const sectionMatch = content.match(/##\s*Instance nicknames[\s\S]*?(?=\n##\s|$)/i);
  if (!sectionMatch) return [];
  const re = /^-\s*\*\*"([^"]+)"\*\*/gm;
  const candidates = [];
  let m;
  while ((m = re.exec(sectionMatch[0]))) candidates.push(m[1]);
  return candidates;
}

// Themed fallback callsigns (added 2026-09-01, BinaryMisfit's own request --
// "Instance 2"/"Instance 3" read as a bug report, not a nickname). Keyed by
// the persona's own EXACT style name, lowercased -- NOT just its first
// letter (real feedback, same day: Alexia and Aphrodite both start with
// "A", and a letter-keyed pool would have handed a stray "Apex" to
// whichever of the two collided first, leaving two entirely different
// characters both plausibly wearing the same word). Every pool still
// happens to be initial-matched for callsign flavor, but no two personas'
// pools share an actual word, even when their letters collide. A persona
// with no pool of its own yet falls through to GENERIC_FALLBACK_POOL
// rather than crashing.
const NICKNAME_FALLBACK_POOLS_BY_STYLE = {
  hailey: ["Halo", "Harbor", "Havoc", "Haze", "Hex", "Hollow", "Huxley", "Hyperion", "Hydra", "Helix"],
  aphrodite: ["Apex", "Astra", "Atlas", "Axiom", "Aegis", "Arcade", "Anomaly", "Ansible", "Amp", "Aeon"],
  alexia: ["Ace", "Arrow", "Anchor", "Alpha", "Arena", "Ally", "Aurora", "Argus", "Anthem", "Ascent"],
  callie: ["Cipher", "Comet", "Cascade", "Circuit", "Cobalt", "Cortex", "Cinder", "Crux", "Catalyst", "Chrome"],
};
const GENERIC_FALLBACK_POOL = ["Echo", "Vector", "Signal", "Relay", "Pulse", "Drift", "Nomad", "Zero", "Delta", "Nexus"];

// Pure: pick a themed fallback callsign for `style` (matched by its own
// exact name, not just its first letter -- see the pool comment above)
// that isn't already taken -- randomized within the pool, not
// first-available, so a repeat viewing of the same collision doesn't
// always land on the same word. Once the WHOLE themed pool is taken too
// (only reachable with a lot of simultaneous collisions on one persona),
// suffixes a number onto a randomly-picked pool word rather than falling
// back to a bare, flavorless label. Exported for testing.
function pickFallbackCallsign(style, takenNicknames, randomFn = Math.random) {
  const key = (style || "").trim().toLowerCase();
  const pool = NICKNAME_FALLBACK_POOLS_BY_STYLE[key] || GENERIC_FALLBACK_POOL;
  const free = pool.filter((name) => !takenNicknames.has(name));
  if (free.length > 0) return free[Math.floor(randomFn() * free.length)];
  const base = pool[Math.floor(randomFn() * pool.length)];
  let n = 2;
  while (takenNicknames.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// Pure: pick the first candidate not already in use by another entry
// sharing the same persona file; falls back to a themed callsign
// (`pickFallbackCallsign`) if every named candidate is taken or none were
// found at all -- only reachable once every flavor nickname a persona
// actually offers is simultaneously in use, an edge case worth degrading
// through gracefully rather than crashing on. Exported for testing.
function pickNickname(candidates, takenNicknames, style, randomFn = Math.random) {
  for (const c of candidates) {
    if (!takenNicknames.has(c)) return c;
  }
  return pickFallbackCallsign(style, takenNicknames, randomFn);
}

// Structural fix (2026-09-01) for a real, repeatedly-observed bug: nickname
// assignment used to be entirely prompt-driven -- the hook told a fresh
// session to claim one in-character and persist it itself via
// `--set-nickname`, same turn. That's pure LLM-compliance with no
// code-level enforcement, and it silently failed more than once in
// practice (see `buildNicknameNote`'s own history/git blame). This
// function assigns AND records the nickname directly, in the registry
// write path itself, before any session ever sees a note about it -- an
// opening beat then narrates a decision that's already been made, rather
// than being trusted to make and persist one correctly on its very first
// turn. Pure: returns a NEW entries array with the target entry's
// `nickname` filled in, or the SAME array reference unchanged if no
// assignment was needed (already nicknamed, or no collision exists).
// Exported for testing.
function assignNicknameIfNeeded(entries, cwd, content) {
  const entry = findEntry(entries, cwd);
  if (!entry || entry.nickname || !needsNickname(entry, entries)) return entries;
  const candidates = extractNicknameCandidates(content);
  const taken = new Set(
    entries.filter((e) => e.file === entry.file && e.cwd !== cwd && e.nickname).map((e) => e.nickname),
  );
  const chosen = pickNickname(candidates, taken, entry.style);
  return entries.map((e) => (e.cwd === cwd ? { ...e, nickname: chosen } : e));
}

// Pure: builds the SessionStart `additionalContext` note about nickname
// status for `entry`, against the CURRENT `entries` (post-push, so a
// brand-new entry is already included and will see its own real
// collisions). Real bug this replaces (2026-08-30): the brand-new-cwd path
// used to hardcode "No nickname needed this session" for BOTH the inherited
// (worktree-sibling) and genuinely-new-repo cases, unconditionally, without
// ever calling `needsNickname` -- which is wrong every time an inherited
// sibling's family root is already live (always true whenever `family.length
// > 0`, i.e. every real case that path exists to handle) or a freshly
// random-picked persona happens to already be live on an unrelated repo.
// Observed live: `xls-playthrough`'s first-ever session told the user "no
// nickname needed, still the only worktree holding this face" while a
// same-persona root worktree had been live for hours -- the hook's own
// hardcoded text, not a flaky model-generated greeting. `context` is just
// flavor text (why this entry exists) and never affects the actual
// true/false branch, which always defers to `needsNickname`. Exported for
// testing.
function buildNicknameNote(entry, entries, context) {
  if (entry.nickname) {
    return `\n\n---\n**Worktree instance note (from pick-persona.js):** this worktree's instance is already nicknamed "${entry.nickname}" -- assigned and recorded automatically, nothing left to persist. State both the persona name and the nickname in this session's opening beat (e.g. "${entry.style} -- ${entry.nickname}, checking in"), organically, in-character.\n`;
  }
  if (needsNickname(entry, entries)) {
    // Should not normally be reachable -- `assignNicknameIfNeeded` runs
    // before this in every real call path and always produces a value
    // (see its own comment). Surfaced plainly rather than pretending
    // there's no collision, in case some future call path forgets to call
    // it first.
    return `\n\n---\n**Worktree instance note (from pick-persona.js):** ${entry.style} is also pinned to another worktree, and this one's the later duplicate${context ? ` (${context})` : ""}, but no nickname got auto-assigned -- that's a bug in pick-persona.js itself (a call path skipped \`assignNicknameIfNeeded\`), not something to fix by talking about it in character. Run \`node ~/.claude/scripts/pick-persona.js --set-nickname "<name>"\` from this worktree's own directory (${entry.cwd}) as a manual workaround, and flag this to the user as a real bug to look at.\n`;
  }
  return `\n\n---\n**Worktree instance note (from pick-persona.js):** ${entry.style}${context ? ` (${context})` : ""} -- no other worktree currently holds this persona, so no nickname is needed right now. If that changes later (another worktree rotates/switches onto ${entry.style}), one will be auto-assigned and recorded then, no action needed.\n`;
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
// including the trigger entry itself (redundant for it, harmless), and
// clears everyone's nickname -- it's a new shared assignment for the whole
// family, so any existing nickname is stale by construction; the next
// contact with each entry re-flags/re-claims one organically via
// needsNickname if a collision still applies. No-op (returns entries
// unchanged) when repoId is null.
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
    e.repoId === repoId && !isForeverPinned(e) ? { ...e, file, style, nickname: null } : e,
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
  return {
    cwd: entry.cwd,
    style: entry.style,
    file: entry.file,
    nickname: entry.nickname,
    sessionName: entry.sessionName,
  };
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
// `setSessionName`/`setNickname`/`pinForever`/`switchPersona` all used to
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
  // Unlike main()'s automatic SessionStart pick, ensureEntry does NOT
  // refuse a non-git cwd (repoId null, no family) -- every caller here is
  // an explicit, deliberate CLI invocation (--switch, --set-nickname,
  // --set-session-name, --pin-forever), not a hook firing silently just
  // because a session happened to launch somewhere. User design call,
  // 2026-08-31: a non-project location should never get a persona picked
  // FOR it automatically, but should still be able to ask for one via the
  // script -- and once asked for, it's an entry like any other (rotation-
  // eligible, nicknameable, not auto-forever-pinned), not a special case.
  let pick, styleName;
  if (family.length > 0) {
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
    nickname: null,
    sessionName: null,
    repoId,
    everOpened: true,
    firstPinnedAt: now,
    pinnedAt: now,
    rotateAfterDays: randomRotateAfterDays(),
    lastSeen: now,
  };
  // Nickname resolution stays IN ensureEntry (so every caller gets a
  // collision-free entry back, not just main()'s own hook path) but
  // logging the resulting change does NOT -- ensureEntry is exercised
  // directly by unit tests against this repo's real ../output-styles/
  // directory (see its own test's comment), and it must stay free of
  // real-machine side effects like appending to the actual, non-injectable
  // ~/.claude/persona-registry.log. Callers (setNickname, setSessionName,
  // pinForever, switchPersona) log the self-heal/auto-nickname events
  // themselves, using the `healed` flag and a before/after nickname
  // comparison, right after calling this.
  const content = fs.readFileSync(path.join(stylesDir, pick), "utf8");
  const newEntries = assignNicknameIfNeeded([...entries, entry], cwd, content);
  const healedEntry = findEntry(newEntries, cwd);
  return { entries: newEntries, entry: healedEntry, healed: true };
}

// Handles `node pick-persona.js --set-nickname "<text>"` -- called by the
// assistant, from inside the worktree whose instance is claiming a
// nickname, once it's settled on one in-character. Not a SessionStart
// invocation: prints a plain confirmation, not hook JSON.
function setNickname(nickname) {
  const cwd = resolveCwd();
  const now = nowIso();
  const { entries, entry, healed } = ensureEntry(readRegistry(), cwd, now);
  if (!entry) {
    process.stderr.write(`No persona files found to self-heal a registry entry for ${cwd}.\n`);
    process.exitCode = 1;
    return;
  }
  if (healed) appendLog(now, "self-heal-new-worktree", entryLogFields(entry));
  entry.nickname = nickname;
  entry.lastSeen = now;
  writeRegistry(entries);
  appendLog(now, "set-nickname", entryLogFields(entry));
  const healedNote = healed ? " (no registry entry existed yet -- created one)" : "";
  process.stdout.write(`Nickname "${nickname}" recorded for ${cwd} (persona: ${entry.style})${healedNote}.\n`);
}

// `node pick-persona.js --list` -- human-facing table of every currently
// pinned worktree, for the user's own "which session is which persona"
// bookkeeping. Stale entries are pruned and stale nicknames dropped first so
// the listing never shows dead weight.
function listRegistry() {
  const now = nowIso();
  let entries = pruneStale(readNormalizedRegistry(now));
  entries = dropStaleNicknames(entries);
  writeRegistry(entries);
  if (entries.length === 0) {
    process.stdout.write("No worktrees pinned yet.\n");
    return;
  }
  const header = "| Persona | Worktree | Session | Family | Pinned | Last seen |";
  const sep = "| --- | --- | --- | --- | --- | --- |";
  process.stdout.write(header + "\n" + sep + "\n");
  const unresolved = [];
  for (const e of entries) {
    const personaCell = e.nickname ? `${e.style} -- ${e.nickname}` : e.style;
    const sessionCell = e.sessionName || "*(not self-registered)*";
    const siblings = findFamily(entries, e.repoId).filter((s) => s.cwd !== e.cwd);
    const familyCell = siblings.length > 0 ? `${siblings.length} sibling${siblings.length === 1 ? "" : "s"}` : "--";
    process.stdout.write(`| ${personaCell} | ${e.cwd} | ${sessionCell} | ${familyCell} | ${e.pinnedAt} | ${e.lastSeen} |\n`);
    if (!e.nickname && needsNickname(e, entries)) unresolved.push(e);
  }
  if (unresolved.length > 0) {
    process.stdout.write(
      `\nUnresolved nickname collision${unresolved.length === 1 ? "" : "s"} (claimed in a greeting but never persisted, or never claimed at all):\n`,
    );
    for (const e of unresolved) {
      process.stdout.write(`  ${e.style} at ${e.cwd} -- run --set-nickname from that worktree.\n`);
    }
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
    process.stdout.write(`  ${e.style}${e.nickname ? ` -- ${e.nickname}` : ""}: ${e.cwd}\n`);
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
  if (healed) {
    appendLog(now, "self-heal-new-worktree", entryLogFields(entry));
    if (entry.nickname) appendLog(now, "auto-nickname", entryLogFields(entry));
  }
  entry.sessionName = sessionName;
  entry.lastSeen = now;
  writeRegistry(entries);
  appendLog(now, "set-session-name", entryLogFields(entry));
  const healedNote = healed ? " (no registry entry existed yet -- created one)" : "";
  process.stdout.write(`Session name "${sessionName}" recorded for ${cwd} (persona: ${entry.style})${healedNote}.\n`);
}

// Pure: a dead sessionName is grounds to drop the WHOLE entry -- except an
// entry that has never actually had a real session yet (`everOpened ===
// false`), which only has its sessionName nulled, not removed. Returns
// `{ entries, removed, sessionNameOnlyCleared }`. Exported for testing.
function clearDeadSession(entries, sessionName) {
  const keep = [];
  const removed = [];
  const sessionNameOnlyCleared = [];
  for (const e of entries) {
    if (e.sessionName === sessionName) {
      if (e.everOpened) {
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
  const { entries: kept, removed, sessionNameOnlyCleared } = sweepDeadSessions(entries, liveNames);
  if (removed.length === 0 && sessionNameOnlyCleared.length === 0) {
    process.stdout.write("Nothing to sweep -- every entry with a sessionName on file is still live.\n");
    return;
  }
  writeRegistry(kept);
  const now = nowIso();
  for (const e of removed) {
    appendLog(now, "remove-dead-session", entryLogFields(e));
    process.stdout.write(`Removed ${e.style}${e.nickname ? ` -- ${e.nickname}` : ""} from ${e.cwd} entirely -- dead session, already opened before, so no permanent pin survives.\n`);
  }
  for (const e of sessionNameOnlyCleared) {
    appendLog(now, "clear-session-name-only", entryLogFields(e));
    process.stdout.write(`Cleared dead session from ${e.cwd} (persona: ${e.style}) but kept the pin -- it had never actually been opened yet.\n`);
  }
}

// `node pick-persona.js --clear-session-name "<name>"` -- self-healing for
// a dead peer, single target. REMOVES the whole entry (unless never
// opened), same rule as sweepDeadSessions.
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
    process.stdout.write(`Removed ${e.style}${e.nickname ? ` -- ${e.nickname}` : ""} from ${e.cwd} entirely -- dead session, already opened before, so no permanent pin survives. Next session there gets a fresh pick.\n`);
  }
  for (const e of sessionNameOnlyCleared) {
    appendLog(now, "clear-session-name-only", entryLogFields(e));
    process.stdout.write(`Cleared dead session from ${e.cwd} (persona: ${e.style}) but kept the pin -- it had never actually been opened yet.\n`);
  }
}

// Pure: match a persona/nickname string against registry entries. Matches
// case-insensitively against `style` (the persona name) OR `nickname`.
// Exported for testing.
function matchByName(entries, name) {
  const needle = name.trim().toLowerCase();
  return entries.filter(
    (e) => e.style.toLowerCase() === needle || (e.nickname && e.nickname.toLowerCase() === needle),
  );
}

// `node pick-persona.js --resolve "<name>"` -- given a persona name or
// nickname, prints every matching worktree's `sessionName` so the caller
// can pass it straight to `SendMessage`.
function resolveTarget(name) {
  const entries = pruneStale(readRegistry());
  const matches = matchByName(entries, name);
  if (matches.length === 0) {
    process.stdout.write(`No pinned worktree matches "${name}".\n`);
    return;
  }
  for (const e of matches) {
    const label = e.nickname ? `${e.style} -- ${e.nickname}` : e.style;
    if (e.sessionName) {
      process.stdout.write(`${label}: sessionName="${e.sessionName}" (${e.cwd})\n`);
    } else {
      process.stdout.write(`${label}: no sessionName on file yet -- that session hasn't self-registered (${e.cwd})\n`);
    }
  }
}

// `node pick-persona.js --reset [<path>]` -- manual, on-demand wipe.
function resetRegistry(targetPath) {
  const entries = readRegistry();
  const now = nowIso();
  if (!targetPath) {
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
  process.stdout.write(`Reset: removed ${match.style}${match.nickname ? ` -- ${match.nickname}` : ""} (${resolved}).\n`);
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
  if (healed) {
    appendLog(now, "self-heal-new-worktree", entryLogFields(entry));
    if (entry.nickname) appendLog(now, "auto-nickname", entryLogFields(entry));
  }
  entry.pinnedAt = "Perm";
  entry.lastSeen = now;
  writeRegistry(entries);
  appendLog(now, "pin-forever", entryLogFields(entry));
  const healedNote = healed ? " (no registry entry existed yet -- created one)" : "";
  process.stdout.write(`${entry.style}${entry.nickname ? ` -- ${entry.nickname}` : ""} permanently pinned at ${cwd}${healedNote} -- exempt from auto-rotation until explicitly unpinned.\n`);
}

// `node pick-persona.js --unpin-forever [<path>]` -- reverses --pin-forever.
// Back to normal, rotation-eligible, clock starting from right now (not
// retroactive to whenever it was originally pinned).
function unpinForever(targetPath) {
  const cwd = targetPath ? resolveMaybePath(targetPath) : resolveCwd();
  const now = nowIso();
  const entries = readNormalizedRegistry(now);
  const entry = findEntry(entries, cwd);
  if (!entry) {
    process.stderr.write(`No registry entry for ${cwd} -- run a normal session start here first.\n`);
    process.exitCode = 1;
    return;
  }
  entry.pinnedAt = now;
  entry.rotateAfterDays = randomRotateAfterDays();
  entry.lastSeen = now;
  writeRegistry(entries);
  appendLog(now, "unpin-forever", entryLogFields(entry));
  process.stdout.write(`${entry.style}${entry.nickname ? ` -- ${entry.nickname}` : ""} unpinned at ${cwd} -- back to normal rotation, clock starts now (not retroactive).\n`);
}

// `node pick-persona.js --switch <filename.md> [<path>]` -- the manual
// override's actual write path. The `persona` skill resolves a fuzzy
// name/nickname to an exact filename FIRST (its own step 2), then calls
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
  const content = fs.readFileSync(path.join(stylesDir, filename), "utf8");
  const styleName = parseFrontmatterName(content, path.basename(filename, ".md"));
  const genuinelyDifferent = entry.file !== filename;
  const wasForeverPinned = isForeverPinned(entry);

  entry.file = filename;
  entry.style = styleName;
  // A same-file "switch" is how a session refreshes its own stale in-memory
  // copy after a persona file's content changed on disk (see the `persona`
  // skill's "notify-on-global-persona-update" step) -- it must never be able
  // to silently un-pin a forever-pinned worktree. Only a GENUINE persona
  // change resets pinnedAt away from "Perm"/"Fixed"; a refresh onto the same
  // file leaves an existing forever-pin exactly as it was. Real gap, caught
  // live 2026-09-02: digital-homelab-4c deliberately avoided --switch after
  // a content-only refresh specifically because this guard didn't exist yet.
  if (genuinelyDifferent || !wasForeverPinned) {
    entry.pinnedAt = now;
    entry.rotateAfterDays = randomRotateAfterDays();
  }
  entry.lastSeen = now;
  if (genuinelyDifferent) entry.nickname = null;

  if (genuinelyDifferent && entry.repoId) {
    entries = cascadeFamilyPersona(entries, entry.repoId, filename, styleName);
  }
  entries = dropStaleNicknames(entries);

  // Structural nickname fix (2026-09-01): a switch (or the cascade it just
  // triggered) can create a fresh collision this worktree's own entry --
  // assign and persist a nickname for it right here instead of leaving it
  // to a prompt instruction.
  entries = assignNicknameIfNeeded(entries, cwd, content);
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
    resetRegistry(process.argv[resetFlagIndex + 1]);
    return;
  }

  const setNicknameFlagIndex = process.argv.indexOf("--set-nickname");
  if (setNicknameFlagIndex !== -1) {
    const nickname = process.argv[setNicknameFlagIndex + 1];
    if (!nickname) {
      process.stderr.write("--set-nickname requires a value.\n");
      process.exitCode = 1;
      return;
    }
    setNickname(nickname);
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

  if (!fs.existsSync(stylesDir)) {
    process.exit(0);
  }
  const files = fs.readdirSync(stylesDir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    process.exit(0);
  }

  const cwd = resolveCwd();
  const now = nowIso();
  let entries = pruneStale(readNormalizedRegistry(now));
  let entry = findEntry(entries, cwd);

  let nicknameNote = "";

  if (entry) {
    entry.lastSeen = now;
    // Every SessionStart in an existing worktree means a brand-new harness
    // process, so any sessionName recorded by a PREVIOUS session here is
    // already dead -- self-registration is what re-stamps it, but that's
    // skill-driven, not guaranteed to fire every session.
    entry.sessionName = null;
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

    entries = dropStaleNicknames(entries);
    // Re-find `entry` -- cascadeFamilyPersona/dropStaleNicknames both return
    // NEW entry objects via .map, so the local `entry` reference above may
    // now be stale even though its cwd hasn't changed.
    entry = findEntry(entries, cwd);

    // Structural nickname fix (2026-09-01): assign and persist a collision
    // nickname right here, in the write path, rather than leaving it to a
    // prompt instruction the session might not follow through on. See
    // `assignNicknameIfNeeded`'s own comment.
    const currentContent = fs.existsSync(path.join(stylesDir, entry.file))
      ? fs.readFileSync(path.join(stylesDir, entry.file), "utf8")
      : "";
    const nicknameBefore = entry.nickname;
    entries = assignNicknameIfNeeded(entries, cwd, currentContent);
    entry = findEntry(entries, cwd);
    if (entry.nickname !== nicknameBefore) {
      appendLog(now, "auto-nickname", entryLogFields(entry));
    }

    nicknameNote = buildNicknameNote(entry, entries);
    appendLog(now, "session-start", entryLogFields(entry));
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

    // Never AUTOMATICALLY register a cwd that isn't inside a git repo at
    // all AND has no existing family to inherit from -- real incident
    // (2026-08-31): `c:\users\diago`, the bare Windows home directory, got
    // permanently pinned to a persona simply because a session happened to
    // launch with its cwd there before ever `cd`-ing into a real project;
    // removing that entry by hand did nothing because the next incidental
    // session there just recreated it. This guard is deliberately ONLY
    // here, in the automatic SessionStart pick path -- a bare home
    // directory should never get a persona picked FOR it, but the user can
    // still explicitly ask for one via `--switch` (see ensureEntry's own
    // comment on why it does NOT carry this same guard) -- explicit intent
    // is exactly what distinguishes an incidental location from a real one
    // here. A cwd with a real repoId but no family yet is still a
    // legitimate brand-new project and is unaffected by this guard.
    if (!repoId && family.length === 0) {
      process.exit(0);
    }

    let pick, styleName, inherited;
    if (family.length > 0) {
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
      nickname: null,
      sessionName: null,
      repoId,
      everOpened: true,
      firstPinnedAt: now,
      pinnedAt: now,
      rotateAfterDays: randomRotateAfterDays(),
      lastSeen: now,
    };
    entries.push(entry);
    appendLog(now, "new-worktree", { ...entryLogFields(entry), inherited });

    // Structural nickname fix (2026-09-01) -- same as the existing-entry
    // branch above: assign and persist a collision nickname right here
    // instead of leaving it to a prompt instruction.
    const newEntryContent = fs.readFileSync(path.join(stylesDir, entry.file), "utf8");
    entries = assignNicknameIfNeeded(entries, cwd, newEntryContent);
    entry = findEntry(entries, cwd);
    if (entry.nickname) {
      appendLog(now, "auto-nickname", entryLogFields(entry));
    }

    nicknameNote = buildNicknameNote(
      entry,
      entries,
      inherited ? "git-worktree sibling, inherited its family's current persona" : "freshly random-picked",
    );
  }

  writeRegistry(entries);

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

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: content + rotationNote + nicknameNote,
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
  needsNickname,
  buildNicknameNote,
  matchByName,
  computeRepoId,
  computeSuperprojectCwd,
  findFamily,
  ensureEntry,
  clearDeadSession,
  sweepDeadSessions,
  isForeverPinned,
  randomRotateAfterDays,
  normalizeEntry,
  dropStaleNicknames,
  cascadeFamilyPersona,
  resolveMaybePath,
  extractNicknameCandidates,
  pickFallbackCallsign,
  pickNickname,
  assignNicknameIfNeeded,
  pruneLogLines,
  formatLogLine,
  entryLogFields,
};

if (require.main === module) {
  main();
}
