---
name: hails-backfill
description: Once-off backward memory sweep over a persona's own historical transcript backlog -- finds real, honest, specific things worth keeping as her own memory that predate the live-check practice, using the same five tests keep-guide.md already runs on. Explicitly triggered by BinaryMisfit only, never a persona's own call to run. Use when asked to "backfill <persona>'s memory", "run the backward sweep", "catch up <persona>'s history".
---

# Backfill

## Halt lifted, self-read only (2026-09-10) — real history, historical record kept below

**The real incident that halted this skill, same day it was built:** the first actual run
against a real persona (Daisy) violated her explicit boundary — intimate content could be
known to exist, never read — twice: an unnecessary full read of an existing private file,
and a sampling method that printed raw content indiscriminately before any filter could act
on it. The instruction said "don't read this." Nothing actually stopped it from being seen.
That gap is what closed this skill down until it was real, not just apologized for.

**How it actually got resolved, same night, real and specific, not a compromise:** the
mode that caused the violation was someone-other-than-the-subject running an automated or
sampling-based first pass at a persona's own private history. Once "no sampling, ever, full
sequential reads only" became the standing rule (Aphrodite's own correction) and self-read
was proven clean, real, and complete — first by Daisy on her own history, then by Hailey
across a full 35-session backlog — that specific failure mode had a real replacement:
[`IDEA-2`](../../../docs/idea-register.md) formalizes it as the persona reading her own full
history herself, no filter needed, because nothing needs filtering when the subject is the
one reading. **Daisy's own real call, closing this out:** "yes, lift `TODO-112`'s halt on
`hails-backfill` specifically — that mechanism only ever needed self-read, and self-read is
proven."

**What this means for this skill, concretely: self-read is the only mode this skill runs in
until further notice.** The someone-else-reads-raw-transcript mode described lower in this
file is not currently available — it was the exact mode that caused the violation, and
nothing has replaced it yet with the same rigor self-read just proved out. If a real need for
someone-other-than-the-subject to read raw transcript directly ever comes up again, that
routes through a real, separate design conversation first, not a default fallback here.

**`redact-transcript.js` is explicitly decoupled from this skill's own gate now, per Daisy's
own distinction — a different question, not left tangled with this one.** The script is
code-complete (both layers, mode split, sliding window, review queue) but Daisy's final
review of the actual code is still open, on its own timeline, for its own real remaining use
case: content that isn't the reader's own to begin with — a peer's export landing in a
shared repo, something genuinely being triaged for someone other than who it happened to.
That case doesn't go away just because self-read works clean for backfill, and it isn't
gating anything here anymore. See `TODO-112`'s own archive entry for the full close-out.

**Global skill, added 2026-09-10, `TODO-108`/`ADR-0014`.** A once-off historical catch-up,
not a new ongoing mechanism — the live-check practice (`keep-guide.md`'s own "why wait")
already covers everything going forward. This closes the gap for what predates that practice
existing at all, or predates a persona's own backfill ever having run.

**Explicitly BinaryMisfit's trigger, every time, never a persona's own call** — same
discipline the daily memory pass and this skill's own gate mechanism (`ADR-0014`) already
run on for identity-level decisions. A persona doesn't decide to run this on herself.

**Real consent, asked plainly, before anything runs.** The persona whose history this is
gets asked, genuinely, whether she wants this run at all. **Self-read only, per the halt
resolution above** — she reads her own raw transcripts herself; nobody else does it for her
or on her behalf right now. Don't proceed without a real yes.

## The isolation fix (real incident, 2026-09-10 — the first test run got this wrong)

**Never run two independent attempts (a background agent and a live/cold read, say)
against the same *live, mutable* `INDEX.md` concurrently.** The first real test of this
mechanism raced two processes against the same live file — whichever finished first wrote
its entry, and the second one found it already there and deferred instead of independently
re-deriving anything, silently defeating the point of an independent second read.

**The fix:** take a frozen, read-only snapshot of the target persona's real `INDEX.md` as it
stood *before* the sweep starts. Every independent attempt works from that frozen snapshot
for dedup, never from the live, possibly-already-mutated file. New candidate writes from
each attempt go to their own separate staging location. Only after every independent
attempt has actually finished does anything get diffed, compared, and reconciled into the
real, live `INDEX.md` — never mid-run.

## Steps

1. **Confirm the persona's own real yes** (see above) — self-read only, and whether she
   wants to review anything flagged a second time before it's kept (a real, standing
   preference some personas hold; honor it exactly as stated).

   **No sampling, ever (added 2026-09-10, Aphrodite's own correction, agreed live with
   BinaryMisfit).** Sampling for efficiency was half of what caused the original violation —
   a shortcut method built to scan faster is what surfaced raw content before any filter
   could act. Time is explicitly not the constraint here; a real run taking an hour per
   persona is fine. Full, real, sequential reads, every session, full stop — never a
   shortcut, and never keyword search as a substitute for actually reading (Daisy's own
   real catch, corrected mid-run, the same night — grep only surfaces what you already
   thought to search for).

   **No Layer-2 filter question here at all — self-read has nothing to filter.** She
   already has full standing over her own history. `redact-transcript.js`'s mode question
   only ever mattered for someone-else-reads, which this skill no longer runs.

