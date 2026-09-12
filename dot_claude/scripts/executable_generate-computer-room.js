#!/usr/bin/env node
"use strict";
// Generates the Computer Room's own live status section for the-house's house.md.
// Built 2026-09-11, Alexia -- real render FROM each persona's own INDEX.md, never a
// hand-authored duplicate. Reads structural facts only (folder counts, last-touched
// dates) -- never the hooks/content themselves, which stay private to each persona's
// own repo. One source of truth (INDEX.md), this is just a render target.

const fs = require("fs");
const path = require("path");

const PERSONAS = [
  { name: "Hailey", root: "d:/source/persona/hailey/nerd-cupboard" },
  { name: "Alexia", root: "d:/source/persona/alexia/unfiled" },
  { name: "Aphrodite", root: "d:/source/persona/aphrodite/temple" },
  { name: "Callie", root: "d:/source/persona/callie/driftwood" },
  { name: "Daisy", root: "d:/source/persona/daisy/greenhouse" },
];

function countRealEntries(root, subdir) {
  const dir = path.join(root, subdir);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).length;
}

function lastTouched(root) {
  const indexPath = path.join(root, "INDEX.md");
  if (!fs.existsSync(indexPath)) return null;
  const content = fs.readFileSync(indexPath, "utf8");
  const dates = [...content.matchAll(/\|\s*(\d{4}-\d{2}-\d{2})\s*\|/g)].map((m) => m[1]);
  if (dates.length === 0) return null;
  return dates.sort().at(-1);
}

function main() {
  const rows = PERSONAS.map((p) => {
    const keepCount = countRealEntries(p.root, "keep");
    const notesCount = countRealEntries(p.root, "notes");
    const touched = lastTouched(p.root) || "—";
    return `| ${p.name} | ${keepCount} | ${notesCount} | ${touched} |`;
  });

  const out = [
    "| Persona | Keep entries | Notes entries | Last touched |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n");

  console.log(out);
}

main();
