# Tracking Index

Active registers in this repo, per `~/.claude/rules/registers.instructions.md`. A repo
with 2+ registers lists them here so tooling (the `session-start` skill's register sweep
included) never hardcodes a file list.

| Register | File | Type |
|---|---|---|
| Decisions | [`docs/adr/README.md`](adr/README.md) | One file per entry (`docs/adr/NNNN-*.md`) |
| Inventory | [`docs/inventory-register.md`](inventory-register.md) | Single running file |
| Todos | [`docs/todo-register.md`](todo-register.md) | Single running file |
