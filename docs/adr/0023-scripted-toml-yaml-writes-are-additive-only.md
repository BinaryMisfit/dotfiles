# 0023 — Scripted TOML/YAML writes are additive-only

TODO-5's self-heal work needs a `run_once` script to patch `hooks.apply.pre` /
`hooks.apply.post` into the user's local chezmoi config (`chezmoi.toml` or `chezmoi.yaml`)
— a sentinel-marker mechanism to detect an interrupted `chezmoi apply` (see the TODO-5
entry in `docs/todo-register.md`). That file is explicitly documented in this repo's
`CLAUDE.md` (Template Data section) as **not managed by this repo** — it's local,
machine-specific config that chezmoi can't manage through itself (chicken-and-egg), and it
may already carry the user's own unrelated settings or hooks. This raised a real question
before any script touching it could be written: what happens if this repo's script and the
user's own local config disagree at the same key?

**Status:** Decided

**Decision:** Any script in this repo that writes into a `.toml`/`.yaml` file — whether a
file this repo owns or a local/user-owned one such as chezmoi's own config — is
**additive-only**. It may freely add, update, or delete the specific keys it itself
manages, on any future run (full lifecycle control, but scoped strictly to its own keys).
It must never strip or rewrite a key it doesn't own. If a pre-existing local value already
occupies one of the key paths the script wants to manage, that's a genuine clash: the
script halts and surfaces it as a decision point for the human — it never silently picks a
winner.

**Why:** A local/machine config file can carry state the user set up themselves, entirely
outside this repo's knowledge — their own hooks, their own settings at the same key path a
new script wants to claim. A naive "write my config block, overwrite what's there" script
risks silently destroying that. Additive-only writes plus a hard stop on real collisions
keeps scripted config patching safe and idempotent without requiring the script to somehow
know everything the user might have already configured.

**How to apply:** Every future `run_once`/`run_onchange` script (or any other script) in
this repo that writes into a toml/yaml file follows this shape: read the existing file,
add or update only the keys it manages, leave every other key untouched, and detect a real
key collision with something it doesn't own by halting and reporting rather than choosing
for the user. The TODO-5 `hooks.apply.pre`/`hooks.apply.post` installer is the first
concrete application of this rule.
