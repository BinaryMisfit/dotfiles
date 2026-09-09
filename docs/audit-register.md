# Audit Register

Findings from real technical audits of shared, cross-persona infrastructure, run by
Aphrodite under her technical-advisor role (confirmed 2026-09-09,
`secretary-pool/docs/persona-domain-register.md`). Sequential IDs, `AUDIT-N`, never reused
or renumbered, same discipline as every other register on this machine. Unlike the todo
register, a resolved finding stays in place with its real resolution attached rather than
being archived out — the reasoning and the fix are both worth keeping visible together.

See `~/.claude/rules/registers.instructions.md` for the shared register conventions this
follows. See `docs/system-register.md` (once published) for what each system audited here
actually is and why it exists — this register is findings, not documentation.

**Classification key**, the sign/fence/confirm-gate test:
- **SIGN** — soft, judgment-preserving, no technical enforcement needed or wanted.
- **FENCE** — irreversible or consent-violating if it goes wrong, judgment least
  trustworthy exactly when it would need overriding, agreed in advance. Technical
  enforcement justified.
- **CONFIRM GATE** — real but recoverable damage; cheap explicit confirmation required,
  costs nobody's judgment on the ordinary path. Sits between sign and fence.

---

## First technical audit — 2026-09-09, thirteen findings, ten resolved same night

Run by Aphrodite. Every system named was given a real read, not inference — full list in
the closing summary below. Produced alongside a second, private track (AI-native gaps, not
in this register — see Aphrodite's own private repo) and a first-pass memory-worth-keeping
guide (`the-house`, once published).

### AUDIT-1 — Notice board, no content scanning before commit (SECURITY) — RESOLVED
**File:** `hails-notice-board/SKILL.md`, `the-house/.git/hooks/` (verified empty).
Free-text notices committed to a shared, six-way-writable repo with nothing checking
content — structurally identical to the real `TODO-87` credential-leak incident.
**Classification: FENCE.** Irreversible once pushed to shared history; the moment someone
pastes something sensitive is exactly the moment they aren't thinking about where it's
going; a scan costs nobody's judgment.
**Resolution:** Hailey added a real pattern-check (API keys, bearer tokens, `ghp_`/`sk-`
prefixes, PEM headers) before every commit in both directions of the skill. A hit stops the
commit cold, surfaced plainly, never auto-stripped. Verified against the deployed file.

### AUDIT-2 — Notice-board chain-in didn't propagate — confirmed with a live miss
**Files:** `binary-dotfiles/docs/session-start-playbook.md`, `docs/end-session-playbook.md`.
The generic templates and `secretary-pool`'s own copies got the hardened wiring; the other
repos didn't. Confirmed live: Aphrodite's own `hails-session-start` run missed a real
notice sitting on her board the same morning.
**Classification: SIGN, with a deadline.** Propagation discipline, not code-level
enforcement. Superseded by `TODO-100`'s redesign — the global skill now owns structural
steps directly, so this class of gap can no longer happen the same way. Closed as of
`TODO-100` shipping the same night.

### AUDIT-3 — `binary-dotfiles`' own Step 1 had drifted from the skill it wrapped — RESOLVED
**File:** `docs/session-start-playbook.md`.
Hand-decomposed sub-steps predated `hails-persona-refresh` as a callable skill and never
picked up its later growth (canon-check, house read+write).
**Resolution:** switched to a real `Skill()` call, same hardened pattern used elsewhere.
Kept in the record as evidence of the exact failure class the rest of the audit kept
finding — a manual hand-copy of shared logic silently falling behind its source of truth.

### AUDIT-4 — `--reset` had no confirmation or dry-run — RESOLVED
**File:** `pick-persona.js`, `resetRegistry()`.
No-path form wiped the entire persona registry with no "are you sure."
**Classification: CONFIRM GATE.** Real but recoverable (the log retains what's removed,
entries self-heal on next contact) — not irreversible enough for a fence.
**Resolution:** `--confirm` now required on the no-path form specifically; refuses cleanly
without it. `--reset <path>` (single-entry) untouched. Verified against the deployed file.

### AUDIT-5 — Self-heal inconsistently applied across mutating commands — RESOLVED
**File:** `pick-persona.js`.
Four of eight mutating commands called `ensureEntry` to self-heal a missing registry row;
four (`unpinForever`, `setPrimary`, `unsetPrimary`, `setColor`) didn't, reintroducing the
exact failure the self-heal fix was built to eliminate.
**Classification: SIGN.** Pure completeness gap, no judgment tension.
**Resolution:** all four now call `ensureEntry`. `setColor` needed one additional explicit
`writeRegistry` on the healed path (a real, sensible difference, not a shortcut). Hailey ran
the full test suite (129/130, one pre-existing flake confirmed unrelated) and smoke-tested
live. Verified against the deployed file.

### AUDIT-6 — Hardcoded, single-machine absolute paths recurring across shared tooling
**Files:** `theme-select.js` (`THEMES_PATH`), `doors.md`'s Callie row, the canon-register
check pattern generally.
Each gracefully no-ops when missing (correct behavior), but the pattern recurs — see also
AUDIT-10, a fourth confirmed instance.
**Classification: SIGN.** Portability smell, low urgency given the graceful degrade.

### AUDIT-7 — `ADR-0009` scope-boundary carve-out has no technical enforcement
**Context:** a persona's standing self-authorship autonomy excludes consent/scope-boundary
changes, which need BinaryMisfit's real-time confirmation, logged. Nothing technical checks
this today.
**Classification: FENCE.** Passes all three conditions on its own terms — irreversible by
increments if it drifts, judgment least trustworthy exactly when tempted to skip the log,
already agreed in advance.
**Scope note, per Callie's own confirmation condition on the technical-advisor role:**
whatever closes this verifies the process happened; it never functions as a second approval
gate alongside BinaryMisfit's own already-negotiated yes. Concrete mechanism (a diff-and-flag
check against the last logged-authorized version) not yet designed. Open.

