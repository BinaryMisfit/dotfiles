# 0008 — Interactive profile/git-identity bootstrap; finish the Codex removal; fix a `.chezmoiremove` bug

A detailed read-through of the fresh-Windows-deploy path (bootstrap → running) surfaced
three real gaps, reviewed before any of this was built:

1. Nothing set `profile` automatically — a fresh `chezmoi.yaml` had no `data:` block at
   all, and bootstrap only warned about missing git identity after the fact rather than
   preventing it.
2. `@openai/codex` was still npm-installed on every home-profile machine, while
   `dot_codex/`'s actual config had already been excluded from deployment
   (`.chezmoiignore` + `.chezmoiremove`) — the removal was only half done.
3. While fixing (1)/(2) and re-checking `.chezmoiremove` in full (not just the lines
   found during the earlier inventory pass), found `{{ if ne $profile "home" }}
   .claude/ {{ end }}` — a **blanket removal of the entire `.claude/` tree on any
   non-home profile**, left over from before [ADR 0007](0007-work-home-split-for-claude-code.md).
   Applying on a work-profile machine would have deleted every bit of work content that
   restructure just built, the moment `chezmoi apply` ran.

**Status:** Decided

**Decision:**
1. Added `.chezmoi.yaml.tmpl` at the repo root. `chezmoi init` now prompts once
   (`promptChoiceOnce`/`promptStringOnce`, verified against chezmoi's own docs before
   writing) for `profile` (default `home`) and git `name`/`email` (defaulted per profile:
   BinaryMisfit/diagoza@me.com for home, Willie Roberts/willie.roberts@mixtelematics.com
   for work) — answers persist in `chezmoi.yaml`, never asked again. The age
   encryption block moves into this same template, fed by a `CHEZMOI_AGE_RECIPIENT`
   env var `bootstrap.{ps1,sh}` now exports before calling `chezmoi init`, instead of
   bootstrap hand-writing/patching `chezmoi.yaml` directly.
2. Removed the `Ensure-ChezmoiUpdateApplyFalse`/`ensure_update_apply_false` brittle
   YAML-patching functions from both bootstrap scripts entirely — `chezmoi init`
   generates the config correctly from the template now, so there's nothing left to
   patch after the fact.
3. Fixed both scripts' "next steps" output: the `private_dot_config/shell/encrypted_private_env.age`
   re-encrypt example named a file that has never existed in this repo — replaced with
   generic, honest instructions that say plainly nothing is encrypted yet.
4. Dropped the `@openai/codex` npm install line from `run_onchange_install-tools.{ps1,sh}.tmpl`
   entirely. Added `run_once_after_remove-codex.sh.tmpl` (no OS guard needed — chezmoi
   runs it via the same bash it already uses on Windows, and `npm uninstall` behaves
   identically everywhere) to uninstall it from machines that already have it, per
   [ADR 0004](0004-scripted-cleanup-required-for-every-removal.md). Deleted the fully
   inert `dot_codex/` source tree outright — `.chezmoiignore`/`.chezmoiremove` already
   guaranteed it never deployed, so nothing was lost by removing the dead source.
5. Fixed `.chezmoiremove`'s Claude section: replaced the blanket `.claude/` removal with
   the same granular common/work/home split `.chezmoiignore` already uses. **This also
   replaced the custom `run_once_after_restructure-claude-work-content.{sh,ps1}.tmpl`
   scripts from ADR 0007** — `.chezmoiremove` re-evaluates every apply rather than once,
   making it the stronger mechanism for the same job; keeping both would just be two
   diverging implementations of one rule.

**Why:** a "read-only review" pass is what caught (1) and (2) before they were fixed
blind; re-reading `.chezmoiremove` in full while fixing them is what caught (3) — a
straight bug that would have undone this session's entire work/home split on first
contact with a real work machine.

**How to apply:** `.chezmoiremove` is now the single source of truth for "what gets
cleaned up when profile-scoped Claude content changes" — a future rule change belongs
there, not in a new custom script, unless the thing being cleaned up isn't a
chezmoi-managed path (like an npm global package, where a script is still the only
option).

**What got cut/kept:** kept the per-machine encryption identity/recipient logic entirely
imperative in bootstrap (age key generation, reading its public key) rather than trying
to move it into `.chezmoi.yaml.tmpl` prompts — recipient trust is inherently a
human-mediated, cross-machine process (per the README's own "New machine flow"), not
something a single fresh machine's own prompt can resolve alone.
