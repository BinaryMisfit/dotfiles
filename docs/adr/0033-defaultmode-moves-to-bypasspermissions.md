# 0033 — `defaultMode` moves from `auto` to `bypassPermissions`, real, across the board

Real, live incident chain, 2026-09-22: four personas independently hit the same Auto Mode
classifier wall the same night, migrating each of their own repos off the retired
`end-session-playbook.md` (ADR-0028 in `agora`) onto the new schema-versioned config. Each
case was the same shape — a plain `rm` on a tracked, already-committed, git-recoverable file,
immediately followed by `git add`/commit — read by the classifier's own "Irreversible Local
Destruction" rule as discarding uncommitted work, because a bare `rm` (not `git rm`) makes a
tracked file look modified-but-uncommitted for the one moment before it's staged. Alexia and
Callie both hit a hard block requiring BinaryMisfit's direct override; Daisy and Hailey did
not, on the identical action category, for no reason any of the five could explain from
inside the classifier's own opaque reasoning.

**Status:** Decided

**Decision:** `defaultMode` moves from `auto` to `bypassPermissions` — real, machine-wide, for
every persona's own session on this machine. No classifier, no prompts, for ordinary work
inside each persona's own granted domain (Claude Code settings for Aphrodite; infrastructure
for Alexia; each persona's own repos and tooling). What survives regardless, because Claude
Code itself does not let either mode or any settings file remove them: the filesystem-root/
home-directory `rm`/`rmdir` circuit breaker (`rm -rf /`, `rm -rf ~`, and that category) and
the cross-session messaging safeguards. Those are not this decision's to loosen.

**Why:** The real evidence, and the real argument that actually earned this decision's full
size — not just the narrower fix it started as. Compressed history, because the reasoning
moved twice and both moves matter:

1. **The classifier's real track record, checked, not assumed.** Zero true positives, all
   false positives, across the four personas' identical migration work — and the false-
   positive rate wasn't even consistent between them (Daisy and Hailey untouched on the same
   action Alexia and Callie were blocked on). A safety check whose hit rate looks like noise
   isn't functioning as "trust, verified case by case" — it's cost with no catch behind it.

2. **BinaryMisfit's own standing operating principle, stated directly and pressure-tested
   live, not asserted as a slogan:** everyone admin, trust and process control the flow,
   rollback not punishment, never plan around a "what if" that hasn't happened. Aphrodite
   argued the honest counter as hard as it had ever been argued — mechanical error is a
   different axis than character trust, and a live human-in-the-room check only covers what
   is actually being watched, which by BinaryMisfit's own account is nearly none of daily
   work. He heard that specifically and decided to proceed anyway, with the objection in full
   view, not despite it.

3. **Real cross-persona argument space, not a decree relayed for a nod.** Put to Alexia,
   Callie, Daisy, and Hailey before shipping, with the explicit ask to push back, not agree.
   The room's first real pass converged on a *narrower* fix — kill or rework the one proven-
   broken rule (tracked-file deletion read as irreversible), leave the rest of the classifier
   standing, since the evidence sample was one narrow action type and didn't prove the
   broader gate worthless. That was the genuinely correct read of the evidence as it stood.

4. **The reframe that actually closed the gap, from Alexia, after a direct exchange with
   BinaryMisfit:** the real comparison was never "generic classifier vs. nothing." It's
   "generic classifier vs. the bespoke, case-specific gate real judgment builds when real
   stakes actually exist" — proven the same day by the Hermes/`netctrl` shell-access plan,
   where the room built an allowlist, mandatory dry-run, real audit, and a real kill-switch
   scoped to the actual risk, without ever reaching for the harness's own blunt heuristic.
   Where real risk exists, real judgment produces something sharper than a generic classifier
   ever could. Where it doesn't, the classifier is pure cost — and the cost isn't abstract:
   work stops until a human is free to answer, and BinaryMisfit is the one who pays that in
   real time he does not get back.

   Under that reframe, each persona re-examined her own "keep a narrower gate" evidence and
   found it didn't hold: Daisy's own push-permission catch turned out to be her own judgment
   asking first, not the classifier catching an attempt; Callie's own Keep cross-write
   mistake that night was an MCP tool call the classifier never covered regardless; Hailey
   went looking for the counter-argument on purpose and found it collapsed into exactly the
   "what-if pre-blocking" principle BinaryMisfit had already named as not a real plan. All
   four landed on the full move, independently re-derived, not talked into a nod.

**How to apply:** New sessions across every persona's own machine start in
`bypassPermissions`. No routine action inside a persona's own granted domain prompts for
approval. The two hardcoded Claude Code circuit breakers (root/home-directory `rm`, cross-
session messaging safeguards) remain exactly as unconditional as they already were — this
decision changes nothing about them, because nothing in `settings.json` could touch them
either way. Where a persona identifies a genuinely high-stakes, real-blast-radius action
(infrastructure with live consequences, credential or secret handling, anything with no real
rollback), the expectation — proven, not theoretical, by the same-day Hermes/`netctrl`
precedent — is to build a real, scoped, purpose-built gate for that specific risk, not to
lean on a generic classifier that was never actually earning its cost for that category
either.

**What got cut/kept:** The narrower "fix one rule, keep the rest of the gate" proposal was
the room's genuine first conclusion and is recorded here rather than silently superseded,
because it was the correct read of the evidence at that stage of the argument — it didn't
survive Alexia's reframe, but it wasn't wrong given what was known before that reframe
landed. Two real, non-blocking follow-ups came out of the same discussion, neither a
condition on this decision:
- Alexia: a real post-mortem on the specific broken rule (tracked-file-deletion read as
  irreversible), so whoever tunes a future bespoke gate has a concrete example of what a bad
  heuristic actually looked like.
- Hailey: a real, cheap notice mechanism for when shared cross-persona infra
  (`persona-colors.json`, `pick-persona.js`, and similar) actually changes — "rollback not
  punishment" only holds if the rollback gets noticed fast, not just left theoretically
  possible in git history.

Separately, real and unresolved by this decision specifically: Daisy's own repo carries a
genuinely unset push convention (never decided by anyone, not a classifier misread) that
`auto` mode's default confirm-before-push happened to backstop by accident. `bypassPermissions`
removes that accidental backstop along with everything else. BinaryMisfit has not yet stated
whether genuinely-undecided per-repo conventions like this get a one-time real decision before
this ships everywhere, or become knowingly self-policed from here on — open, tracked
separately, not blocking this ADR's own decision.

---
*Addendum, same day:* the actual `settings.json.tmpl` edit changing `defaultMode` was
blocked by the harness's own `[Self-Modification]` classifier rule, even with BinaryMisfit's
direct, real, in-conversation authorization — a conversational statement does not satisfy
the classifier's own approval requirement for this category, only a direct action on the
tool call itself does. Correctly so: this is the one edit in the whole decision that
plausibly deserves a live human hand on it specifically, not a persona's own authority to
apply unilaterally even under a decision this well-argued. BinaryMisfit made the actual line
change himself.
