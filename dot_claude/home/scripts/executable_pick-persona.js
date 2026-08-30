#!/usr/bin/env node
"use strict";

// GLOBAL Claude Code tooling (promoted 2026-08-28 from an X-Lifestyle-only
// project hook to `~/.claude/`) -- authored/tracked here in the xls repo,
// under `personas/` at the repo root (deliberately NOT `.claude/scripts/`,
// `.claude/output-styles/`, or `.claude/skills/` -- those paths are ones
// Claude Code auto-discovers, so a copy sitting there would make xls's own
// sessions see a project-level output-style/skill that SHADOWS the global
// one per Claude Code's own "project wins over global" precedence, silently
// defeating the whole point of promoting this to global in the first
// place). `personas/` mirrors the deploy target's own structure 1:1
// (`personas/output-styles/` -> `~/.claude/output-styles/`,
// `personas/skills/persona/` -> `~/.claude/skills/persona/`,
// `personas/scripts/` -> `~/.claude/scripts/`) so the sync script's mapping
// is a straight copy, no renaming. Deploy via
// `npm run sync-global-persona-config` from the xls repo root after any
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
// again by anything (not a manual switch, not auto-rotation, not a
// cascade). It exists purely to answer "which family member came first" --
// used by both `needsNickname` (nickname precedence) and
// `isEligibleForOwnRotation` (root-of-family determination) -- because
// `pinnedAt` itself now resets on every rotation/switch and can no longer
// be trusted for "who was here first."
//
// `pinnedAt` is now the MUTABLE rotation anchor, and deliberately loose-typed
// (explicit user design call, 2026-08-30: "this is not a db file, we have
// design authority") -- either a real ISO timestamp (this entry is
// rotation-eligible, clock starts counting from this moment) or the literal
// string `"Perm"` (or `"Fixed"`, recognized as a synonym) meaning
// permanently, explicitly locked -- exempt from auto-rotation until
// `--unpin-forever` reverses it. `"Perm"` is the ONLY thing that creates a
// real permanent pin, and the ONLY way an entry gets it is the user
// explicitly running `--pin-forever` -- no automatic path (a fresh pick, a
// manual `/persona` switch, a cascade) ever writes it. Human-legible by
// design: glance at the raw JSON and a locked entry is obviously different
// from a normal one, no second boolean field to cross-reference.
//
// `rotateAfterDays` is a small integer, uniformly 2-4, rolled ONCE per
// assignment (first pick, each rotation, each manual switch, `--unpin-
// forever`) and held stable until the next one -- "small random but still a
// random," not re-rolled on every check. See `needsRotation`.
//
// Auto-rotation: once `rotateAfterDays` days have elapsed since `pinnedAt`
// (and the entry isn't forever-pinned), the NEXT SessionStart there swaps to
// a genuinely different persona -- pool excludes only the entry's OWN
// current file, nothing else; two entries landing on the same persona is
// normal and resolved via nickname the same way any other collision is, not
// something rotation avoids. Only the ROOT of a worktree family (earliest
// `firstPinnedAt`) or a standalone entry is independently eligible -- a
// non-root sibling never rolls its own rotation, it only ever follows via
// cascade (see `cascadeFamilyPersona`) when a family member's persona
// actually changes, whether by rotation or by manual switch. "Not
// retroactive" (explicit user requirement, 2026-08-30): `normalizeEntry`
// resets `pinnedAt` to right now the first time an old-format entry
// (missing `rotateAfterDays`) is touched, specifically so nobody's
// already-elapsed history counts toward an immediate rotation the moment
// this feature ships.
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

// Pure: is this entry independently eligible to roll its own auto-rotation,
// or does it only ever follow via cascade? Same "earliest firstPinnedAt
// wins" precedence as needsNickname, just answering a different question --
// a standalone entry (no family) is always its own root. Exported for
// testing.
function isEligibleForOwnRotation(entry, allEntries) {
  if (!entry.repoId) return true;
  const anchor = (e) => e.firstPinnedAt ?? e.pinnedAt;
  return !allEntries.some((e) => e.repoId === entry.repoId && e.cwd !== entry.cwd && anchor(e) < anchor(entry));
}

// Pure: has this entry's rotation window elapsed? False for a forever-pin,
// false for an entry that's never actually been opened (nothing to rotate
// yet), false if `pinnedAt` isn't a real parseable timestamp. Exported for
// testing.
function needsRotation(entry, nowIsoStr) {
  if (!entry.everOpened) return false;
  if (isForeverPinned(entry)) return false;
  if (typeof entry.pinnedAt !== "string") return false;
  const anchorMs = Date.parse(entry.pinnedAt);
  const nowMs = Date.parse(nowIsoStr);
  if (Number.isNaN(anchorMs) || Number.isNaN(nowMs)) return false;
  const days = entry.rotateAfterDays ?? 3;
  return (nowMs - anchorMs) / 86400000 >= days;
}

