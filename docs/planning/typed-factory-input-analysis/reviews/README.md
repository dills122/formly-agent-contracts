# Review Cycles

## Research and design cycle — complete

The review target uses a blind-first sequence: reviewers read
[the neutral bootstrap](../review-bootstrap.md), inspect the change, and only
then read [the author explanation](../author-explanation.md). The
[review packet index](../review-packet.md) records that order.

Rounds are sequential so accepted findings from each round are reconciled before
the next fresh-context reviewer starts:

1. Codex independent engineering review
2. Claude independent engineering review
3. Codex final independent engineering review

Each round records the reviewer output, maintainer disposition, changes made,
and current verification evidence.

- [Round 1 — Codex](./round-1-codex.md): five findings accepted and reconciled.
- [Round 2 — Claude](./round-2-claude.md): one ownership blocker and two test
  gaps accepted and reconciled.
- [Round 3 — Codex](./round-3-codex.md): two localized research/design blockers
  and two hygiene findings accepted and reconciled.

## Production implementation cycle — complete

The implemented `TFI-MVP-1`, `TFI-MVP-2`, `TFI-MVP-3`, and `TFI-MVP-5`
workflow underwent a separate three-instance fresh-context review cycle.
Each instance reviews the complete implementation branch and the implementation
plan, not only the previous review's remediation patch.

1. [Implementation round 1 — Codex](./implementation-round-1-codex.md): two P1
   and three P2 findings accepted and reconciled.
2. [Implementation round 2 — Codex](./implementation-round-2-codex.md): three
   P1, two P2, and one P3 finding accepted and reconciled.
3. [Implementation round 3 — Codex](./implementation-round-3-codex.md): three
   fail-closed findings and two documentation drifts accepted and reconciled.

## Post-remediation implementation cycle — final review pending

The maintainer explicitly requested a new review cycle after all three
production instances were reconciled. It is a distinct cycle, not a
renumbering or silent extension of the completed three-instance cycle above.
The maintainer subsequently capped this cycle at two instances by asking for
one last review after the first reconciliation.

1. [Post-remediation round 1 — Codex](./post-remediation-round-1-codex.md): two
   P1 and one P2 findings accepted and reconciled.
2. Final post-remediation round — pending.
