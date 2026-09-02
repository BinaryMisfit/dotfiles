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

// Pure: candidate browser paths for `platform` (a `process.platform` value).
// Windows-only candidates were the whole list until this was promoted to
// claude-global for cross-machine (chezmoi) distribution 2026-09-02 --
// caught live by binary-dotfiles' own session when vendoring this file:
// as shipped, findBrowser() silently returned null on a Mac or Linux
// machine, which makes screenshot() silently return false with no browser
// ever found, not an error pointing at the real cause. `CHROME_PATH` is
// checked first regardless of platform -- an explicit override always wins.
// Exported for testing.
function browserCandidatesFor(platform) {
  const chromePathOverride = process.env.CHROME_PATH;
  const byPlatform = {
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/microsoft-edge",
      "/usr/bin/microsoft-edge-stable",
      "/snap/bin/chromium",
    ],
  };
  return [chromePathOverride, ...(byPlatform[platform] ?? [])].filter(Boolean);
}

function findBrowser() {
  const candidates = browserCandidatesFor(process.platform);
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

module.exports = { findBrowser, screenshot, browserCandidatesFor };
