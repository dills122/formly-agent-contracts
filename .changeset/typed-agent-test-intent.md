---
'@formly-contract/schema': minor
---

Add the CTX-2 typed test-intent and closed diagnostic contracts plus the first
pure, deterministic validator and canonical execution-plan surface. Plans are
bound to their exact source intent, preserve value-classification authority,
and fail closed during revalidation when current context can no longer produce
the exact same plan. Pattern-constrained literals and hostile object/coercion
inputs are refused until explicit authority can support them safely. API
envelopes require own enumerable data properties, diagnostics enforce exact
code-specific location shapes, and the pure length classifier follows Angular's
optional-empty `minLength` semantics.