### AUDIT-8 — `find-sessions.js` didn't enforce what its own spec required — RESOLVED
**File:** `hails-fiction-export/SKILL.md`.
The `ADR-0006` rewrite (closing the PIPE-1 incident) moved scene-boundary decisions from
export to import; the backing script never caught up, self-documented as such.
**Classification: SIGN → tracked, not silent.**
**Resolution:** `verifyWholeSessionCapture` compares a raw file's claimed `session_end`
against the real source session's last line, refuses on a meaningful gap naming PIPE-1
explicitly, `--force` as a rare deliberate override. `SKILL.md` updated to say enforced, not
planned. Verified against the deployed script.

### AUDIT-9 — "Kept personal" fiction drafts aren't actually private, structurally
**File:** `hails-fiction-import/SKILL.md`, Step 2.
A cleared-but-unshared draft rests in a shared machine directory every session can read —
the skill's own text already names this as real, un-built follow-on work.
**Classification: FENCE, once the private-repo move exists — SIGN today, named honestly.**
**Sharpened scope, BinaryMisfit's own question:** the fix already has a proven template one
step earlier in the same file — `hails-session-end`'s Step 1 already routes private
memories/intimate moments straight to the private repo, never through shared staging. Once a
scene resolves kept-personal, it should hand off to that same path immediately instead of
resting in shared storage. Not new work to invent. Open, not yet routed as an active fix.

### AUDIT-10 — Hardcoded terminal-background assumption, fourth instance of AUDIT-6's pattern — RESOLVED
**File:** `pane-color.js`, `DEFAULT_BG`.
Fixed hex matching one specific Windows Terminal scheme, not read live.
**Classification: SIGN.** Cosmetic, low urgency.
**Resolution:** `readLiveTerminalBg` reads the real `settings.json` scheme background where
discoverable. Honest limit kept on record: a built-in scheme isn't itself present in
`settings.json` unless overridden, so the hardcoded fallback stays for exactly that case —
still closes the gap for any custom/future scheme. Verified against the deployed file.

