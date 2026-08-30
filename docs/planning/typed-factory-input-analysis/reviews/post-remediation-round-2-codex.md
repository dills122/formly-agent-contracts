# Post-remediation round 2 — Codex

- Reviewer task: `01a05049-bbbc-72f0-8162-e7d3ef5a848e`
- Review instance: 2 of 2 in the explicitly capped post-remediation cycle
- Reviewed base: `8a856d3629c7fa099c4bac08447f98e8a07248d1`
- Reviewed head: `3bfe5aa3a4fa888dc9b5a377ab3d9b7bb28cb05d`
- Initial verdict: not ready
- Final disposition: all merge-blocking findings accepted and reconciled; no
  further reviewer started because the maintainer capped this cycle at two
  instances

## Accepted findings and reconciliation

1. A property-count traversal limit could leave the first 64 properties
   eligible for generated helpers while analysis reported truncation. Any
   `FACTORY_TYPE_ANALYSIS_TRUNCATED` diagnostic now disables automatic
   materialization for the complete factory input and leaves every analyzed
   property unsupported for review.
2. An unbounded static object key could be copied into a storage path and then
   into local review or generated source. Storage paths now accept at most 16
   segments, 120 characters per segment, and 480 rendered characters, reject
   control characters, and degrade to `unsupported-storage` without copying
   the rejected key.
3. Scaffold projection discarded the analyzer's bounded type-hazard `path`,
   making nested `any`/`unknown` findings less actionable. Local review now
   preserves safe paths, replaces unsafe paths with `$unavailable`, includes
   the path in diagnostic identity, and prints review diagnostics through the
   CLI.

Focused regressions cover global truncation refusal, storage-key redaction,
precise nested type paths, unsafe-path redaction, and CLI rendering. The final
repository evidence is recorded in the parent progress log.

## Fast follows

These are useful hardening additions, not MVP merge blockers:

- Extend the packed-consumer smoke test to run `author-factory-inputs` and
  semantically compile its draft against the packed compiler harness.
- Add a separate explicit resource budget to the factory-body usage AST walk.
  Type traversal and emitted paths are bounded today; the source-use walk is
  deterministic but does not yet have its own node cap.
- Investigate whether workspace-owned Observable subclasses with additional
  behavioral members need application-member analysis beyond canonical
  emission recovery. The current analyzer intentionally avoids expanding
  inherited RxJS implementation internals.
