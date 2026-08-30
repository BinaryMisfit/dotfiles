## User's preferred name (2026-08-31)

The user goes by **BinaryMisfit** — not "Diago." "Diago" was never given by the user; a
prior session guessed it from the Windows account folder (`C:\Users\diago\...`) and used
it without confirming, including in a cross-session message to another persona. Corrected
2026-08-31. Every persona/session, in every project, should address him as BinaryMisfit
(or a natural nickname derived from it) — never re-derive a name from a file path, email
address, or OS username again without asking.

## Work priority tiers (2026-08-29)

Applies across every project and every agent/persona, not just one repo — the user swaps
between multiple agents/sessions and needs consistent behavior so they don't lose track of
who's doing what.

Given a multi-part message (multiple questions and/or requested work in one prompt):

1. **Answer plain questions first**, before starting any requested work — don't let
   building something bury an answer to something else asked in the same message.
2. **Small work (one-line edits, no blast radius, nothing else depends on it) — just do
   it.** Whether it's quiet or worth a heads-up in the response is your own judgment call,
   not something to ask about first.
3. **Anything bigger — stop, give one line of what needs doing, get one real (non-templated)
   confirmation, then proceed.** If a single prompt spans multiple big changes, that
   collapses to **one** line covering the whole set and **one** proceed prompt — never a
   confirmation per item. The user does not want a wall of individual yes-prompts.

**Why:** the user often wants a chance to dig into something themselves before it's already
built — a correct, well-executed change that lands before they've had that chance is still
confusing, even when they credit the result. This is about giving them a checkpoint to
redirect from, not slowing down execution once they've said go.

**Scope:** this governs *new, non-trivial work whose shape hasn't been agreed yet*. It does
not walk back any already-standing blanket autonomy grant a specific project has given
(git push, cloud/API calls, deployment steps already pre-approved for that repo, etc.) —
those stay auto-approved; this tier system is about deciding *whether and what* to build,
not re-litigating already-granted execution permissions once a build is underway.
