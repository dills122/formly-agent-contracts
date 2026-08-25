# MVP Specification: Formly Contract Extractor

## Objective

Ship a cloneable GitHub repository by August 26, 2026 that proves an Angular
Formly configuration can be converted into deterministic, agent-readable data.
The first user is an E2E test author or coding agent that needs to understand a
form's structure, field order, model paths, constraints, choices, and known
conditional behavior without inventing selectors or reading raw application
code repeatedly.

The public product direction is a reusable parser and contract package. A small
CLI and read-only MCP server may be included as inspection harnesses, but they
are not the MVP product boundary.

## MVP Input and Output

The extractor accepts an explicitly registered form containing fresh
`FormlyFieldConfig[]`, plus optional synthetic model and form-state values. It
does not discover arbitrary exports or execute application source code.

The extractor emits a JSON-safe, versioned `FormContract` containing:

- form identity and contract schema version
- ordered nodes and their parent/child relationships
- stable node IDs and model paths
- Formly type and semantic control hints
- allowlisted presentation data such as labels, descriptions, placeholders,
  and static options
- ordinary constraints such as required, minimum, maximum, length, and pattern
- repeatable-group and array-template structure
- declared conditional behavior when it can be represented safely
- evidence and diagnostics for unsupported, opaque, or lossy values
- deterministic serialization and a content hash

## Synthetic Golden Form

The repository fixture must be invented for this project and contain no work
or customer data. It should exercise the smallest useful difficult set:

- text, number, checkbox, and select controls
- nested field groups
- one repeatable group or `fieldArray`
- required and range/length validation
- static select options
- one conditional field
- one intentionally opaque function or async-like value that produces a
  diagnostic

## Technology Baseline

- TypeScript with strict checking
- pnpm workspace
- Angular `20.3.29`
- `@ngx-formly/core` `6.1.8`
- JSON as the portable contract representation
- Vitest `4.1.11`, pinned in the lockfile
- Node.js `22.22.1` for development, with a package engine range compatible with
  Angular 20's supported Node 22 releases

Formly 6.1.8 declares `@angular/forms >=13.2.0`, which includes Angular 20, but
current Formly guidance recommends Formly 7 for Angular 18 and newer. Therefore
this exact pairing is a validated project requirement, not a general support
claim. The first implementation checkpoint proved that it installs,
type-checks, and can process a nested synthetic fixture through a controlled,
component-free Formly builder harness. This is evidence for the exact pinned
pair, not a broad compatibility claim.

Sources:

- Angular version compatibility: <https://angular.dev/reference/versions>
- Formly package and version guidance: <https://www.npmjs.com/package/@ngx-formly/core>
- Formly 6.1.8 package metadata: <https://registry.npmjs.org/@ngx-formly%2fcore/6.1.8>

## Commands

The scaffold must expose these root commands; their implementation is part of
the delivery plan:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm demo
```

`pnpm demo` must print or write the golden form contract. If the optional MCP
inspector is completed, it additionally exposes `pnpm mcp:inspect`.

## Project Structure

```text
packages/
  contract-schema/   Versioned contract types, validation, serialization, hash
  formly-parser/     Recursive allowlist extraction and diagnostics
apps/
  demo-cli/          Synthetic form registration and human-readable demo
  mcp-inspector/     Optional read-only inspection harness
fixtures/
  synthetic-form/    Invented representative Formly configuration
docs/
  decisions/         Small architecture decision records
  planning/          Current task plan, findings, and progress log
```

Only directories needed by the vertical slice should be scaffolded. In
particular, Playwright, source indexing, rule solving, contract storage, and
browser parity packages are not created during the one-day MVP.

## Code Style

Use explicit data boundaries, readonly inputs, and result objects that keep
diagnostics beside usable output:

```ts
export interface ExtractFormInput {
  readonly formId: string;
  readonly fields: readonly FormlyFieldConfig[];
  readonly model?: Readonly<Record<string, unknown>>;
  readonly formState?: Readonly<Record<string, unknown>>;
}

export interface ExtractFormResult {
  readonly contract: FormContract;
  readonly diagnostics: readonly ContractDiagnostic[];
}
```

Public names describe the contract domain rather than internal Angular or MCP
implementation details. Avoid `any`; convert unknown values through narrow,
tested guards. Serialization must never traverse live Formly objects without an
allowlist.

## Testing Strategy

- Schema tests prove valid contracts round-trip and malformed data is rejected.
- Parser unit tests cover every supported field shape and diagnostic.
- Golden tests prove identical input yields byte-for-byte identical JSON and
  hash output.
- A compatibility test imports the pinned Angular/Formly versions and parses
  the synthetic fixture.
- A smoke test runs the documented demo from the repository root.

No numerical coverage target is required for the first day. Every supported
behavior and every diagnostic code must have a focused test.

## Boundaries

### Always

- Keep input data synthetic and safe to publish.
- Preserve unknown behavior as explicit diagnostics.
- Pin dependencies and commit the pnpm lockfile.
- Add a test before or with every supported parser behavior.
- Keep contract output deterministic for the same registered input.
- Update this specification before changing the MVP boundary.

### Ask first

- Add a runtime dependency to a public package.
- Change a public contract field or stable-ID rule after publication.
- Add application source evaluation, network access, or browser execution.
- Expand the supported Angular/Formly compatibility claim.

### Never

- Include work, customer, credential, or proprietary fixture data.
- Evaluate arbitrary expression source or function text.
- Silently omit a value that may change form behavior.
- Serialize Angular controls, injectors, Observables, functions, or circular
  parent references into the contract.
- Present the development MCP inspector as production-ready.

## Success Criteria

The tomorrow build is successful when a fresh clone can:

1. install with the committed pnpm lockfile;
2. pass lint, tests, and build;
3. run `pnpm demo` and emit a readable, valid contract for the synthetic form;
4. show ordered nested fields, model paths, constraints, static options, array
   structure, and the conditional-field declaration;
5. report the intentionally opaque behavior with a stable diagnostic code;
6. reproduce identical canonical JSON and content hash on consecutive runs;
7. query the same artifact through the optional MCP inspector if that task fits
   after the parser shipping gate is met; and
8. explain installation, supported behavior, limitations, and the next planned
   increment in the README.

## Explicit Non-Goals for Tomorrow

- parsing arbitrary TypeScript source or discovering forms automatically
- reproducing all `FormlyFormBuilder` runtime behavior
- mounting or inspecting a browser-rendered form
- generating or executing Playwright tests
- inferring opaque functions, Observables, hooks, remote options, or validators
- production MCP packaging, transport hardening, authentication, or hosting
- multiple Angular/Formly version support
- custom widget adapters
- rule witness generation, semantic diffs, caching, or test-impact analysis
- a stable `1.0.0` public API

## Open Questions

Publication is configured at
<https://github.com/dills122/formly-agent-contracts> as a public repository
under the MIT License.

The controlled builder boundary for Angular 20.3.29 and Formly 6.1.8 is recorded
in [ADR 0002](decisions/0002-controlled-formly-builder-boundary.md). It resolves
registered defaults, controls, and parent links without mounting a component.
Component-, view-, lifecycle-, and browser-dependent behavior remains outside
that evidence boundary and must be represented as unknown until separately
observed.
