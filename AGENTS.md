# AGENTS

AI coding guidance for this repository.

## Purpose

This repository builds Formly Contract: a compiler, MCP query surface, and Playwright integration for turning Angular Formly forms into reliable agent-readable E2E contracts.

Optimize for:

- deterministic, versioned semantic contracts with explicit evidence and unknowns
- reliable typed E2E intent that never depends on model-invented selectors
- small, explicit changes over broad refactors
- tests and documentation when behavior, contracts, setup, or commands change

## Architecture Boundaries

Primary areas follow [ADR 0008](docs/decisions/0008-package-rename.md):

- `packages/schema/`: versioned DTOs, runtime schemas, diagnostics, canonical serialization, and hashing
- `packages/compiler/`: form registry, controlled Angular/Formly compilation, and allowlisted projection
- `packages/workspace/`: distributed discovery, generation, source indexing, and artifact assembly
- future `packages/angular/`: Angular-specific authoring and host integration
- future `packages/mcp/`: progressive read-only agent transport
- future `packages/playwright/`: validated-plan compilation, reviewed driver registries, and deterministic browser execution

Intent DTOs and validation policy belong in `packages/schema/`. Do not create
`apps/mcp-server/`, `packages/test-intent/`, or
`packages/playwright-driver/`; those historical paths were superseded by ADR
0008.

When a change spans areas, preserve ownership boundaries and update shared contracts first.

## Contract-First Files

Treat these as interface contracts before implementation details:

- `docs/architecture-overview.md`
- `docs/implementation-plan.md`
- the future versioned schemas under `packages/schema/`

If behavior changes, update the relevant contract and docs in the same change.

## Scope Control

- Keep changes localized to the requested behavior.
- Avoid unrelated refactors and generated artifact churn.
- Call out follow-up work separately from the current change.
- Do not change public interfaces, storage formats, route surfaces, or app names without explicit intent.

## Repository Conventions

- Follow existing formatting and linting config.
- Prefer existing helper APIs and local patterns.
- Add focused tests for behavior changes.
- Update docs when setup steps, commands, contracts, or workflows change.

## Useful Commands

- Install dependencies: `pnpm install --frozen-lockfile`
- Run all local checks: `pnpm check`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Build/type-check: `pnpm build`
- Audit dependencies: `pnpm audit --audit-level=high`

## Branch And PR Metadata

- Use feature branches for behavior, contract, test, or documentation changes.
- Do not commit directly to `main`.
- When work is ready, provide:
  - branch name
  - PR title
  - PR summary
  - test evidence

## Context Engine (CCE)

This project uses Code Context Engine for intelligent code retrieval and
cross-session memory.

### Searching the codebase

**Use `context_search` instead of reading files directly** when exploring
the codebase, answering questions about code, or understanding how things
work. `context_search` returns the most relevant code chunks with
confidence scores instead of whole files.

When to use `context_search`:
- Answering questions about the codebase ("how does X work?", "where is Y?")
- Exploring structure or architecture
- Finding related code, functions, or patterns

Other tools:
- `expand_chunk` for full source of a compressed result
- `related_context` for what calls/imports a function
- `session_recall` to recall past decisions

### Cross-session memory

Call `session_recall("topic phrase")` before answering non-trivial questions.
Call `record_decision(decision="...", reason="...")` after making choices.
Call `record_code_area(file_path="...", description="...")` after meaningful work.

### Output style

Respond in compressed style. Drop articles (a, an, the) in prose. Use
sentence fragments over full sentences. Use short synonyms (fix not resolve,
check not investigate). Pattern: [thing] [action] [reason]. [next step].
No filler, hedging, pleasantries, trailing summaries, or restating what
the user said. One sentence if one sentence is enough.

When suggesting code changes, show only the changed lines with 3 lines of
context. Never rewrite entire files. Multiple changes in one file: show each
change separately. Never echo back unchanged code the user already has.

Code blocks, file paths, commands, error messages: always written in full.
Security warnings and destructive action confirmations: use full clarity.
