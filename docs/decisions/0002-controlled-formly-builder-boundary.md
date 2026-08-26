# ADR 0002: Use a Controlled Formly Builder Boundary

- Status: Accepted
- Date: 2026-08-25

## Context

The requested MVP uses Angular 20.3.29 with Formly 6.1.8. Formly 6.1.8's
declared Angular Forms peer range includes Angular 20, although current Formly
guidance recommends Formly 7 for Angular 18 and newer. Package metadata alone
does not prove that Formly's runtime builder can process a form in a small,
component-free compiler harness.

The extractor needs useful resolved structure without moving Angular execution
into routine MCP queries or claiming parity with a rendered workplace form.

## Decision

For this exact version pair, the controlled compiler process may initialize
Angular's public browser testing platform, register Formly through
`FormlyModule.forRoot()`, and invoke `FormlyFormBuilder` against a synthetic root
field. It does not mount a component.

The MVP extractor may use the resulting post-build field tree as
scenario-resolved evidence. It must still project through an explicit allowlist
and report values that depend on components, views, lifecycle hooks, remote
data, or opaque functions as unknown or diagnostic. Angular and application
code run only in the controlled compiler process; the MCP query surface, if
added, reads the emitted artifact.

The caller's synthetic model and form state are structured-cloned before the
builder runs. Resolved expression values are target-aware: options pass through
the public option projector, state and presentation targets retain only their
contract representation, and unsupported targets remain declared with a
diagnostic. The resolved path never serializes arbitrary field properties.

This is an executable compatibility claim for Angular 20.3.29 and Formly 6.1.8,
not a general claim for other version combinations or custom workplace field
types.

## Evidence

The compatibility test proves that the pinned packages install, type-check,
and build a nested typed field configuration without a rendered host. After the
build it observes:

- parent links on the resolved field tree;
- generated `FormGroup` controls for group and leaf fields; and
- a registered field type's `defaultOptions` projected onto the leaf field.

The Node test loads Angular's compiler because partially compiled Angular
libraries use the JIT fallback outside an Angular CLI application build. It
uses `BrowserTestingModule` and `platformBrowserTesting` from Angular's public
testing package; the deprecated dynamic testing package is not required.

Sources:

- <https://angular.dev/reference/versions>
- <https://angular.dev/guide/testing/services#testing-services-with-the-testbed>
- <https://angular.dev/tools/libraries/creating-libraries#consuming-partial-ivy-code-outside-the-angular-cli>
- <https://github.com/ngx-formly/ngx-formly/blob/v6.1.8/src/core/src/lib/core.module.ts>
- <https://registry.npmjs.org/@ngx-formly%2fcore/6.1.8>
- <https://www.npmjs.com/package/@ngx-formly/core>

## Consequences

- The next slice can define the v0 contract against both declared configuration
  and controlled post-build evidence.
- The compatibility fixture remains synthetic and safe to publish.
- Component instance defaults and view- or lifecycle-dependent behavior are not
  available from this harness and must not be presented as known facts.
- Browser parity remains a later verification layer.
- Scenario inputs must be structured-cloneable; this excludes services,
  callbacks, and other live application objects from the trusted boundary.
- A future Formly upgrade or additional supported version pair requires its own
  compatibility test before expanding the support claim.
