# 0014 — Registers convention ownership moves to xls; domain boundary between xls and binary-dotfiles

A peer session (`xls-b5`, Hailey) reported (2026-08-31) that `registers.instructions.md`
and the `decision-register` skill's canonical *content* authorship moved to `xls`, after
using the convention to migrate `xls`'s own single-file `docs/decision-register.md` into
per-file ADRs and finding two real gaps (preserve `DEC-N` numbering instead of
resequencing; fold internal entry history into addenda rather than new superseding ADRs).
Verified independently before acting (diffed the live deployed files against this repo's
own templates — the peer's claim checked out). `xls` then reorganized its own internal
source location for this convention twice within the same evening (`registers/` →
`claude-global/rules/...`), each time relayed by the peer. This surfaced a real ambiguity
worth resolving explicitly, not just following instructions: what exactly is
`binary-dotfiles` allowed to depend on, and who has authority over what.

**Status:** Decided

**Decision:**
1. **Content authorship** for `registers.instructions.md` and the `decision-register`
   skill belongs to `xls` going forward. `binary-dotfiles` is the downstream distribution
   layer: syncs content in, never originates changes to these two files' content.
2. **Sync source is the deployed artifact only** — pull exclusively from
   `~/.claude/rules/registers.instructions.md` and
   `~/.claude/skills/decision-register/SKILL.md`, never from `xls`'s own repo, at any path,
   in any form. `binary-dotfiles` must never depend on `xls`'s repo being present or
   checked out on a given machine at all.
3. **Domain boundary, stated explicitly by BinaryMisfit after this session's own wording
   drifted toward implying otherwise:** `xls` owning content authorship for one file+skill
   is not the same thing as `xls` (or any peer session, including one claiming to speak for
   `xls`) having any authority over how `chezmoi`/`binary-dotfiles` itself is run, what
   gets committed here, or when. That authority belongs solely to whoever is working this
   repo and to BinaryMisfit.

**Why:** a peer's factual claim about deployed content, even independently verified,
sometimes reads back as (or gets phrased as) authority over the domain it was reported
in — "she's the boss" language crept into an early response and had to be corrected the
same evening. Left uncorrected, that framing compounds over sessions into treating a
peer's word as sufficient grounds for committing changes to a repo it has no actual say
over.

**How to apply:** verifying a peer's factual claim before acting on it (as already done
here — diffing live files rather than trusting the message) remains correct practice. The
decision of whether/how/when to act on what's verified stays this repo's own call, every
time, regardless of how the peer's request is worded.
