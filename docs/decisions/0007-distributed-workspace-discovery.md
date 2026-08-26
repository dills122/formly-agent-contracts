# ADR 0007: Use Typed Distributed Workspace Discovery with Optional Integrations

- Status: Proposed
- Date: 2026-08-25

## Context

The current Formly adapter compiles a supplied field tree or trusted scenario,
but the consuming application must provide every form explicitly. That is
acceptable for the synthetic MVP and inconvenient for a workplace monorepo
with more than 100 forms distributed across Angular applications, feature
modules, libraries, lazy routes, and packages.

Formly registers field types, wrappers, validators, presets, and extensions; it
does not expose an authoritative catalog of application form roots. Arbitrary
TypeScript scanning cannot safely distinguish complete forms from fragments or
construct required DI and scenario context. Runtime capture sees only forms and
states that were actually built.

Angular multi providers support distributed feature contribution, but lazy
features can own child injectors that are not visible from an unloaded root
injector. Nx can discover conventional project files, infer tasks, cache
declared outputs, and run only affected projects.

## Proposed decision

Add a typed workspace discovery layer outside the contract schema and Formly
projection packages.

1. A root `formly-contracts.config.*` file controls project-config discovery,
   artifact output, locator defaults, diagnostic policy, privacy policy, and
   explicitly imported plugins.
2. A `formly-contracts.project.*` file represents an application, library, or
   package boundary. Sources are optional so configuration-only applications
   and infrastructure libraries can participate without claiming form roots.
   Form-owning projects can expose one or more sources and adapt an existing
   registry, factory map, or feature-owned definition collection.
3. Source catalogs return stable form IDs, fresh form factories, and optional
   synthetic scenarios. The runner sorts all discovered identities and rejects
   duplicates deterministically.
4. Project descriptors may also contribute an application-owned, serializable
   field-type profile registry and per-form explicit cross-field effects. Root
   configuration controls global policy; project configuration owns custom-type
   mappings and application relationships. Resolved profile/effect identity and
   version enter generation metadata, while executable browser drivers do not
   enter configuration artifacts.
5. `@formly-agent-contracts/workspace` owns typed configuration, runtime
   validation, config loading, project discovery, aggregation, artifact output,
   and the CLI. It uses a narrowly configured Jiti async loader after a
   compatibility gate proves ESM, CommonJS, TypeScript, and path-alias behavior.
6. `@formly-agent-contracts/angular` owns multi-provider helpers,
   application-equivalent controlled-builder setup, field-type inventory and
   review-scaffold authoring, and an optional dev/test capture extension.
7. `@formly-agent-contracts/nx` is optional. It detects project markers, infers
   cacheable targets, supplies an executor and generators, and supports affected
   execution without making Nx a dependency of the core packages.
8. Plugins are trusted build-time modules that must be explicitly installed and
   imported. Plugin identity and version enter generation metadata. MCP or other
   untrusted requests cannot select or execute plugins or configuration.
9. Runtime Formly capture is migration and coverage evidence only. It remains
   distinct from declared inventory and must report that unvisited forms may be
   missing.
10. Optional integration packages are convenience layers over the workspace
    contracts. They may provide typed presets and hide routine wiring, but they
    must resolve through the same generic validation, identity, provenance, and
    precedence rules rather than creating parallel configuration systems.

The initial package graph is:

```text
contract-schema
      |
formly-adapter
      |
workspace
  /       \
angular    nx
```

Future MCP, test-intent, and Playwright packages remain outside this discovery
increment.

## Consequences

- A large monorepo can integrate once per project or feature boundary instead
  of maintaining one root entry per form.
- Existing registries and factory conventions can expose many forms through one
  workplace-specific adapter.
- New form-owning libraries become discoverable by adding a local project
  marker that matches the root config glob; the root config does not change.
- Configuration-only application and base-Formly projects can share the same
  root policy without fake source catalogs.
- Consumer libraries need separate runtime-safe form/factory and Node-oriented
  contract entry points when their discovery descriptors import build tooling.
- One reviewed field-type profile can serve every use of that custom Formly
  type within a project instead of requiring per-form interaction metadata.
- The generic workspace runner works without Nx, while Nx users gain inferred,
  cacheable, affected tasks.
- TypeScript config loading becomes a trusted executable boundary with runtime
  validation and explicit deterministic merge rules.
- Forms with no reusable factory or stable identity still need a local adapter,
  descriptor, or migration follow-up.
- Lazy Angular modules must be loaded explicitly by their project source or
  captured at runtime; root DI enumeration alone is insufficient.
- Nx major-version compatibility must be declared and tested rather than
  assumed.

## Alternatives rejected

### One central form registry

It is deterministic but creates unacceptable boilerplate, ownership contention,
and drift for more than 100 forms.

### Automatic arbitrary TypeScript discovery

Static analysis can index symbols and provenance later, but it cannot reliably
identify complete roots or evaluate application context. It is not an
authoritative inventory boundary.

### Runtime capture as the primary inventory

It minimizes setup but sees only visited forms and scenarios, risks processing
real application state, and lacks a stable factory for repeatable compilation.

### Replacing `FormlyFormBuilder`

Provider scope and Formly-version coupling make replacement more fragile than
the public extension lifecycle. Capture will use a Formly extension instead.

### Native Node TypeScript loading only

Native type stripping is enabled by default only from Node 22.18, ignores
`tsconfig` path mapping, and does not transform all TypeScript syntax. The
current package engine starts at Node 22.13.

### General layered/remote configuration loading

Remote extension, automatic environment loading, and generic deep merging add
security and determinism surface that form discovery does not require.

## Evidence and gates

The detailed evidence, comparison, unknowns, estimates, and proof-of-concept
gate are retained in
[Scalable Form Discovery and Registration](../research/form-discovery-dx.md)
and [v0.4 Field-Type Adapter Research](../research/v0.4-field-type-adapter.md).

This ADR becomes Accepted only after a proof of concept demonstrates:

- root and project config loading across representative module formats;
- deterministic discovery and duplicate detection across three projects;
- one bulk factory map and one existing-registry adapter;
- one project-owned field-type profile reused across multiple form instances,
  with deterministic identity and unmapped-type diagnostics;
- one explicit per-form effect resolved against stable generated node IDs and
  field-profile capabilities, without callback inference;
- declared and trusted resolved contract generation;
- Angular feature-provider composition without relying on unloaded lazy DI;
- Nx cached and affected task behavior for the confirmed supported major; and
- no model values, credentials, or live Formly objects in artifacts.

Tasks 1–3 now provide the retained configuration bedrock: Jiti compatibility
fixtures, the ESM workspace package, strict root/project/source validation,
stable plugin identities, and deterministic policy resolution. Project
discovery, artifact generation, and integration-package presets remain gates
before this ADR becomes Accepted.

## Sources

- Angular multi providers and injector hierarchy:
  <https://angular.dev/guide/di/defining-dependency-providers>
- Angular hierarchical injectors:
  <https://angular.dev/guide/di/hierarchical-dependency-injection>
- Formly custom extensions:
  <https://v6.formly.dev/docs/guide/custom-formly-extension/>
- Nx project-graph plugins:
  <https://nx.dev/docs/extending-nx/project-graph-plugins>
- Nx affected tasks:
  <https://nx.dev/docs/features/ci-features/affected>
- Nx CreateNodes compatibility:
  <https://nx.dev/docs/kb/createnodes-compatibility>
- Node TypeScript execution:
  <https://nodejs.org/api/typescript.html>
- Jiti async TypeScript/ESM loader:
  <https://github.com/unjs/jiti>
