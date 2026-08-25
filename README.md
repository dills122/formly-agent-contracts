# Formly Agent Contracts

Formly Agent Contracts is an exploration and implementation project for turning Angular Formly forms into a stable, agent-readable contract that can drive reliable Playwright end-to-end tests.

The central idea is to compile Formly configuration once and query it many times. Formly and application code run in a controlled build process; the MCP server reads versioned semantic artifacts instead of evaluating arbitrary Angular code for every agent request.

## Intended flow

```text
Formly configs and shared fragments
                |
       contract compiler
                |
     versioned form bundle
                |
          MCP queries
                |
       typed E2E intent
                |
      Playwright compiler
                |
       runtime verification
```

## Principles

- Treat the output as an E2E contract, not as a serialization of Formly internals.
- Keep declared, scenario-resolved, and browser-observed form state distinct.
- Address controls by stable semantic IDs rather than model-generated selectors.
- Represent dynamic conditions declaratively when possible and explicitly mark opaque behavior.
- Let custom field adapters own widget-specific actions, value codecs, and locators.
- Have agents produce typed test intent; compile that intent deterministically into Playwright.
- Run application and Formly code in a controlled compiler or verification process, never inside routine MCP queries.

## Project status

The repository has a pinned pnpm/TypeScript workspace and an executable
compatibility proof for Angular 20.3.29 with Formly 6.1.8. The first product is
a reusable contract extractor backed by synthetic fixtures. MCP is an optional
inspection harness; Playwright and production MCP delivery are post-MVP.

## Development

Prerequisites are Node.js 22.22.1 and pnpm 10.23.0.

```sh
pnpm install --frozen-lockfile
pnpm check
```

The individual gates are `pnpm lint`, `pnpm test`, `pnpm build`, and
`pnpm check:docs`.

## Formly test application

The workspace includes a browser-rendered Angular application with twelve
synthetic Formly 6.1 fixtures. It exercises root and child module registration,
three fixture-provider modules, native and custom field types, a wrapper,
validator, extension, preset, expressions, validation, repeaters, opaque
behavior, and isolated legacy-v6 aliases.

```sh
pnpm app:serve
```

Open <http://127.0.0.1:4200/> and select a fixture from the catalog. The
production AOT build is part of `pnpm build`; registry and Formly integration
coverage is part of `pnpm test`.

Workplace-only forms should remain in a private repository on the work
computer. They can implement the `TestFormDefinition` shape from
`apps/formly-test-app/src/app/form-registry/form-definition.ts` and provide a
group through `TEST_FORM_GROUPS`, without copying workplace labels, options,
models, identifiers, or rules into this public repository.

## Documentation

- [Architecture overview](docs/architecture-overview.md)
- [MVP specification](docs/mvp-spec.md)
- [Implementation plan](docs/implementation-plan.md)
- [Project delivery process](docs/project-process.md)
- [Parser MVP task plan](docs/planning/mvp-2026-08-26/task_plan.md)
- [Formly test application plan](docs/planning/formly-test-app/task_plan.md)
- [Architecture decisions](docs/decisions/)

## Contributing and Security

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) before participating, and use the
repository's private vulnerability-reporting flow described in
[SECURITY.md](SECURITY.md) for security issues.

This project is available under the [MIT License](LICENSE).
