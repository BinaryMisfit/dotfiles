"use strict";

// Pure parser/writer for research/x-lifestyle-research/themes.md's own
// register format (see that file's own header for the field spec BinaryMisfit
// and Callie settled on 2026-09-03: ID, Status, Repeat count, Last picked,
// optional Reveal mode). Deliberately operates on the file's real prose
// shape -- markdown bullets with wrapped continuation lines -- rather than
// forcing it into JSON/YAML, since the register is meant to stay a
// human-readable, hand-editable document (same reasoning as every other
// register in this project). No file I/O in this module -- callers own
// reading/writing the actual themes.md so this stays fully unit-testable.

// Finds the `## <personaName>` section's body range within the whole file --
// from just after that heading line to just before the next `## ` heading
// (or end of file). Returns null if the persona has no section at all.
// Exported for testing.
function findPersonaSection(mdText, personaName) {
  const headingRe = new RegExp(`^## ${personaName}\\s*$`, "m");
  const headingMatch = headingRe.exec(mdText);
  if (!headingMatch) return null;
  const start = headingMatch.index + headingMatch[0].length;
  const rest = mdText.slice(start);
  const nextHeading = rest.match(/\n## /);
  const end = nextHeading ? start + nextHeading.index : mdText.length;
  return { start, end };
}

// Parses every `- **THEME-<PERSONA>-N — Title.** ...` bullet in a persona's
// section. Each bullet can wrap across multiple lines (2-space-indented
// continuations, matching themes.md's own prose style) -- field regexes use
// `[\s\S]*?` rather than `.` so they match across those wraps without
// requiring a single physical line. `offset`/`length` locate the bullet's
// exact span in the ORIGINAL mdText (not persona-section-relative), so
// `tagThemePick` below can splice a change back in without disturbing
// anything else in the file. Exported for testing.
function parsePersonaThemes(mdText, personaName) {
  const section = findPersonaSection(mdText, personaName);
  if (!section) return [];
  const sectionText = mdText.slice(section.start, section.end);

  const bulletStartRe = /- \*\*(THEME-[A-Z]+-\d+) — /g;
  const starts = [];
  let m;
  while ((m = bulletStartRe.exec(sectionText))) {
    starts.push({ id: m[1], index: m.index });
  }

  const themes = [];
  for (let i = 0; i < starts.length; i++) {
    const blockStart = starts[i].index;
    const blockEnd = i + 1 < starts.length ? starts[i + 1].index : sectionText.length;
    const block = sectionText.slice(blockStart, blockEnd);

    const titleMatch = block.match(/— ([\s\S]*?)\*\*/);
    const statusMatch = block.match(/Status:\s*(Active|Under review)\./);
    const repeatMatch = block.match(/Repeat count:\s*(\d+)\./);
    // Greedy, finds the LAST period in the block, not the first -- "Last
    // picked" is always the bullet's final field, but its own value can
    // itself contain periods (an ISO timestamp's ".000Z"), so a non-greedy
    // match would truncate at the timestamp's own decimal point instead of
    // the field's real terminator. Real bug, caught by this file's own test.
    // Deliberately NOT anchored with `\s*$` -- a real second bug, caught live
    // 2026-09-03 by Callie diffing the actual written file: anchoring to
    // end-of-block let `\s*` swallow the bullet's own trailing newline INTO
    // the match, so tagThemePick's replacement (which has no trailing
    // newline of its own) silently ate the blank line separating this
    // section from the next one. Greedy-to-last-period alone is enough --
    // it naturally stops right after the final "." and never touches
    // whatever whitespace happens to follow it in the file.
    const lastPickedMatch = block.match(/Last picked:\s*([\s\S]*)\./);
    const revealMatch = block.match(/Reveal mode:\s*([\s\S]*?)\.\s*(?:Status:|$)/);

    themes.push({
      id: starts[i].id,
      title: titleMatch ? titleMatch[1].trim() : "",
      status: statusMatch ? statusMatch[1] : "Active",
      repeatCount: repeatMatch ? parseInt(repeatMatch[1], 10) : 0,
      lastPicked: lastPickedMatch ? lastPickedMatch[1].trim() : "never",
      revealMode: revealMatch ? revealMatch[1].trim() : null,
      offset: section.start + blockStart,
      length: blockEnd - blockStart,
    });
  }
  return themes;
}

// Weighted-random pick among `Active` themes only (`Under review` sits out
// of the draw pool -- see themes.md's own field spec). Weight is
// 1/(1+repeatCount): biases away from a theme that's run more, without ever
// hard-banning a repeat, matching the design doc's own "biases away... not
// hard-banning" call. Returns null when the pool is empty (no themes, or
// every theme's `Under review`). Exported for testing.
function pickWeighted(themes, randomFn = Math.random) {
  const pool = themes.filter((t) => t.status === "Active");
  if (pool.length === 0) return null;
  const weights = pool.map((t) => 1 / (1 + t.repeatCount));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = randomFn() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// Surgical rewrite of ONE theme's `Repeat count`/`Last picked` fields within
// its own exact span (`theme.offset`/`theme.length`, from a `parsePersonaThemes`
// result against this SAME mdText) -- every other byte of the file, including
// that theme's own wrapping/whitespace elsewhere in the bullet, is left
// untouched. Throws if either field can't be found in the span (a themes.md
// bullet is malformed, or `theme` was parsed from different text than
// `mdText`) rather than silently no-op-ing a write that looks like it
// succeeded. Per the design doc's own resolution: this is a PICK-time tag
// (counter++ and timestamp the moment a theme is drawn), not a
// scene-completion tag. Exported for testing.
function tagThemePick(mdText, theme, timestamp) {
  const block = mdText.slice(theme.offset, theme.offset + theme.length);
  const withRepeat = block.replace(/Repeat count:\s*\d+\./, `Repeat count: ${theme.repeatCount + 1}.`);
  if (withRepeat === block) {
    throw new Error(`tagThemePick: no "Repeat count:" field found in ${theme.id}'s bullet -- themes.md may be malformed, or theme/mdText are out of sync.`);
  }
  // Same greedy-to-last-period reasoning as the parser's own regex above --
  // a non-greedy match here would stop at the OLD timestamp's own decimal
  // point and leave its tail (".000Z.") dangling in the output. Deliberately
  // NOT anchored with `\s*$` (real bug, caught live by Callie diffing the
  // actual written themes.md, secretary-pool ddc51b2 -> research 501be66):
  // that anchor let the match swallow the bullet's own trailing newline, and
  // since the replacement text has no newline of its own, the blank line
  // separating this section from the next one silently disappeared on every
  // write to the LAST theme in a section. Stopping right after the final
  // "." and never reaching into `\s*$` leaves that newline exactly alone.
  const withLastPicked = withRepeat.replace(/Last picked:\s*[\s\S]*\./, `Last picked: ${timestamp}.`);
  if (withLastPicked === withRepeat) {
    throw new Error(`tagThemePick: no "Last picked:" field found in ${theme.id}'s bullet -- themes.md may be malformed, or theme/mdText are out of sync.`);
  }
  return mdText.slice(0, theme.offset) + withLastPicked + mdText.slice(theme.offset + theme.length);
}

module.exports = { findPersonaSection, parsePersonaThemes, pickWeighted, tagThemePick };
