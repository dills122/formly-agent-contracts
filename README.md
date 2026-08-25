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

The repository is planning a one-day parser MVP for Angular 20.3 and Formly
6.1.8. The first product is a reusable contract extractor backed by synthetic
fixtures. MCP is an optional inspection harness; Playwright and production MCP
delivery are post-MVP.

## Documentation

- [Architecture overview](docs/architecture-overview.md)
- [MVP specification](docs/mvp-spec.md)
- [Implementation plan](docs/implementation-plan.md)
- [Project delivery process](docs/project-process.md)
- [Current task plan](docs/planning/mvp-2026-08-26/task_plan.md)
- [Architecture decisions](docs/decisions/)

## Contributing and Security

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) before participating, and use the
repository's private vulnerability-reporting flow described in
[SECURITY.md](SECURITY.md) for security issues.

This project is available under the [MIT License](LICENSE).
