# Repository Scope And Priorities

This repository builds Formly Contract, a semantic compilation and E2E automation layer for Angular Formly applications.

Primary deliverables:

- a deterministic, versioned Form Contract compiler
- a bounded, read-only MCP discovery and state-resolution surface
- typed E2E intent validation and deterministic Playwright execution

Core priorities:

- preserve declared, scenario-resolved, and browser-observed evidence as distinct views
- surface opaque behavior as explicit unknowns rather than inferred facts
- stable typed contracts between modules
- maintainable local workflows

## Active Boundaries

- The schema package owns public DTOs, diagnostics, versioning, serialization, and compatibility.
- The compiler package owns all Angular/Formly execution and must emit inert allowlisted artifacts.
- The MCP and Playwright layers consume contracts and must not bootstrap arbitrary application code.

## Safe Refactor Boundaries

Do not refactor these without explicit instruction:

- project names and paths registered in workspace config
- public API route surfaces
- persistent data model semantics
- generated code ownership boundaries

Safe default changes:

- feature-scoped improvements
- endpoint hardening and validation
- focused test additions
- typing improvements
