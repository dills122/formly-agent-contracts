# AGENTS

AI coding guidance for this repository.

## Purpose

This repository builds Formly Agent Contracts: a compiler, MCP query surface, and Playwright integration for turning Angular Formly forms into reliable agent-readable E2E contracts.

Optimize for:

- deterministic, versioned semantic contracts with explicit evidence and unknowns
- reliable typed E2E intent that never depends on model-invented selectors
- small, explicit changes over broad refactors
- tests and documentation when behavior, contracts, setup, or commands change

## Architecture Boundaries

Primary areas:

- `packages/contract-schema/`: versioned DTOs, runtime schemas, diagnostics, canonical serialization, and hashing
- `packages/formly-adapter/`: form registry, controlled Angular/Formly compilation, and allowlisted projection
- `apps/mcp-server/`, `packages/test-intent/`, and `packages/playwright-driver/`: read-only discovery, intent validation, and deterministic browser execution

When a change spans areas, preserve ownership boundaries and update shared contracts first.

## Contract-First Files

Treat these as interface contracts before implementation details:

- `docs/architecture-overview.md`
- `docs/implementation-plan.md`
- the future versioned schemas under `packages/contract-schema/`

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
