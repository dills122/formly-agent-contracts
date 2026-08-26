# Findings: August 26 Parser MVP

## Sources

- Angular version compatibility: <https://angular.dev/reference/versions>
- Formly package guidance: <https://www.npmjs.com/package/@ngx-formly/core>
- Formly 6.1.8 metadata: <https://registry.npmjs.org/@ngx-formly%2fcore/6.1.8>
- Repository architecture: `docs/architecture-overview.md`
- Previous broad roadmap: replaced by `docs/implementation-plan.md`; future
  capabilities remain in the architecture overview and post-MVP list.

## Notes

- Angular 20's current LTS package tag is 20.3.29 as of 2026-08-25.
- The current development environment runs Node 22.22.1 and pnpm 10.23.0.
- The latest Formly 6.1 patch is 6.1.8.
- Formly 6.1.8 declares RxJS `^6.5.3 || ^7.0.0` and Angular Forms
  `>=13.2.0` as peer dependencies.
- Formly's current version table points Angular 18+ users to Formly 7. This does
  not contradict the v6 peer range, but it makes the requested pair a practical
  compatibility risk to test immediately.
- The existing architecture is intentionally broader than the tomorrow MVP.
  Parser output remains compatible with that direction if evidence and unknowns
  stay explicit.
- The public repository is configured at
  <https://github.com/dills122/formly-contract> with an MIT license,
  protected `main`, secret scanning, push protection, Dependabot security
  updates, and read-only default Actions permissions.
- A controlled Angular TestBed using `BrowserTestingModule`,
  `platformBrowserTesting`, and `FormlyModule.forRoot()` can inject and run
  `FormlyFormBuilder` without mounting a component.
- The builder produces nested controls and parent links and applies registered
  field-type defaults in the synthetic proof.
- Partially compiled Angular libraries require the Angular compiler to be
  loaded for this Node-based JIT harness.
- The public Angular 20 browser testing package is sufficient; the deprecated
  `@angular/platform-browser-dynamic` package is not needed.
- Fresh `main` contains twelve synthetic forms spanning ordinary controls,
  nested groups, path edge cases, repeaters, string and function expressions,
  synchronous and asynchronous validation, observable options, hooks, parsers,
  presets, wrappers, custom types, and legacy v6 aliases.
- Formly v6 documents `fieldGroup`, `fieldArray`, `expressions`, validators,
  async validators, parsers, and `modelOptions` as public field configuration
  properties: <https://v6.formly.dev/docs/guide/properties-options/>.
- Formly v6 documents string and function expression values separately, which
  supports preserving strings while diagnosing functions as opaque:
  <https://v6.formly.dev/docs/guide/expression-properties/>.
- Node's supported `crypto.createHash()` API provides the MVP SHA-256 content
  hash without another runtime dependency:
  <https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options>.
- Formly 6.1.8's `getKeyPath` implementation translates bracket notation,
  splits dotted string keys, and preserves array-form key segments. ADR 0004
  mirrors that behavior without importing a private helper:
  <https://github.com/ngx-formly/ngx-formly/blob/v6.1.8/src/core/src/lib/utils.ts>.
- Vitest aliases are explicitly absolute filesystem paths so workspace
  integration tests exercise package source while published package exports
  remain dist-only: <https://vitest.dev/config/alias>.
- The twelve-form corpus intentionally contains opaque functions, async-like
  values, and unsupported rules. It does not contain an otherwise completely
  unknown field shape, so that fourth diagnostic remains covered by the
  focused adapter unit suite rather than being falsely expected from the app.
- A root demo runner can keep successful stdout machine-readable by building
  packages with captured output and replaying build logs only when compilation
  fails. The smoke check independently parses the emitted JSON through the
  contract package and verifies its content hash and intentional diagnostic.

## Open Questions

- No repository-publication questions remain.
- The v0 projection allowlist and stable identity rule are resolved by Tasks 5
  and 6 plus ADR 0004. The next slice must prove that output through the small
  golden form and repository-root demo command.
