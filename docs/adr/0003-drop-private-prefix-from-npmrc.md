# 0003 — Drop `private_` prefix from npmrc

Following [0002](0002-private-prefix-is-not-encryption.md): `private_dot_npmrc` held only
`loglevel=error` — nothing worth even permission-gating, let alone encrypting. The
`private_` prefix on it implied a protection level the file never needed and (per 0002)
chezmoi never actually provided beyond file permissions.

**Status:** Decided

**Decision:** Rename `private_dot_npmrc` to `dot_npmrc`.

**Why:** a prefix that implies protection on a file with nothing to protect is misleading
noise — it should be reserved for paths that actually warrant restrictive permissions
(`private_dot_ssh/`, `private_dot_config/`).

**How to apply:** target path is unaffected (`~/.npmrc` either way) — this only changes
the source file's own name in the repo.
