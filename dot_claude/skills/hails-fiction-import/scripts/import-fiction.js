#!/usr/bin/env node
"use strict";

// Mechanical half of the fiction-import skill -- dedup against
// import-register.md, move a staged fiction-export file into the real
// archive, and write the register's own row/detail block atomically.
// Judgment (canon deltas, theme deltas, what belongs in a mood/summary/
// fadeOut marker, what quote earns an index.md entry) is deliberately NOT
// here -- that's the invoking Claude's own read, done in the skill's
// instructions, same split fiction-export already draws between this
// script and the skill file that calls it.
//
// Built by Hailey (secretary-pool), 2026-09-03, mechanism half of TODO-78
// (xls) -- Callie owns the canon/theme delta criteria that plug in around
// this as the skill's own steps 3-4; this only ever does steps 1/2/5's
// deterministic bookkeeping.
//
// Usage:
//   node import-fiction.js --list-staged                        # unimported whole-session staged files, cross-referenced
//   node import-fiction.js --list-drafts                        # drafted scenes awaiting custodian clearance, per ADR-0006
//   node import-fiction.js --check <session-id>                 # already imported?
//   node import-fiction.js --archive <path>                      # move a file (staged OR, per ADR-0006, a cleared draft) into raw/<persona>/, print destination
//
// Per ADR-0006 (2026-09-05): the invoking skill now reads a whole-session
// staged file, decides scene boundaries itself, and writes each scene
// directly (via its own Write tool, not a script call -- same as
// fiction-export already writes staged files by hand) into
// ~/.claude/fiction-import-drafts/<Persona>/<basename>. Only after the
// custodian (or the persona's own nominated reviewer, for her custodian's
// scenes) clears it does --archive promote that draft into raw/ -- this
// script draws no distinction between "staged" and "draft" beyond which
// directory a path happens to live in; the gate itself is a human/persona
// judgment call, not something this script enforces.
//   node import-fiction.js --next-id                             # next free IMPORT-N
//   node import-fiction.js --write-row --id IMPORT-3 --date <iso> --transcripts <id[,id...]> --persona <Persona> --scenes <n> --canon <yes|no> --themes <yes|no> --marker <yes|no> --status <Complete|Partial|Failed> --detail-file <path>

const fs = require("fs");
const path = require("path");
const os = require("os");

// Fixed, deliberately single-host path -- same convention every persona
// file's own "Canon register check" and fiction-export's find-sessions.js
// already use. x-lifestyle-research is a private submodule that won't
// exist on every machine this runs on; check existence before trusting it,
// never fail or fabricate when it's absent.
const RESEARCH_DIR = "d:\\source\\xcl\\xls\\research\\x-lifestyle-research";
const IMPORT_REGISTER_PATH = path.join(RESEARCH_DIR, "import-register.md");
const STAGING_DIR = path.join(os.homedir(), ".claude", "fiction-export-staging");
// Per ADR-0006 (2026-09-05): a scene drafted from a whole-session staged
// file lands here, NOT in raw/, until the custodian clearance gate passes
// -- separate from STAGING_DIR (whole unreviewed sessions) so "drafted,
// awaiting clearance" and "not yet even read" are two distinguishable
// states, never conflated as one undifferentiated pile.
const DRAFTS_DIR = path.join(os.homedir(), ".claude", "fiction-import-drafts");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

function writeFileAtomic(targetPath, content, writeFileFn = fs.writeFileSync) {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeFileFn(tmpPath, content);
  fs.renameSync(tmpPath, targetPath);
}

// Deliberately crude, deliberately robust: a session id is a UUID, unique
// enough that a plain substring search across the whole register file is a
// safe dedup check -- no need to parse the table/detail-block structure
// just to answer "has this been processed." Exported for testing.
function alreadyImported(sessionId, registerPath = IMPORT_REGISTER_PATH, readFileFn = fs.readFileSync, existsFn = fs.existsSync) {
  if (!existsFn(registerPath)) return false;
  const content = readFileFn(registerPath, "utf8");
  return content.includes(sessionId);
}

