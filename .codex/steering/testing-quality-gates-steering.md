# Testing And Quality Gates

Testing should protect behavior, contracts, and integration boundaries.

## Default Expectations

- Add or update focused tests for behavior changes.
- Cover edge cases for parsing, validation, permissions, persistence, and external integrations.
- Keep test fixtures small and explicit.
- Prefer deterministic tests over timing-sensitive assertions.

## Before Finishing Work

Run the smallest reliable command that validates the changed area:

- Lint: not configured until the initial workspace scaffold
- Unit tests: not configured until the initial workspace scaffold
- Integration tests: not configured until the initial workspace scaffold
- Build/typecheck: not configured until the initial workspace scaffold

Until those commands exist, validate documentation changes by reviewing links, code fences, and Git diffs. Do not claim executable validation for an unscaffolded repository.

If a command cannot run locally, document why and what risk remains.

## Quality Gates

- No known failing tests introduced by the change.
- No unrelated formatting churn.
- Public contracts updated when behavior changes.
- Docs updated for setup, command, or workflow changes.
