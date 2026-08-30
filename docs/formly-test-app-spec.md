# Specification: Modular Formly 6.1 Test Application

## Objective

Build a browser-rendered Angular test application that proves the repository can
load a broad, invented Formly 6.1 fixture corpus through realistic Angular
module boundaries. The application is a development and integration harness for
the future contract compiler. It is not a production application or a source of
workplace data.

The harness must demonstrate all of the following in one executable app:

- `FormlyModule.forRoot()` at the application boundary;
- `FormlyModule.forChild()` registrations contributed by separate Angular
  modules;
- custom field types, a field-array type, a wrapper, a named validator, a
  validation message, an extension, and a preset;
- form definitions contributed by multiple feature modules through a registry;
- fresh field, model, and form-state values for every fixture selection; and
- enough synthetic forms to cover ordinary, nested, repeated, conditional,
  opaque, and legacy-v6 field shapes.

Sources for the integration patterns:

- <https://v6.formly.dev/docs/guide/getting-started/>
- <https://v6.formly.dev/docs/guide/custom-formly-field/>
- <https://v6.formly.dev/docs/guide/custom-formly-wrapper/>
- <https://v6.formly.dev/docs/guide/custom-formly-extension/>
- <https://v6.formly.dev/docs/guide/validation/>
- <https://v6.formly.dev/docs/guide/migration/>
- <https://angular.dev/guide/ngmodules/overview>
- <https://angular.dev/tools/cli/build>

## Technology Baseline

- Angular `20.3.29`
- Angular CLI and application builder `20.3.29`
- Formly core `6.1.8`
- TypeScript `5.9.3`
- Vitest `4.1.11`
- pnpm `10.23.0`

The application deliberately validates the requested Angular 20/Formly 6.1
pair. It does not expand the repository's general compatibility claim.

The same application is also the maintained single-project workspace example.
Its adjacent root and project configs expose the browser fixture factories as
three feature-owned contract sources without introducing library boundaries.

`@angular/build@20.3.29` advertises a Vitest 3 peer for its optional test
builder, while this repository pins Vitest 4. The workspace uses Angular's
application and dev-server builders only, so pnpm contains one package-scoped
allowed-version rule rather than disabling strict peer checks globally.

The test application's optional Angular CLI disk cache is disabled. This keeps
the small compatibility build independent of native LMDB cache state; it does
not change AOT compilation or output optimization.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm app:serve
pnpm check
```

`pnpm build` must AOT-compile the test application. `pnpm app:serve` must expose
the fixture catalog locally for browser inspection.

## Project Structure

```text
apps/formly-test-app/
  src/app/form-registry/       Fixture contract, token, and registry service
  src/app/formly-types/        Native and custom Formly field modules
  src/app/forms/applicant/     Applicant-oriented fixture module
  src/app/forms/operations/    Operations-oriented fixture module
  src/app/forms/edge-cases/    Compatibility and diagnostic fixture module
  src/app/                     Catalog and rendered-form host
  src/                         Angular browser entry point and styles
```

Feature modules own fixture definitions. The registry owns discovery and fresh
instantiation. Formly type modules own UI components and Formly configuration.
The root application composes them but does not contain fixture data.

## Fixture Contract

```ts
export interface TestFormDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly features: readonly TestFormFeature[];
  readonly create: () => TestFormInstance;
}

export interface TestFormInstance {
  readonly fields: FormlyFieldConfig[];
  readonly model: Record<string, unknown>;
  readonly formState: Record<string, unknown>;
}
```

Every `create()` call returns fresh mutable values because Formly builds and
annotates field configurations at runtime. Fixture IDs and feature tags are
stable test metadata; labels and model values are invented presentation data.

## Required Fixture Breadth

The initial corpus must contain at least twelve registered forms spanning:

- basic text, number, date, textarea, checkbox, radio, and select controls;
- nested keyed and keyless groups;
- dotted, bracketed, numeric, and array-form keys;
- standard constraints, defaults, patterns, and validation messages;
- static and Observable-backed options;
- scalar and object repeaters with empty and populated models;
- string and function expressions for hide, required, and disabled state;
- named, inline, cross-field, and async-like validation declarations;
- model options, parsers, hooks, form state, wrappers, and presets;
- custom currency and rating fields plus a repeat-section field-array type;
- one opaque-behavior laboratory intended to exercise future diagnostics; and
- one isolated legacy fixture using deprecated v6 aliases.

The fixture corpus is informed by the official Formly `v6.1.8` examples and
core tests, but the repository's forms and data must be newly written:

- <https://github.com/ngx-formly/ngx-formly/tree/v6.1.8/demo/src/app/examples>
- <https://github.com/ngx-formly/ngx-formly/blob/v6.1.8/src/core/src/lib/utils.spec.ts>

## Code Style

Use explicit factories and readonly registry metadata. Keep executable Formly
values inside the factory so each selection begins with a clean tree.

```ts
export const applicantProfileForm: TestFormDefinition = {
  id: 'applicant.profile',
  title: 'Applicant profile',
  description: 'Nested identity and address controls.',
  features: ['nested-groups', 'constraints'],
  create: () => ({
    fields: createApplicantProfileFields(),
    model: {},
    formState: {},
  }),
};
```

Avoid `any` in project code. Formly's broad public types may expose `any`, but
values crossing the fixture registry must use explicit project interfaces.

## Testing Strategy

- Registry unit tests prove stable ordering, unique IDs, feature coverage, and
  fresh fixture values.
- Angular/Formly integration tests compose the real feature modules, inspect
  registered types/wrappers/validators, and build every fixture through the
  public `FormlyFormBuilder` boundary.
- The Angular CLI production build proves templates and NgModule metadata AOT
  compile.
- A local browser smoke check proves the catalog loads and at least one native,
  one custom, and one repeated form render without console errors.

Tests assert repository behavior, not Formly's internal implementation.

## Boundaries

### Always

- Keep every committed fixture synthetic and safe to publish.
- Register Formly at the root and contribute feature configuration through
  explicit Angular modules.
- Return fresh fixture state from factories.
- Keep the app usable as both a browser harness and a controlled-builder corpus.
- Cite official Angular and Formly sources for version-specific patterns.

### Ask First

- Add a UI theme or another runtime dependency beyond Angular and Formly.
- Introduce routing, network calls, authentication, persistence, or browser
  automation dependencies.
- Move registry contracts into a public package or stabilize them as API.

### Never

- Copy workplace forms, labels, options, identifiers, models, or business rules.
- Fetch remote fixture data.
- Treat deprecated aliases as recommended authoring patterns.
- Serialize or display function bodies, Angular injectors, controls, or secrets.

## Success Criteria

1. A production Angular build succeeds for the exact pinned version pair.
2. At least twelve synthetic forms are discoverable in deterministic order.
3. Forms originate from at least three feature modules.
4. Root, child, custom type, wrapper, validator, extension, and preset
   registrations are executable.
5. Every fixture builds through `FormlyFormBuilder` with fresh state.
6. The browser catalog can switch among forms and render representative native,
   custom, conditional, and repeatable controls.
7. `pnpm check` and the high-severity dependency audit pass.
8. Documentation explains how private workplace-only fixtures can consume the
   same registry shape without entering this repository.
9. The single-project workspace config generates all twelve forms
   deterministically and preserves representative native, repeated, custom,
   conditional, and opaque semantics.
