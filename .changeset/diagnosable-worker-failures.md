---
'@formly-contract/workspace': minor
'@formly-contract/angular': patch
---

Preserve project-worker failure codes and phases through discovery and
generation. Add opt-in bounded `--explain` diagnostics with sanitized cause
summaries and workspace-relative frames while keeping default output and
generated artifacts free of underlying exception details. Preserve that detail
through fail-closed Angular CLI runs, harden absolute-path redaction, and define
the worker wire format as a strict package-lockstep protocol.