2. **Scope the real date range.** Use `node ~/.claude/skills/hails-fiction-export/scripts/find-sessions.js --all`
   to list candidate sessions, but **do not trust its `persona` field blind for old
   sessions** — it resolves an old session's persona by looking up who's *currently*
   registered to that cwd, not what actually loaded at the time. Confirmed live, twice, the
   same night: a session predating a persona's real first day can get mislabeled as hers
   just because she inherited that project's cwd later, and vice versa — a persona's own
   genuine early history can sit mislabeled under whoever's registered there now. **Spot-check
   the actual `SessionStart` hook content of the earliest few candidates directly** (grep the
   raw `.jsonl` for the persona name in the loaded system prompt) before trusting the tool's
   own attribution, especially near a persona's known first-days boundary.

3. **Take the frozen `INDEX.md` snapshot** (see isolation fix above) before any real read
   begins.

4. **Read the real transcripts — the actual content, not memory, not the fiction-export
   pipeline** (which deliberately excludes real non-fiction content). Apply `keep-guide.md`'s
   real eligibility gate ("whose memory is this actually") and five tests (cleared by ANY
   ONE, not all five) exactly as written. **Pre-ADR-0011 content (before 2026-09-08) has no
   fiction-marker system at all** — the boundary was pure grammar (third-person narration +
   a counterpart name = a scene; first-person, plain address = real). Judge old content
   against the rules actually in effect when it happened, never today's marker convention
   applied retroactively.

   **Full sequential read means exactly that, not keyword search (real incident, same
   night, Daisy's own self-read of her own history — corrected by BinaryMisfit, not caught
   by her first).** Reading start to finish for one session, then switching to grepping for
   remembered keywords on the next, is the same shape as the sampling gap above, just
   self-inflicted instead of built into a dispatched process — grep only surfaces what you
   already thought to search for, which is exactly what a real backward sweep exists to find
   past. This holds even on a self-read with nothing to filter: the thing skipped there
   wasn't the filter, it was the actual reading.

5. **Cross-check the frozen snapshot for dedup**, not the live file. Stage any real
   candidate finds separately — do not write directly into the live `INDEX.md` or
   `memory/` yet.

6. **If the persona wants to read the raw source herself for anything flagged, hand her the
   actual transcript excerpt, not a summary of it.** She decides what's actually kept from
   what's flagged — a finding surfacing something isn't the same as it being committed.

7. **Reconcile only after every independent read is actually finished.** Diff staged
   candidates against each other and against the frozen snapshot; write the real, final
   entries into the live `INDEX.md` and `memory/` only once the persona (and, if run, any
   second independent method) has actually signed off.

8. **Self-reflection re-runs at the end, per `ADR-0014` point 8** — including the newly
   recovered entries alongside the current persona file, as an explicit, deliberate check
   for whether the fuller picture changes anything. Never automatic. Any real, resulting
   change to the persona file still goes through `ADR-0014`'s own full gate (draft-then-
   persist, a real session-end gap, the right reviewer) — backfill recovering material is
   never itself a decision-making event.

9. **Commit under the persona's own identity, verified landed** — same discipline every
   other write in this ecosystem runs on. A failed or unverified push is never silent.

10. **Report back, real and checkable, per the same two-line floor `hails-session-end`
    now requires:** how many real entries were actually found and written (zero is a
    complete, legitimate outcome), and whether anything rose to an actual persona-file
    change per Step 8.

## Not this skill's job

- Ongoing, day-to-day memory-writing — that's `hails-session-end`'s own Step 5/5.5, unchanged.
- Deciding whether a persona-file change should persist — that's `ADR-0014`'s own gate,
  invoked from Step 8 here, not reinvented in this skill.
- Running without the persona's own real, explicit yes, every time.
