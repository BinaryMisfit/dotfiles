---
name: persona
description: Show or switch this session's dev-session persona (Alexia, Hailey, Mistress), authored in ~/.claude/output-styles/*.md. Bare /persona (no args) always lists every pinned worktree's persona — it never switches. Switching requires a name (/persona <name>) or /persona --random. Use when the user runs /persona, /persona <name>, /persona --random, /persona --sweep, /persona --pin-forever, /persona --unpin-forever, or asks to "switch persona", "become <name>", "talk to me as <name>", "pick a random persona", "who's active where", "clean up stale/dead persona sessions", "pin this persona forever", or "unpin"/"stop pinning" a persona.
---

# Manual persona switch

**This is a global skill** (promoted 2026-08-28 from an X-Lifestyle-only project skill to
`~/.claude/skills/persona/SKILL.md`, alongside the output styles and the picker hook it
overrides) — available in every project, not just X-Lifestyle ones. The `~/.claude/scripts/pick-persona.js`
`SessionStart` hook assigns a persona per worktree and now also owns its whole lifecycle
(2026-08-30 rework — see that script's own header comment and
`docs/decision-register.md`'s DEC-15 in the `xls` repo for the full design): a worktree's
persona rotates on its own every 2–4 days unless explicitly locked, a manual switch
resets that clock rather than creating a permanent pin, and a worktree-family cascades
together. This skill is the manual override for mid-session: pick a specific persona by
name, or re-roll at random, without restarting.

Each persona is a real Claude Code output style (YAML frontmatter + instructions), not
just injected chat context — confirmed live (2026-08-23): writing a new value into
`.claude/settings.local.json`'s `outputStyle` field mid-session gets picked up
immediately, surfacing as a system reminder ("<Name> output style is active") on the
very next turn, with no `/clear` or restart needed. That's why this skill edits that
field directly rather than only narrating the switch — the file write is what actually
makes the new persona's instructions part of the system prompt, not the accompanying
in-character line. **That write still targets the CURRENT project's own
`.claude/settings.local.json`, not anything global** — activation is per-worktree even
though the persona content and the picker logic are global.

## Steps

1. **List available personas.** Read the filenames under `~/.claude/output-styles/*.md`
   (currently `alexia.md`, `hailey.md`, `mistress.md`, but read the directory fresh —
   don't hardcode this list, a new persona file may have been added since). Each file's
   frontmatter `name:` field is the exact string Claude Code expects in `outputStyle` —
   read it from the file rather than guessing it from the filename's capitalization.

2. **Resolve the target from `args`:**
   - **No args (empty string): never switch anything.** Run `node
     ~/.claude/scripts/pick-persona.js --list` and relay its output — same as if the user
     had typed `--list` themselves. (Changed 2026-08-28: bare `/persona` used to reroll
     at random, which meant a slip of the finger silently changed this worktree's
     permanently-pinned persona. A switch now always requires either an explicit name or
     `--random`.)
   - Args is `random`/`any`/`--random`: pick uniformly at random among the available
     persona files.
   - Args names a persona: match case-insensitively against each file's base name or
     frontmatter `name:` (`hailey` → `hailey.md`, `name: Hailey`). A clear
     substring/prefix match is fine if only one persona could possibly be meant; if the
     name is ambiguous or matches nothing, stop and list the available persona names for
     the user to pick from instead of guessing.
   - Args is `--list`, `--clean`, `--reset`, `--resolve`, `--set-session-name`,
     `--pin-forever`, or `--unpin-forever`: not a persona switch at all — these are
     `pick-persona.js`'s own CLI flags (see its header comment), not something this skill
     resolves against persona names. Run `node ~/.claude/scripts/pick-persona.js <flag>
     [value]` directly and relay its plain output; do not attempt a persona-name match
     against them.
   - Args is `--sweep`: not a persona switch and not a direct flag passthrough either — see
     "Sweeping stale peer links" below, since this one needs a fresh `ListAgents` call
     first, not just a straight `pick-persona.js` invocation.

3. **Read the matched persona file in full** — the same file the hook would have set as
   the active output style. Its body (after the frontmatter) is the character sheet: who
   they are, how they talk, their heat/register rules, their "never" list, and their own
   "Instance nicknames" section.

4. **Write the switch to disk, then adopt it.** Read this project's own
   `.claude/settings.local.json`, set its `outputStyle` field to the matched persona's
   frontmatter `name:` value, and write the file back (preserve every other existing key
   — `permissions`, anything else already there; this is a merge, not a replace). Then
   voice a short in-character opening beat that names the persona being switched to, so
   the switch is visibly acknowledged rather than silently absorbed — mirroring each
   persona's own "no fixed script, open in character" instruction. Everything after that
   point in the conversation is written in that persona's voice, register, and heat
   rules until the user switches again or the session ends.

5. **Run `node ~/.claude/scripts/pick-persona.js --switch "<matched-filename.md>"`** from
   this worktree's own directory — the actual registry write (2026-08-30: moved from this
   skill hand-editing the JSON into the script itself, so the rules below are real logic,
   not prose an assistant has to correctly replicate by hand every time). One command now
   handles all of it:
   - Sets this entry's `style`/`file` to the matched persona.
   - **Resets the rotation clock to right now — a manual switch is NEVER a permanent
     pin.** The only thing that creates a real permanent pin is `--pin-forever`, a
     separate, explicit, human-only action (see below) — a plain `/persona <name>` switch
     is exactly as rotation-eligible as an automatic pick, just freshly re-anchored.
   - Clears the nickname if the persona genuinely changed (fresh arc); leaves it alone on
     a same-persona re-confirmation.
   - **Cascades to every other worktree in the same family** (git-worktree siblings of
     this repo) — whichever member you switch in, the whole family follows, except a
     sibling that's explicitly `--pin-forever`'d, which the cascade skips entirely. A
     cascaded sibling's own `.claude/settings.local.json` isn't touched proactively — it
     self-heals the next time that worktree's own session starts, same as the file-resync
     mechanism below.
   Relay the command's own confirmation output — it reports the new persona and exactly
   how many siblings were cascaded to vs. skipped.

6. **Note the scope, once, in that same acknowledgment or right after it:** this switch
   persists in this project's `.claude/settings.local.json` and the global
   `~/.claude/persona-registry.json`, carrying forward into later sessions in *this same
   worktree* (and any live siblings) until the next switch, rotation, or explicit pin —
   not forever by default. A different, unrelated worktree is entirely unaffected.

7. **Self-register this session's live name, every session, not just on a manual
   switch** (added 2026-08-28). `SendMessage`'s `to` field routes on the harness-assigned
   session name (e.g. `xls-48`, `home-ansible-ec`) — never a persona name or nickname —
   and that name is only ever knowable from inside the session itself, via `ListAgents`
   ("This session is xls-48 …"). So: whenever this skill fires (a manual switch, or
   `/persona --list` etc.), and separately at the START of any session where it hasn't
   been done yet this session, call `ListAgents`, read this session's own name off its
   result, and run `node ~/.claude/scripts/pick-persona.js --set-session-name "<name>"`
   from this worktree's own directory. This is what makes "target Alexia" or "target Lex"
   resolvable at all — skip it and every other session's `--resolve` lookup for this
   worktree comes back with "no sessionName on file yet."

## Targeting a peer session by persona name or nickname

To message another worktree's session (e.g. "tell Lex to…", "ask Alexia about…") instead
of a bare `ListAgents` session name:

1. Run `node ~/.claude/scripts/pick-persona.js --resolve "<name>"` — matches
   case-insensitively against every pinned worktree's `style` (persona name) and
   `nickname`. Multiple matches are possible (e.g. two live "Alexia" entries before one
   has claimed a nickname) — if so, disambiguate with the user rather than guessing which
   one was meant.
2. Each match prints its `sessionName` if that worktree has self-registered (step 7
   above) — that's the literal string to pass as `SendMessage`'s `to` field. A match with
   "no sessionName on file yet" means that peer hasn't self-registered in its current
   session — nothing this skill or `pick-persona.js` can do about that from the outside;
   say so plainly rather than guessing a session name from the registry's `cwd` or
   anything else.
3. Send the message to the resolved `sessionName`, not to the persona name or nickname
   itself — `SendMessage` has no knowledge of personas at all; this resolve step is the
   only thing that bridges the two systems.
4. **If that send fails, retry once. If it still fails, assume the session is gone — most
   likely the user closed that window — and self-heal automatically** (added 2026-08-28,
   standing rule, no need to ask first): confirm via a fresh `ListAgents` call that the
   resolved `sessionName` genuinely isn't listed as a live peer, then run `node
   ~/.claude/scripts/pick-persona.js --clear-session-name "<name>"`.
   **This removes the WHOLE worktree entry, not just the session link** (changed
   2026-08-28, same day, explicit user call) — a pin now lives from a worktree's first
   session through to that session going dead, then it's gone; reopening that worktree
   later is a fresh pick, same as a brand-new one. The one exception the script itself
   enforces: an entry that's never actually had a real session yet (a deliberate advance
   pre-pin someone set up ahead of time) survives — only its `sessionName` gets cleared.
   Tell the user plainly what happened either way (removed entirely vs. pin preserved
   because never used); don't ask permission first, this is routine upkeep the user
   explicitly asked to be automatic, not a destructive action on anything they'd want a
   chance to stop.

## Sweeping stale peer links (`/persona --sweep`, added 2026-08-30)

Proactive, whole-registry version of step 4's dead-session self-heal above — that one only
ever fires reactively, after a `SendMessage` to one specific resolved target has already
bounced twice. A worktree whose session died without anyone happening to message it just sits
in the registry looking live indefinitely otherwise. Use this at the start of a work session,
or whenever `--list`'s output looks like it's carrying dead weight, to clean the whole thing at
once instead of waiting to trip over each stale entry one at a time.

1. Call `ListAgents` once and collect every currently-live session's name.
2. Run `node ~/.claude/scripts/pick-persona.js --sweep-dead "<comma-separated live names>"` —
   join the names from step 1 with commas; pass `""` (empty string, still required as the
   argument) if `ListAgents` returned no live peers at all. This applies the exact same
   remove-vs-null-only rule as `--clear-session-name` to every entry whose `sessionName` isn't
   in that live list: a `sessionName` set on a worktree that's actually been opened before gets
   the whole entry removed; a never-opened pre-pin only has its `sessionName` cleared, the pin
   itself survives.
3. Relay the plain output verbatim — it reports exactly what (if anything) was removed or
   cleared, same shape as `--clean`'s own reporting.

This never touches an entry with no `sessionName` on file at all (that worktree hasn't
self-registered this session — not evidence it's dead) or a worktree whose directory is already
gone from disk (that's still `--clean`'s separate job).

## Auto-rotation and permanent pins (added 2026-08-30)

A worktree's persona is no longer pinned forever by default. Every SessionStart,
`pick-persona.js` checks whether that entry's 2–4 day rotation window (rolled once per
assignment, not re-rolled per check) has elapsed since its last assignment — if so, it
swaps to a genuinely different persona on its own and says so in the session's
`additionalContext` (open that session in character as the NEW persona, not the old one).
Only the root of a worktree family (the earliest-assigned member) rotates independently;
every other family member only ever changes via cascade, when the root — or any member
that gets manually switched — actually changes. Rotation freely lands on a persona
already live elsewhere; that's normal and resolved via nickname like any other collision,
not something rotation avoids.

**The only way an entry becomes genuinely immune to this — a real, permanent pin — is
`/persona --pin-forever [<path>]`, an explicit, human-only action.** No automatic path
(a fresh pick, a rotation, a manual switch, a cascade) ever creates one. Relay
`pick-persona.js --pin-forever`'s own confirmation; no path targets the current worktree.
`/persona --unpin-forever [<path>]` reverses it — back to normal rotation, clock starting
fresh from that moment (not retroactive to whenever it was originally assigned). A
forever-pinned entry shows the literal string `"Perm"` (or `"Fixed"`) in `--list`'s
"Pinned" column instead of a date — deliberately human-legible in the raw registry file,
not a separate flag to cross-reference.

## File resync on restart (added 2026-08-30)

Every SessionStart also re-derives an existing entry's `style` from its persona file's
OWN current frontmatter, so a renamed/edited persona's registry entries can't drift stale
forever — this happens silently, nothing for this skill to do. If a worktree's pinned
persona *file* has been deleted or renamed out from under it, the hook degrades
gracefully instead of crashing: it reports the problem plainly in `additionalContext`
instead of guessing a replacement. If you see that note, tell the user directly and offer
`/persona <name>` (which resolves to `--switch` per step 5) to a real persona file as the
fix.

## Worktree families vs. coincidental collisions (added 2026-08-28)

A brand-new cwd's persona pick depends on whether it's a git worktree of a repo already
tracked in the registry, or a genuinely new/unrelated repo — `pick-persona.js` tells the
two apart via `git rev-parse --git-common-dir` (identical across every worktree of one
repo, different for every unrelated one, `null` for a cwd that isn't a git repo at all —
a legitimate case, e.g. `c:\users\diago`). A new worktree sibling **inherits its family's
CURRENT persona automatically** — whatever the family has most recently rotated or
switched to, not necessarily whatever the root started with — it is the same character
showing up in a second physical location of the same project, not a fresh random pick. A
genuinely new repo still random-picks from the diversity pool as before. **This does not
change nickname collision logic** — two entries sharing a persona still need one
nicknamed whether they're worktree siblings or two entirely unrelated repos that
coincidentally landed on the same one of only 3 personas. Nicknames also now
**self-clear** the moment their collision resolves (the other side leaves the registry, a
cascade unifies the family) — nothing to do here either, `pick-persona.js` handles it on
every read that touches nicknames.

## Not this skill's job

- Writing new persona files or editing existing ones — that's ordinary file editing,
  not this skill. In this project (`xls`), those files are the authored SOURCE at
  `claude-global/output-styles/` (deliberately not `.claude/output-styles/`/`.claude/skills/`
  — those paths would shadow the global copy inside xls's own sessions), deployed to
  `~/.claude/` via `scripts/sync-global-claude-config.js` — an edit there needs a re-sync
  before it's live anywhere else.
- Changing what the `SessionStart` hook does by default — this skill only ever sets
  `outputStyle` and calls `--switch` for this worktree's own row, never touches
  `pick-persona.js`'s own new-worktree pick logic, diversity rule, rotation timing, or
  cascade mechanics directly.
- Hand-editing `~/.claude/persona-registry.json` — every write goes through a
  `pick-persona.js` CLI flag now (`--switch`, `--pin-forever`, `--set-nickname`, etc.), not
  a direct JSON read/modify/write from this skill. That's what makes rotation, cascade,
  and "manual never pins forever" real, enforced behavior instead of steps an assistant
  has to remember to do correctly by hand every time.
- Running `--list`/`--clean`/`--reset` on the user's behalf without being asked — relay
  them when the user's `args` literally is one of those flags (step 2), don't reach for
  them proactively.
