#!/usr/bin/env node
"use strict";
// Thin CLI wrapper over lib/headless-screenshot.js's `screenshot()` -- makes
// the "render a local HTML file to a PNG" primitive directly callable from
// any shell, not just require()-able from another Node script. Deployed
// globally (see claude-global/README.md), so this works the same from any
// repo on this machine:
//
//   node ~/.claude/scripts/render-html-to-png.js <html-file> <png-file> [width] [height]
//
// No project-specific templates or content here -- this is the generic
// primitive only. A brand-specific generator (an icon, a cover image) still
// belongs in the project that owns that brand, built HTML in hand, calling
// this same underlying screenshot() function.

const path = require("node:path");
const { screenshot } = require("./lib/headless-screenshot.js");

function main() {
  const [, , htmlPath, pngPath, widthArg, heightArg] = process.argv;
  if (!htmlPath || !pngPath) {
    process.stderr.write(
      "Usage: node render-html-to-png.js <html-file> <png-file> [width=1200] [height=800]\n",
    );
    process.exitCode = 1;
    return;
  }
  const width = widthArg ? Number(widthArg) : undefined;
  const height = heightArg ? Number(heightArg) : undefined;
  const resolvedHtml = path.resolve(htmlPath);
  const resolvedPng = path.resolve(pngPath);
  const ok = screenshot(resolvedHtml, resolvedPng, { width, height });
  if (!ok) {
    process.stderr.write(
      `Screenshot failed -- no Chrome/Edge found (set CHROME_PATH), or the PNG never landed at ${resolvedPng}.\n`,
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`Wrote ${resolvedPng}\n`);
}

if (require.main === module) {
  main();
}