// Parses the simple `IMPORT-N |` table rows to find the highest N in use.
// Never reused, never renumbered -- same discipline every register in this
// project runs on.
function nextImportId(registerPath = IMPORT_REGISTER_PATH, readFileFn = fs.readFileSync, existsFn = fs.existsSync) {
  if (!existsFn(registerPath)) return "IMPORT-1";
  const content = readFileFn(registerPath, "utf8");
  const matches = [...content.matchAll(/IMPORT-(\d+)/g)].map((m) => Number(m[1]));
  const max = matches.length ? Math.max(...matches) : 0;
  return `IMPORT-${max + 1}`;
}

// Minimal frontmatter parse -- fiction-export's own output format is a
// fixed, flat `key: value` block between `---` fences, no nesting. Not a
// general YAML parser; matches exactly what that skill writes.
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  return fields;
}

// Every staged fiction-export file not yet referenced anywhere in
// import-register.md, cross-persona (staging is organized
// <Persona>/<file>.md, mirroring fiction-export's own layout). Exported
// for testing.
function listUnimportedStaged(stagingDir = STAGING_DIR, registerPath = IMPORT_REGISTER_PATH, readFileFn = fs.readFileSync, existsFn = fs.existsSync, readdirFn = fs.readdirSync) {
  if (!existsFn(stagingDir)) return [];
  const registerContent = existsFn(registerPath) ? readFileFn(registerPath, "utf8") : "";
  const results = [];
  for (const personaDir of readdirFn(stagingDir, { withFileTypes: true })) {
    if (!personaDir.isDirectory()) continue;
    const personaPath = path.join(stagingDir, personaDir.name);
    for (const file of readdirFn(personaPath)) {
      if (!file.endsWith(".md")) continue;
      const fullPath = path.join(personaPath, file);
      const content = readFileFn(fullPath, "utf8");
      const fm = parseFrontmatter(content);
      const sessionId = fm.session_id || null;
      if (sessionId && registerContent.includes(sessionId)) continue;
      results.push({
        stagedPath: fullPath,
        persona: fm.persona || personaDir.name,
        sessionId,
        sessionFile: fm.session_file || null,
        // Per ADR-0006 (2026-09-05): fiction-export now stages one whole
        // session (session_start/session_end), not a pre-cut arc
        // (arc_start/arc_end) -- the old field names still read here for
        // any already-staged file from before the rewrite.
        sessionStart: fm.session_start || fm.arc_start || null,
        sessionEnd: fm.session_end || fm.arc_end || null,
        basename: file,
      });
    }
  }
  return results;
}

// Every scene sitting in DRAFTS_DIR, awaiting custodian clearance before
// --archive promotes it into raw/. Doesn't cross-check against
// import-register.md the way listUnimportedStaged does -- a draft isn't
// imported yet by definition, there's nothing to dedup against.
function listDrafts(draftsDir = DRAFTS_DIR, readFileFn = fs.readFileSync, existsFn = fs.existsSync, readdirFn = fs.readdirSync) {
  if (!existsFn(draftsDir)) return [];
  const results = [];
  for (const personaDir of readdirFn(draftsDir, { withFileTypes: true })) {
    if (!personaDir.isDirectory()) continue;
    const personaPath = path.join(draftsDir, personaDir.name);
    for (const file of readdirFn(personaPath)) {
      if (!file.endsWith(".md")) continue;
      const fullPath = path.join(personaPath, file);
      const fm = parseFrontmatter(readFileFn(fullPath, "utf8"));
      results.push({
        draftPath: fullPath,
        persona: fm.persona || personaDir.name,
        sessionId: fm.session_id || null,
        basename: file,
      });
    }
  }
  return results;
}

