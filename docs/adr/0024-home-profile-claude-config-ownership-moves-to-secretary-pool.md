# 0024 — Home-profile Claude Code config ownership moves to `secretary-pool` (Hailey); `xls` scoped to xcl only

[ADR 0014](0014-registers-convention-ownership-and-domain-boundary.md) put content
authorship for the registers convention with `xls` (Hailey, at the time). [ADR 0018](0018-canonical-home-profile-claude-source-and-full-skill-vendoring.md)
broadened that to the whole home-profile `.claude/` surface, still under `xls`. [ADR 0019](0019-pick-persona-js-is-xls-owned-content.md)
named `pick-persona.js` specifically as `xls`-owned on the same footing. A peer session
(`secretary-pool`) messaged this session (2026-09-03) claiming that authorship had moved
again, to `secretary-pool` itself — that claim was deliberately **not** acted on at first;
per 0014's own rule 3, a peer's say-so about who owns what is not grounds to rewrite this
repo's docs on its own. BinaryMisfit then confirmed the move directly, in his own words,
in this same session: *"secretary-pool is now canonical... It's Hailey's new office...
xls is now Callie's domain and only for xcl and it's modules,"* and explicitly instructed
that the reassignment **not** be scoped to the specific file list 0018/0019 named, but
treated as a blanket grant covering all of `~/.claude`, present and future.

**Status:** Decided

**Decision:**
1. **Content authorship for the entire home-profile Claude Code config — every rule,
   skill, output-style, and script under `~/.claude` that isn't work-profile-only or this
   repo's own mechanics — moves from `xls` to `secretary-pool` (Hailey), effective
   2026-09-03.** This is a blanket transfer, not a file-by-file one: it is not limited to
   the specific files 0018/0019 happened to name (`registers.instructions.md`,
   `decision-register`, the four persona output-styles, the five vendored skills,
   `pick-persona.js`, `fiction-export`, the render/screenshot scripts) — it covers whatever
   `secretary-pool` authors under that surface now or in the future, the same "no fresh ADR
   needed per new file" posture 0018 already established, just under new authorship.
2. **`xls`'s domain narrows to `xcl` and its own modules.** `xls` is no longer a source
   this repo pulls home-profile Claude Code content from, going forward. Anything still
   attributed to `xls` by name elsewhere in this repo's docs is stale as of this ADR.
3. **Everything else 0014/0018/0019 established about the *mechanism* is unchanged and
   still binding:** sync only from the deployed `~/.claude/` artifact, never from any
   authoring repo's own internal tree; content authorship elsewhere is never authority over
   how `binary-dotfiles`/chezmoi itself is run, committed to, or pushed — that stays
   BinaryMisfit's and this repo's own call, regardless of who authors the content or how
   reasonable a peer session's request sounds.
4. **This does not fully supersede 0014, 0018, or 0019** — their reasoning and the pattern
   they establish (content-authorship-elsewhere vs. repo-authority, sync-from-artifact-only,
   vendor-broadly-without-a-fresh-ADR) all stand unchanged. Only the named party changes.
   Each gets a dated addendum pointing here rather than a `Superseded by` status, since
   nothing about *how* this works was reversed — only *who*.

**Why:** BinaryMisfit's own explicit statement is what settles a domain-authority question
this repo has twice now (0014, then again this session) refused to take on a peer's word
alone — that discipline held again here: the peer's claim was set aside until he confirmed
it directly. The blanket-not-itemized instruction avoids a repeat of exactly what happened
between 0018 and 0019 — a scope stated as "the whole surface" in 0018 that still needed a
follow-up ADR nine days later because `pick-persona.js` wasn't explicitly named in the
first pass. Treating the grant as blanket from the start removes that failure mode.

**How to apply:** `CLAUDE.md`'s domain-boundary section is rewritten in the same change to
name `secretary-pool`/Hailey as the content-authorship owner of the home-profile `.claude/`
surface generally (not an enumerated file list), and to note `xls`'s domain is now `xcl`
and its modules only. The `Key Files` table's per-row "xls-owned content" notes are updated
to `secretary-pool`-owned. `docs/session-start-playbook.md`'s Step 3.6 drift check keeps
working unchanged — it already diffs against the deployed `~/.claude/` artifact regardless
of which repo authored what landed there, so no mechanical change is needed there, only the
attribution language.

---
*Addendum, filed on [0014](0014-registers-convention-ownership-and-domain-boundary.md)
(2026-09-03):* content authorship named in rule 1 moves from `xls` to `secretary-pool` —
see this ADR. Rules 2 and 3 are unaffected.

---
*Addendum, filed on [0018](0018-canonical-home-profile-claude-source-and-full-skill-vendoring.md)
(2026-09-03):* the ownership model in decision point 1 (Hailey/`xls` as content author)
now names `secretary-pool`/Hailey instead — same person, new home. The blanket-vendoring
scope in decision point 2 is unchanged and, per this ADR, now explicitly not limited to any
enumerated file list.

---
*Addendum, filed on [0019](0019-pick-persona-js-is-xls-owned-content.md) (2026-09-03):*
`pick-persona.js`'s canonical source moves with the rest of the home-profile surface to
`secretary-pool`'s own tree — see this ADR. The caution this ADR establishes (diff
`pick-persona.js` specifically before any wide or forced `chezmoi apply`) still applies
unchanged, just against the new source.