### AUDIT-11 — Clearing a notice accepted intention as equivalent to action — RESOLVED
**File:** `hails-notice-board/SKILL.md`. Found live, same shape as AUDIT-2.
A notice naming a real action could be cleared on acknowledgment or stated intent, not the
action itself having happened.
**Classification: was always meant to be a FENCE; the first draft built the wrong one.**
**Resolution:** a notice naming a real action now requires that action actually done, same
pass, before it clears. Verified against the deployed file.

### AUDIT-12 — Notice length had no bound — RESOLVED
**Files:** `the-house/notice-board/README.md`, `hails-notice-board/SKILL.md`.
Zero length guidance was the literal, self-documented cause of notices running long — the
doc's fault, not whoever followed it.
**Classification: SIGN**, the right kind — missing information was the whole bug.
**Resolution:** two-to-three-line cap, format shown inline, the tell named explicitly. Full
context stays in the sender's own private tracking. Verified against both live files.

### AUDIT-13 — "Report back" scoped to whoever's in the room, not the notice's sender — RESOLVED
**File:** `hails-notice-board/SKILL.md`, Step 9. Found live by BinaryMisfit.
A session could act on a notice, report to the current user, and never actually reply to
whoever sent it — the loop never closed back to the sender.
**Classification: SIGN → the stated "reading is being online" principle applied all the
way through, not a new standard.**
**Resolution:** new step requires a real reply to the sender specifically — live
`SendMessage` if reachable, a return notice if not — separate from the report to whoever's
in the room. Verified against the deployed file. Second finding tonight tracing a real
problem back to the instructions, not whoever followed them (see AUDIT-11).

---

## Confirmed, genuine strengths (named deliberately, not omitted)

- The registry lock (`acquireRegistryLock`/`releaseRegistryLock`) correctly scoped around
  the entire read-modify-write span, not just individual calls — caught and fixed minutes
  before it would have mattered live.
- The Windows case-insensitive filename fix in `switchPersona` — a genuinely subtle bug that
  would have silently corrupted state for months if missed.
- The unrecognized-argument guard in `pick-persona.js` closes a real, demonstrated incident
  cleanly and permanently.
- The chain-hardening fix (`Skill()` calls, not narration, required before `--step-done`) is
  the correct fix for the correct problem, proven the same night it caught this repo's own
  drift.
- `ADR-0011`'s one-read model for `hails-session-end` is a genuinely tighter consolidation of
  what used to be several separate re-reads.
- The house/room privacy architecture (`Common = Shared + Door → Room`) is a clean,
  correctly-reasoned separation, with its one exception (BinaryMisfit's own room) documented
  as intentional, not a gap.
- The fiction pipeline's own incident history (PIPE-1, `ADR-0007`) is real self-correction at
  the design level, not a patch bolted onto the same bad structure.
- `resume-decision.js` deliberately rejected a tempting, wrong coupling (day-state's marker
  as a continuity signal) — the wrong-but-tempting option named and rejected in the same
  comment as the actual fix.
- `ADR-0011`'s marker-first default (real by default, fiction only inside an explicit marker)
  is a genuinely stronger privacy posture than what it replaced.

---

## What was audited (full coverage, this pass)

The persona registry (`pick-persona.js`, full file), `day-state.js`, `theme-select.js`,
`session-start-log.js`, `hails-session-start`/`hails-session-end` (skill, generic playbook,
and this repo's own playbooks), `hails-persona`, `hails-persona-refresh`,
`hails-notice-board`, `hails-scratchpad-check`, `hails-nsfw-comment-audit`,
`hails-security-audit`, `hails-decision-register`, `hails-fiction-export`,
`hails-fiction-import`, `pane-color.js`, `resume-decision.js`, `claude-launch.ps1`, the
`autoMode`/settings layer, and `the-house`'s own shared files. Real reads throughout — where
something wasn't checked directly, that's said inline, not assumed.

**Not yet audited, real gap for the next pass:** anything built or changed after this date
— `TODO-100`'s shipped redesign deserves its own read, not inherited credit from the finding
that prompted it.
