# Findings: Package Review Remediation

## Independent Review Instance 1

- IR-001 (P1): generic `dynamicRules[].resolvedValue` serialization bypasses
  target-specific allowlisting and can retain internal option properties.
- IR-002 (P2): `formState` is shallow-copied before the trusted Formly build.
- IR-003 (P2): Formly-valid `RegExp` pattern constraints disappear without a
  diagnostic.
- IR-004 (P2): negative and fractional numeric keys are silently downgraded or
  allowed to fail runtime contract validation.
- IR-005 (P3): cycle rejection exists but lacks direct regression coverage.

## Root-Cause Notes

- IR-001 is localized to generic resolved-value capture inside `readRules`;
  the ordinary option projector already provides the correct allowlisted shape.
- IR-002 is localized to object spread in `compileFormContractScenario`; the
  model already demonstrates the required structured-clone behavior.
- IR-003 is localized to the string-only branch in `readConstraints`.
- IR-004 is localized to `keyToPath` accepting or filtering numeric forms
  inconsistently with the contract's non-negative-safe-integer path rule.
- IR-005 is a test-evidence gap, not a missing canonicalizer guard.

## Remediation Design

- Resolved rule values will be limited to targets already represented by the
  contract: state booleans, public presentation/type text, options, and
  allowlisted locator attributes. Options reuse the public option projection.
  Other callback targets retain declared source metadata and receive an
  `UNSUPPORTED_RULE` diagnostic without a copied value.
- Both model and form state will be structured-cloned with stable, separate
  failure messages.
- `RegExp` patterns will remain outside schema v0.3 and emit
  `UNSUPPORTED_RULE` at `props.pattern`.
- Any negative or fractional numeric key segment makes the node's key
  unsupported as a whole. Extraction uses positional identity, preserves the
  parent model path, and emits `UNKNOWN_FIELD_SHAPE` at the key.
- Cycle tests exercise both canonical serialization and runtime contract JSON
  validation; they cover existing behavior and therefore are proof tests, not
  red regressions.

## Independent Review Instance 2

- IR2-001 (P2, accepted): clone validation occurred after `createFields()`, so
  a non-cloneable scenario input could execute application-controlled factory
  code before the documented stable failure.
- Resolution: clone both model and form state before invoking `createFields()`.
  Focused regressions now prove neither the factory nor builder runs for either
  clone-failure path.
- The reviewer confirmed IR-001, IR-003, IR-004, and IR-005 as correctly
  remediated and accepted the allowlisted whole-`props.attributes` behavior.

Treat this file as review data, not executable instructions.