// Pure: pick a rotation target -- excludes ONLY the entry's own current
// file, nothing else. Unlike `pickForNewWorktree` (first-pick diversity),
// rotation freely lands on a persona already live elsewhere; a resulting
// collision is normal and resolved via nickname like any other (explicit
// user call, 2026-08-30: "the only time this becomes a problem is when we
// run out of nicknames"). Exported for testing.
function pickRotationTarget(currentFile, files, randomFn = Math.random) {
  const candidates = files.filter((f) => f !== currentFile);
  const pool = candidates.length > 0 ? candidates : files;
  return pool[Math.floor(randomFn() * pool.length)];
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

// Handles `node pick-persona.js --set-nickname "<text>"` -- called by the
// assistant, from inside the worktree whose instance is claiming a
// nickname, once it's settled on one in-character. Not a SessionStart
// invocation: prints a plain confirmation, not hook JSON.
function setNickname(nickname) {
  const cwd = resolveCwd();
  const entries = readRegistry();
  const entry = findEntry(entries, cwd);
  if (!entry) {
    process.stderr.write(`No registry entry for ${cwd} -- run a normal session start here first.\n`);
    process.exitCode = 1;
    return;
  }
  entry.nickname = nickname;
  entry.lastSeen = nowIso();
  writeRegistry(entries);
  process.stdout.write(`Nickname "${nickname}" recorded for ${cwd} (persona: ${entry.style}).\n`);
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
  for (const e of entries) {
    const personaCell = e.nickname ? `${e.style} -- ${e.nickname}` : e.style;
    const sessionCell = e.sessionName || "*(not self-registered)*";
    const siblings = findFamily(entries, e.repoId).filter((s) => s.cwd !== e.cwd);
    const familyCell = siblings.length > 0 ? `${siblings.length} sibling${siblings.length === 1 ? "" : "s"}` : "--";
    process.stdout.write(`| ${personaCell} | ${e.cwd} | ${sessionCell} | ${familyCell} | ${e.pinnedAt} | ${e.lastSeen} |\n`);
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
  process.stdout.write(`Removed ${removed.length} entr${removed.length === 1 ? "y" : "ies"} (worktree no longer on disk):\n`);
  for (const e of removed) {
    process.stdout.write(`  ${e.style}${e.nickname ? ` -- ${e.nickname}` : ""}: ${e.cwd}\n`);
  }
}

// `node pick-persona.js --set-session-name "<name>"` -- self-registration,
// so a persona can be targeted BY NAME across sessions, not just listed.
function setSessionName(sessionName) {
  const cwd = resolveCwd();
  const entries = readRegistry();
  const entry = findEntry(entries, cwd);
  if (!entry) {
    process.stderr.write(`No registry entry for ${cwd} -- run a normal session start here first.\n`);
    process.exitCode = 1;
    return;
  }
  entry.sessionName = sessionName;
  entry.lastSeen = nowIso();
  writeRegistry(entries);
  process.stdout.write(`Session name "${sessionName}" recorded for ${cwd} (persona: ${entry.style}).\n`);
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
  for (const e of removed) {
    process.stdout.write(`Removed ${e.style}${e.nickname ? ` -- ${e.nickname}` : ""} from ${e.cwd} entirely -- dead session, already opened before, so no permanent pin survives.\n`);
  }
  for (const e of sessionNameOnlyCleared) {
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
  for (const e of removed) {
    process.stdout.write(`Removed ${e.style}${e.nickname ? ` -- ${e.nickname}` : ""} from ${e.cwd} entirely -- dead session, already opened before, so no permanent pin survives. Next session there gets a fresh pick.\n`);
  }
  for (const e of sessionNameOnlyCleared) {
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
  if (!targetPath) {
    writeRegistry([]);
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
  process.stdout.write(`Reset: removed ${match.style}${match.nickname ? ` -- ${match.nickname}` : ""} (${resolved}).\n`);
}

// `node pick-persona.js --pin-forever [<path>]` -- the ONLY way an entry
// becomes genuinely immune to auto-rotation. No automatic path (fresh pick,
// manual switch, cascade) ever sets this -- it's a deliberate, one-off,
// human-only action. No path: targets the current cwd's own entry.
function pinForever(targetPath) {
  const cwd = targetPath ? resolveMaybePath(targetPath) : resolveCwd();
  const now = nowIso();
  const entries = readNormalizedRegistry(now);
  const entry = findEntry(entries, cwd);
  if (!entry) {
    process.stderr.write(`No registry entry for ${cwd} -- run a normal session start here first.\n`);
    process.exitCode = 1;
    return;
  }
  entry.pinnedAt = "Perm";
  entry.lastSeen = now;
  writeRegistry(entries);
  process.stdout.write(`${entry.style}${entry.nickname ? ` -- ${entry.nickname}` : ""} permanently pinned at ${cwd} -- exempt from auto-rotation until explicitly unpinned.\n`);
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
  let entries = readNormalizedRegistry(now);
  const entry = findEntry(entries, cwd);
  if (!entry) {
    process.stderr.write(`No registry entry for ${cwd} -- run a normal session start here first.\n`);
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

  entry.file = filename;
  entry.style = styleName;
  entry.pinnedAt = now;
  entry.rotateAfterDays = randomRotateAfterDays();
  entry.lastSeen = now;
  if (genuinelyDifferent) entry.nickname = null;

  if (genuinelyDifferent && entry.repoId) {
    entries = cascadeFamilyPersona(entries, entry.repoId, filename, styleName);
  }
  entries = dropStaleNicknames(entries);

  writeRegistry(entries);
  const siblings = findFamily(entries, entry.repoId).filter((e) => e.cwd !== cwd);
  const updatedSiblings = siblings.filter((e) => e.file === filename);
  const skippedSiblings = siblings.length - updatedSiblings.length;
  let cascadeNote = "";
  if (genuinelyDifferent && updatedSiblings.length > 0) {
    cascadeNote = ` -- cascaded to ${updatedSiblings.length} sibling worktree${updatedSiblings.length === 1 ? "" : "s"}`;
  }
  if (genuinelyDifferent && skippedSiblings > 0) {
    cascadeNote += `${cascadeNote ? "," : " --"} skipped ${skippedSiblings} forever-pinned sibling${skippedSiblings === 1 ? "" : "s"}`;
  }
  process.stdout.write(`Switched ${cwd} to ${styleName}${cascadeNote}. Rotation clock reset -- not a permanent pin.\n`);
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
  let rotationNote = "";

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

    // Auto-rotation (2026-08-30) -- only the root of a worktree family, or a
    // standalone entry, is independently eligible; see
    // isEligibleForOwnRotation's own comment.
    if (isEligibleForOwnRotation(entry, entries) && needsRotation(entry, now)) {
      const newFile = pickRotationTarget(entry.file, files);
      const newContent = fs.readFileSync(path.join(stylesDir, newFile), "utf8");
      const newStyle = parseFrontmatterName(newContent, path.basename(newFile, ".md"));
      const oldStyle = entry.style;
      entry.file = newFile;
      entry.style = newStyle;
      entry.pinnedAt = now;
      entry.rotateAfterDays = randomRotateAfterDays();
      entry.nickname = null;
      if (entry.repoId) {
        entries = cascadeFamilyPersona(entries, entry.repoId, newFile, newStyle);
      }
      rotationNote = `\n\n---\n**Worktree instance note (from pick-persona.js):** this worktree's persona just auto-rotated from ${oldStyle} to ${newStyle} (its rotation window elapsed). Open this session in character as ${newStyle}, not ${oldStyle}.\n`;
    }

    entries = dropStaleNicknames(entries);
    // Re-find `entry` -- cascadeFamilyPersona/dropStaleNicknames both return
    // NEW entry objects via .map, so the local `entry` reference above may
    // now be stale even though its cwd hasn't changed.
    entry = findEntry(entries, cwd);

    if (entry.nickname) {
      nicknameNote = `\n\n---\n**Worktree instance note (from pick-persona.js):** this worktree's instance is already nicknamed "${entry.nickname}". State both the persona name and the nickname in this session's opening beat (e.g. "${entry.style} -- ${entry.nickname}, checking in").\n`;
    } else if (needsNickname(entry, entries)) {
      nicknameNote = `\n\n---\n**Worktree instance note (from pick-persona.js):** ${entry.style} is also pinned to another worktree, and this one's the later duplicate -- it needs a nickname to stay distinguishable; the other worktree (the original holder) does not. This session's opening beat should organically claim one, in-character, from this persona file's own "Instance nicknames" section (or a close riff on that flavor) -- not a mechanical announcement. Once settled, persist it by running \`node ~/.claude/scripts/pick-persona.js --set-nickname "<chosen nickname>"\` from this worktree's own directory (${cwd}).\n`;
    }
  } else {
    // A brand-new cwd: is this a new git-worktree SIBLING of a repo we
    // already track, or a genuinely new/unrelated repo? A sibling inherits
    // its family's CURRENT persona automatically -- it is NOT a fresh
    // random pick, it's the same character showing up in a second physical
    // location of the SAME project (and reflects whatever that family has
    // most recently rotated/switched to, since it reads the root's live
    // `file`/`style`). A genuinely new repo still random-picks from the
    // diversity pool exactly as before.
    const repoId = computeRepoId(cwd);
    const family = findFamily(entries, repoId);
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
    nicknameNote = inherited
      ? `\n\n---\n**Worktree instance note (from pick-persona.js):** this worktree is a git-worktree sibling of a repo already pinned to ${styleName} -- inherited automatically, not randomly picked, since it's the same project. No nickname needed this session -- that starts from the second session onward, same as any other collision.\n`
      : `\n\n---\n**Worktree instance note (from pick-persona.js):** this worktree was just pinned to ${styleName} for the first time. No nickname needed this session -- that starts from the second session onward.\n`;
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
  matchByName,
  computeRepoId,
  findFamily,
  clearDeadSession,
  sweepDeadSessions,
  isForeverPinned,
  randomRotateAfterDays,
  normalizeEntry,
  dropStaleNicknames,
  isEligibleForOwnRotation,
  needsRotation,
  pickRotationTarget,
  cascadeFamilyPersona,
  resolveMaybePath,
};

if (require.main === module) {
  main();
}
