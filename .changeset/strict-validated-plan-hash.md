---
'@formly-contract/schema': patch
---

Strictly parse standalone validated-plan hash inputs before canonical hashing so
proxies, accessors, hidden properties, cycles, unknown fields, and other
unvalidated shapes fail closed without executing caller-controlled traps. Valid
validated plans retain their existing canonical SHA-256 identities.
