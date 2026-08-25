# Contributing

Thanks for helping make Formly Agent Contracts useful and trustworthy.

## Before You Start

- Read the [MVP specification](docs/mvp-spec.md) and
  [architecture overview](docs/architecture-overview.md).
- Search existing issues before reporting a bug.
- Never include customer, workplace, credential, or proprietary data in an
  issue, fixture, test, screenshot, or pull request.
- Discuss public contract changes before implementing them.

## Development Environment

The initial baseline is Node.js 22.22.1 and pnpm 10.23.0. Package scripts will
be added with the workspace scaffold. Until then, validate documentation with:

```sh
node .github/scripts/check-docs.mjs
```

Once the workspace exists, every pull request is expected to pass the root
lint, test, and build commands documented in the README.

## Making a Change

1. Create a focused branch from `main`.
2. Add or update a focused test for behavior changes.
3. Keep the change within one package or vertical slice where possible.
4. Update contracts and documentation in the same pull request when behavior,
   setup, commands, or public data changes.
5. Record verification evidence in the pull request description.

Opaque Formly behavior must become an explicit diagnostic. Do not infer,
evaluate, or silently omit functions, Observables, hooks, or remote values.

## Pull Requests

Pull requests should be small enough to review in one sitting. Complete the
provided template, link any relevant issue, and call out:

- public contract changes;
- compatibility assumptions;
- known unknowns or unsupported behavior; and
- the exact commands used for verification.

By contributing, you agree that your contribution is licensed under the
repository's [MIT License](LICENSE).