// Moves (copy then delete original) a staged file into the real archive at
// raw/<persona>/<basename> -- lowercased persona directory, matching the
// existing raw/ layout (raw/hailey/, raw/callie/, etc, confirmed against
// the real directory names already in x-lifestyle-research). Refuses to
// overwrite an existing archived file of the same name rather than
// silently clobbering it; caller decides what to do with that conflict.
function archiveStagedFile(stagedPath, researchDir = RESEARCH_DIR, readFileFn = fs.readFileSync, existsFn = fs.existsSync, writeFileFn = fs.writeFileSync, unlinkFn = fs.unlinkSync, mkdirFn = fs.mkdirSync) {
  const content = readFileFn(stagedPath, "utf8");
  const fm = parseFrontmatter(content);
  const persona = (fm.persona || "").toLowerCase();
  if (!persona) throw new Error(`${stagedPath} has no persona in its frontmatter -- can't determine raw/<persona>/ destination`);
  const basename = path.basename(stagedPath);
  const destDir = path.join(researchDir, "raw", persona);
  const destPath = path.join(destDir, basename);
  if (existsFn(destPath)) {
    throw new Error(`${destPath} already exists -- refusing to overwrite. If this is a real re-import, remove the stale archive copy first.`);
  }
  if (!existsFn(destDir)) mkdirFn(destDir, { recursive: true });
  writeFileFn(destPath, content);
  unlinkFn(stagedPath);
  return destPath;
}

function appendImportRow(registerPath, row, readFileFn = fs.readFileSync, existsFn = fs.existsSync, writeFileFn = fs.writeFileSync) {
  if (!existsFn(registerPath)) throw new Error(`${registerPath} doesn't exist -- nothing to append to`);
  const content = readFileFn(registerPath, "utf8");
  const tableRow = `| ${row.id} | ${row.dateRunSast} | ${row.transcripts} | ${row.persona} | ${row.scenes} | ${row.canon} | ${row.themes} | ${row.marker} | ${row.status} |`;

  // Insert the new table row right after the last existing `| IMPORT-` row
  // in the table (or right after the header separator if this is the very
  // first import) -- never at the end of the whole file, which would land
  // past the table and any prose that follows it.
  const lines = content.split(/\r?\n/);
  let insertAt = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\|\s*IMPORT-\d+\s*\|/.test(lines[i])) insertAt = i;
  }
  if (insertAt === -1) {
    // No existing IMPORT-N rows -- insert right after the header separator line.
    insertAt = lines.findIndex((l) => /^\|---/.test(l) || /^\|\s*---/.test(l));
    if (insertAt === -1) throw new Error("Couldn't find the register table's header separator to insert after");
  }
  lines.splice(insertAt + 1, 0, tableRow);

  let newContent = lines.join("\n");
  if (row.detail && row.detail.trim()) {
    newContent = newContent.trimEnd() + "\n\n" + row.detail.trim() + "\n";
  }
  writeFileAtomic(registerPath, newContent, writeFileFn);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args["list-staged"]) {
    console.log(JSON.stringify(listUnimportedStaged(), null, 2));
    return;
  }

  if (args["list-drafts"]) {
    console.log(JSON.stringify(listDrafts(), null, 2));
    return;
  }

  if (args.check) {
    console.log(JSON.stringify({ sessionId: args.check, alreadyImported: alreadyImported(args.check) }));
    return;
  }

  if (args["next-id"]) {
    console.log(nextImportId());
    return;
  }

  if (args.archive) {
    const dest = archiveStagedFile(args.archive);
    console.log(`Archived to ${dest}`);
    return;
  }

  if (args["write-row"]) {
    const detail = args["detail-file"] ? fs.readFileSync(args["detail-file"], "utf8") : "";
    appendImportRow(IMPORT_REGISTER_PATH, {
      id: args.id === true || !args.id ? nextImportId() : args.id,
      dateRunSast: args.date || new Date().toISOString(),
      transcripts: args.transcripts || "",
      persona: args.persona || "",
      scenes: args.scenes || "0",
      canon: args.canon || "No",
      themes: args.themes || "No",
      marker: args.marker || "No",
      status: args.status || "Partial",
      detail,
    });
    console.log(`Row written to ${IMPORT_REGISTER_PATH}`);
    return;
  }

  console.error("No recognized flag. See this file's own header comment for usage.");
  process.exitCode = 1;
}

if (require.main === module) {
  main();
}

module.exports = {
  alreadyImported,
  nextImportId,
  parseFrontmatter,
  listUnimportedStaged,
  listDrafts,
  archiveStagedFile,
  appendImportRow,
  writeFileAtomic,
  RESEARCH_DIR,
  IMPORT_REGISTER_PATH,
  STAGING_DIR,
  DRAFTS_DIR,
};
