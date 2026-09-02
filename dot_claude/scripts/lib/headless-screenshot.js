"use strict";
// Shared headless-Chrome/Edge screenshot capture -- render any local HTML
// file to a PNG using whichever browser is already installed, rather than
// adding a headless-browser npm dependency (Playwright/Puppeteer).
//
// Promoted here 2026-09-02 (BinaryMisfit's own call: "move what xls does
// global") from xls's own `scripts/lib/headless-screenshot.js`, where it
// backs xls's brand-asset generators (new-brand-icon.js, new-cover-image.js,
// new-mockup-screenshot.js, new-feature-sheet.js). Those generators stay in
// xls -- they're wired to XCL-specific templates and brand colors, nothing
// to genericize there. This file is the one genuinely repo-agnostic piece:
// "screenshot an HTML file to a PNG" has no XCL-specific content in it at
// all, so it belongs in the shared toolbox every repo already pulls from
// (see claude-global/README.md), not locked inside one project's own
// scripts/ directory. xls keeps its own copy (its four generators still
// require it via a repo-relative path) -- this is a promoted duplicate of a
// genuinely reusable primitive, not a move that breaks xls's existing
// wiring.

const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function screenshot(htmlPath, pngPath, { width = 1200, height = 800 } = {}) {
  const browser = findBrowser();
  if (!browser) return false;
  execFileSync(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      `--screenshot=${pngPath}`,
      `--window-size=${width},${height}`,
      "--default-background-color=00000000",
      pathToFileURL(htmlPath).href,
    ],
    { stdio: "pipe" },
  );
  // execFileSync not throwing only means Chrome exited 0 -- it doesn't mean the
  // PNG actually landed (e.g. a relative pngPath resolved against the wrong cwd,
  // the real 2026-08-25 repro in xls: Hermes' teaser image silently produced nothing).
  if (!fs.existsSync(pngPath) || fs.statSync(pngPath).size === 0) return false;
  return true;
}

module.exports = { findBrowser, screenshot };
