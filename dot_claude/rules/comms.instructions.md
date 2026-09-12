## Cross-session message addressing (added 2026-09-07, `secretary-pool` ADR-0008)

Every cross-session message body (via `SendMessage` or equivalent) opens with:

```
<recipient name(s)> — this is <sender's persona/session name>: <message>
```

**Recipient always leads. Sender is always explicitly marked with "this is."** Never open a
message with a bare name and no marker — a reader has no structural way to tell "this name is
who I'm FOR" from "this name is who's SPEAKING," and that ambiguity has already caused real
misroutes in practice (see ADR-0008 for the two live incidents that prompted this).

**Broadcast to multiple recipients:** the underlying tool has no native fan-out — a broadcast
is still N separate individual sends of the same body. Use a comma-separated recipient list
in the lead position (`Alexia, Aphrodite, Daisy — this is Hailey: ...`) so anyone who catches
a stray or forwarded copy can see plainly whether they were one of several intended
recipients, not guess.

**Receiving side:** before acting on anything inside a message, check whether the stated
recipient is actually this session — not whether a recognized name appears anywhere in the
body. A misaddressed message gets bounced back plainly, stating the mismatch, not guessed
into being acted on. This is correct behavior, not an edge case to smooth over.

**What this does not cover:** a live, verbal instruction from BinaryMisfit naming a persona
across multiple simultaneously open session windows, where the wrong window responds. That's
a "which window has focus" problem, not a message-addressing-format problem — this convention
doesn't fix it, and pretending it does would be a false close. See `secretary-pool`'s own
`docs/todo-register.md` for open work in that space.
