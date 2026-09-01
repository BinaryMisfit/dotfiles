# 0018 — This machine is the canonical source for the home-profile Claude Code config; all home-relevant skills get vendored, not just registers/decision-register

[ADR 0014](0014-registers-convention-ownership-and-domain-boundary.md) carved out exactly
two exceptions to "this repo decides what it depends on": `registers.instructions.md` and
the `decision-register` skill, both content-authored by `xls` (Hailey) but synced in here
from the deployed `~/.claude/` artifact. Investigating a user question about whether
`session-start`/`scratchpad-check` reach other machines (2026-09-01) surfaced that five
more skills already deployed to this machine's `~/.claude/skills/` — `session-start`,
`scratchpad-check`, `persona`, `nsfw-comment-audit`, `security-audit` — were never
vendored into this repo at all, so `chezmoi apply` on any other machine has never created
them. BinaryMisfit stated the actual intended model directly: this machine is the
canonical source for everything in the home-profile Claude Code config, full stop — not a
two-file exception.

**Status:** Decided

**Decision:**
1. **Ownership model, stated plainly:** Hailey (the `xls` session) authors and owns the
   *content* source for these tools — that's where the real day-to-day work on them
   happens. She syncs her changes to this machine's `~/.claude/` via her own
   `sync-global-claude-config.js`. This repo (`binary-dotfiles`, worked by whichever
   session is "Aphrodite" here) picks up that deployed artifact and distributes it to every
   other machine via `chezmoi apply`. Any change discovered or needed always routes back
   to Hailey's source — this repo never originates content edits to vendored files, same
   rule ADR 0014 already set for the two-file case, now general.
2. **Scope broadens from two files to the whole home-profile `.claude/` surface.** Every
   skill, rule, and output-style that's genuinely home-profile content (not work-profile,
   not this repo's own mechanics) gets vendored here, sourced only from the deployed
   `~/.claude/` artifact — never from `xls`'s internal repo layout, per ADR 0014's rule 2,
   which still holds unchanged.
3. **Domain boundary from ADR 0014 rule 3 is unchanged and still binding:** content
   authorship elsewhere is not authority over how `binary-dotfiles`/chezmoi itself is run.
   Broadening the sync scope doesn't broaden that authority.
4. **This ADR does not fully supersede 0014** — it extends 0014's scope from a two-file
   exception to a general rule for the same mechanism. 0014 stays `Decided`, with an
   addendum pointing here.

**Why:** the two-file carve-out in ADR 0014 was written narrowly because that was the only
verified gap at the time. It was never a deliberate decision to exclude everything else —
just under-scoped. Once asked directly, BinaryMisfit confirmed the real intended shape is
broader and simpler: one machine, one canonical home-profile source, full stop.

**How to apply:** the five previously-unvendored skills (`session-start`,
`scratchpad-check`, `persona`, `nsfw-comment-audit`, `security-audit`) are copied into
`dot_claude/skills/` in this same change, gated home-only in `.chezmoiignore`/
`.chezmoiremove` the same way the four persona output-styles already are. Going forward,
any new skill or rule that shows up under this machine's `~/.claude/` and is genuinely
home-profile content gets vendored the same way, without needing a fresh ADR each time —
this decision already covers the general case. A future skill that's ambiguous between
home/work/universal still deserves a real judgment call, same as always.

---
*Addendum, filed on [0014](0014-registers-convention-ownership-and-domain-boundary.md)
(2026-09-01):* superseded in scope (not fully superseded) by this ADR — the two-file
exception in 0014's decision is now the general rule for all home-profile Claude Code
config, not a special case.
