---
'@formly-contract/workspace': minor
---

Strictly revalidate worker results against retained inventory, cancel and await
peer workers after fail-closed errors, and recheck generation-lock ownership, dependency
snapshot, and runtime tool versions at index commit. Keep prior indexes
authoritative across publication faults and support exact-byte idempotent
recovery of unreferenced content-addressed artifacts.
