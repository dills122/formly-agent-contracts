# UI Guild Demo Runbook

This runbook prepares a 10–15 minute demonstration of the current Formly Agent
Contracts MVP. Everything shown is synthetic repository data. The demonstration
does not add or imply automatic workspace discovery, an MCP server, browser
observation, or generated Playwright execution.

## Readiness snapshot

Verified on Node.js `22.22.1` and pnpm `10.23.0`:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm demo
pnpm app:serve
```

Expected high-level results:

- installation completes with the lockfile already up to date;
- `pnpm check` reports 13 test files and 75 tests passed, builds the Angular
  production application, verifies the package release metadata and tarballs,
  passes the CLI smoke test, and checks the documentation;
- `pnpm demo` emits a canonical schema `0.3.0` contract for
  `demo.golden-form` with content hash
  `sha256:c7bdf2d701531d53eacc9a1f39f31ecd7bb862c60a948f2e76cc6ab4080ecfd5`;
  and
- `pnpm app:serve` makes the 12-form synthetic contract inspector available at
  `http://127.0.0.1:4200/`.

The pnpm install may report ignored dependency build scripts for packages such
as `esbuild`; that warning did not block the verified install, tests, or builds.

## Recommended three-form story

### 1. Basic: `applicant.profile`

Use this form to establish that the input is ordinary Formly configuration, not
a special demo DSL. It has native controls, nested model paths, constraints,
defaults, a wrapper, and a registered preset. Fill **Preferred name** with
`Taylor Demo`, open **Current synthetic model**, and show:

```json
{
  "identity": {
    "preferredName": "Taylor Demo"
  }
}
```

Talking point: the contract preserves semantic paths and constraints across the
nested configuration instead of making a test author reconstruct them.

### 2. Representative: `operations.equipment-inspection`

Use this as the normal business-form example. It combines basic controls, a
default date, a custom rating type, a checked default, static severity options,
and an already-populated repeater. Click **Add defect** and show that a second
row appears.

Talking point: real forms are rarely a flat list of inputs. A useful contract
must retain custom types, defaults, arrays, templates, constraints, options, and
stable semantic identity together.

### 3. Complex/dynamic: `edge.opaque-behavior`

Use this intentionally difficult fixture to demonstrate honesty at the
boundary. Select **Beta**, enter `  demo-code  ` in **Normalized code**, leave
the field, and click **Add generated row**. The model becomes:

```json
{
  "generatedRows": [null],
  "source": "beta",
  "normalizedCode": "DEMO-CODE"
}
```

This one form covers Observable options, a debounced parser, a function
expression, a hook, form state, and a function-created array template.

Talking point: the declared extractor records safe structure and explicit
unknowns; it does not pretend that arbitrary functions, Observables, parsers,
or hooks are static data. A trusted scenario build can resolve the supported
initial expression surface, while runtime-only behavior remains diagnostic or
future browser evidence.

## Registry and local-link decision

Do not add a temporary factory-link or another registry for this demonstration.

The Angular application already has a `TestFormRegistry`, and its three exported
definition groups provide fresh `create()` factories for all 12 fixtures. The
integration test already feeds those factories to `extractFormContract` twice
and proves stable, content-hashed contracts. The CLI intentionally uses the
separate `createGoldenFormFields()` synthetic fixture so its output is compact,
deterministic, and independent of Angular rendering.

The browser inspector reads generated contracts produced from those same
factories by the Node-side analyzer. Regenerate them after fixture changes with:

```sh
pnpm build:demo
node --experimental-strip-types scripts/generate-formly-test-app-contracts.mjs
```

The integration test compares every generated artifact with a fresh extraction,
so stale browser data fails the test gate. The browser never imports the
Node-only hashing/analyzer runtime.

The monorepo packages are already connected with pnpm `workspace:*`
dependencies, so no temporary package link is needed either.

A consuming application does need a small, application-owned registry of the
form factories it explicitly wants to expose. That is the current supported
MVP integration boundary. Adding a second demo-only registry here would create
duplicate catalog ownership and could be mistaken for the separate future
workspace-discovery design.

## 12-minute presentation plan

### 0:00–1:30 — The problem

Opening:

> Formly makes sophisticated forms easy to compose, but the semantics an E2E
> author needs are scattered across nested fields, shared presets, custom
> types, expressions, validators, option providers, and test conventions. A
> model can read the source or scrape a page, but either approach encourages
> selector guessing and hides what is still unknown.

State the value in one sentence:

> Formly Contract turns explicitly selected Formly factories into a
> deterministic, versioned, agent-readable contract with stable identities,
> usable locator evidence, and honest diagnostics.

### 1:30–3:00 — Show the input

Open `fixtures/synthetic-form/src/golden-form.ts` and point to:

- the nested `profile` group and `profile.displayName` constraints;
- the exact `data-testid` on display name;
- the conditional email field;
- the `addresses` repeater and its `[*]` template;
- the dynamic eligibility functions and `data-cy`; and
- the lifecycle hook that cannot be safely represented as data.

Talking point: this is normal synthetic Formly 6 configuration. The extractor
does not require selector annotations beyond the attributes an application
already chooses to expose.

### 3:00–5:30 — Generate and read the contract

Run this compact view instead of projecting the full one-line canonical JSON:

```sh
pnpm --silent demo | jq '{schemaVersion, formId, contentHash, rootNodeCount: (.nodes | length), displayName: (.nodes[0].children[0] | {id, modelPath, constraints, locators, evidence}), eligibilityReview: (.nodes[2] | {dynamicRules, optionSource, locators}), diagnostics}'
```

Expected highlights:

- `schemaVersion` is `0.3.0`;
- `formId` is `demo.golden-form`;
- `rootNodeCount` is `4`;
- display name has stable ID
  `demo.golden-form::path:s_profile.s_displayName`;
- the node retains the required/min/max constraints and model path;
- locator candidates include exact declared `data-testid` and placeholder
  evidence;
- eligibility exposes dynamic-rule metadata and an exact declared `data-cy`
  locator; and
- `OPAQUE_FUNCTION` identifies the unevaluated lifecycle hook with node ID and
  source path.

Talking points:

- The hash makes semantic drift reviewable in Git or CI.
- Node IDs and model paths are test intent; selectors are evidence attached to
  that intent.
- `locators: []` means “no reliable locator,” never “invent CSS.”
- Diagnostics are usable output, not a failed attempt hidden from the caller.

### 5:30–8:30 — Show the contract inspector

Start the application before the talk:

```sh
pnpm app:serve
```

Open `http://127.0.0.1:4200/`. Keep the analyzer—not the rendered forms—in the
foreground:

1. Start on `applicant.profile` and read the normalized semantic tree: stable
   IDs, cumulative model paths, node kinds, evidence, and the content hash. Point
   out the five ordered locator candidates on `identity.preferredName`.
2. Open **Agent → Playwright** and follow the four columns: the allowlisted
   Formly declaration, normalized locator candidates, agent-authored typed
   intent, and illustrative deterministic Playwright output. State that the
   first two columns are implemented; the typed-intent compiler and driver are
   the post-MVP boundary.
3. Select `edge.opaque-behavior` and show the explicit `ASYNC_VALUE`,
   `OPAQUE_FUNCTION`, and `UNSUPPORTED_RULE` diagnostics. This is the strongest
   proof that the analyzer preserves unknowns instead of guessing.
4. Only if useful, open **Rendered evidence** and interact with one form. This
   proves the synthetic fixture is real and that the preferred-name test ID
   renders uniquely, but it is supporting evidence rather than the product
   story.

Talking point: the 12-form corpus is analyzer input. The product is the stable,
portable contract artifact that lets an agent reason without loading Angular,
re-reading Formly internals, or inventing selectors at query time.

### 8:30–10:30 — Declared versus resolved versus observed

Use this simple distinction:

- **Declared**: safely projected from supplied configuration without executing
  application callbacks. Best for inventory and change impact.
- **Resolved**: the allowed result of one trusted Formly builder pass for a
  named synthetic model/form-state scenario. Best for initial conditional
  state and dynamic options.
- **Observed**: what a future browser parity layer actually sees in a rendered
  state. The schema reserves this evidence level, but capture is not currently
  implemented.

Open `fixtures/synthetic-form/src/compatibility.test.ts` and show the
`scenario.dynamic-choice` test. It resolves required, readonly, hidden state,
options, and an expression-driven test ID. Point out that both exact and
application-derived locators are marked `resolved`, never `observed`.

If time permits, run:

```sh
pnpm exec vitest run fixtures/synthetic-form/src/compatibility.test.ts --reporter=verbose
```

Expected result: one test file and two tests pass, including “resolves
callback-driven initial state through the trusted Formly builder.”

### 10:30–12:00 — Confidence and roadmap

Do not run the full gate live; report the rehearsed result and keep the command
on screen:

```sh
pnpm check
```

Verified result: lint passed, 13 files/75 tests passed, all TypeScript and
package builds passed, the Angular production bundle built, release metadata
and tarballs verified, the demo smoke check passed, and documentation checks
passed.

Close with a boundary-aware roadmap:

1. Publish and consume the schema/adapter packages with explicit
   application-owned registries and CI-generated contract artifacts.
2. Design source/workspace discovery separately, preserving explicit ownership
   rather than making this demo pretend discovery already works.
3. Add a read-only MCP query surface over immutable generated contracts.
4. Add typed E2E intent and deterministic Playwright execution against contract
   node IDs and locator candidates.
5. Add browser observation and parity diagnostics so declared, resolved, and
   observed evidence can be compared without conflation.

Closing line:

> The MVP is deliberately small: it does not promise to understand arbitrary
> application runtime behavior. It makes the semantics we do know portable and
> deterministic, and it makes everything we do not know explicit enough for an
> agent or engineer to act safely.

## Rehearsal checklist

- [ ] Use Node.js `22.22.1` and pnpm `10.23.0`.
- [ ] Run `pnpm install --frozen-lockfile` once on the demo machine.
- [ ] Run `pnpm check` and record the reported test total.
- [ ] Run the compact `pnpm --silent demo | jq ...` command and confirm the
  expected hash.
- [ ] Start `pnpm app:serve` and leave it running before screen sharing.
- [ ] Open the contract inspector and confirm the three demo inputs plus the
  expandable 12-form corpus render.
- [ ] Rehearse locator extraction → typed intent preview → opaque diagnostics.
- [ ] Use the rendered-evidence tab only as a supporting or fallback step.
- [ ] Open the golden fixture and compatibility test at the relevant sections.
- [ ] Increase terminal/editor font size and hide unrelated working-tree tabs.
- [ ] Keep the full contract command available, but use the compact `jq` view
  during the talk.
- [ ] Keep the presentation to three form stops; use the remaining nine forms
  only for questions.
- [ ] State explicitly that all content is synthetic.
- [ ] State explicitly that MCP, workspace discovery, browser observation, and
  Playwright execution are roadmap items, not current features.

## Contingency plan

### Angular server or port 4200 is unavailable

Try a different port:

```sh
pnpm --filter @formly-contract/formly-test-app exec ng serve --host 127.0.0.1 --port 4201
```

If live serving is still unavailable, show the successful Angular production
build from `pnpm check`, the fixture source, and
`apps/formly-test-app/src/app/form-contract-integration.test.ts`. The value
story is the compiler and contract, not the fixture application itself.

### The CLI output is too dense

Use the compact `jq` command above. If `jq` is not installed, run `pnpm demo`
and search the single JSON line for `profile-display-name`,
`eligibility-review`, and `OPAQUE_FUNCTION`.

### Installation or network access is unreliable

Do not reinstall during the talk. Preinstall and prebuild during rehearsal. The
verified installation restored all dependencies from the local pnpm store
without downloads, but another machine may not have that cache.

### A live interaction behaves unexpectedly

Reselect the form to create a fresh instance. If that does not recover, show
the expected synthetic model in this runbook and move to the contract output.
The full test gate and production build are the stronger correctness evidence.

### Time is cut to five minutes

Give the problem/value statement, run the compact CLI contract command, show
the display-name locator plus `OPAQUE_FUNCTION`, explain declared versus
resolved, and close with the roadmap. Skip the Angular interactions.

## Likely audience questions

### Why not have an agent read the Formly source directly?

It can, but it must repeatedly reconstruct fragments, paths, conditions,
custom types, and conventions. The contract pays that cost once in a
deterministic build artifact, gives facts stable identities, and preserves
unknowns instead of encouraging confident guesses.

### Why not scrape the rendered DOM?

One rendered state cannot reveal unvisited branches, array templates, hidden
controls, or the source reason behind behavior. Browser evidence is valuable,
but it complements declared and resolved evidence rather than replacing them.

### Does this execute arbitrary Formly functions?

Declared extraction does not. The trusted scenario compiler may execute
application/Formly callbacks inside the consuming application's configured
Angular build or test environment for explicit synthetic scenarios. Neither
path belongs in an untrusted MCP request handler.

### Are the locators guaranteed to work?

They carry strategy, target, evidence, and confidence. Exact declared or
resolved attributes are stronger than convention-derived candidates, and an
empty list is preserved honestly. Browser uniqueness and parity verification
are future work.

### Does it generate Playwright tests today?

Not as a production compiler. Schema v0.3 already provides stable node identity
and locator evidence, and the workbench demonstrates how an agent-authored typed
intent can compile to a basic Playwright interaction. The validated intent
schema, action adapters, locator uniqueness checks, and deterministic driver are
still roadmap work.

### How are dynamic and async options handled?

Static options are allowlisted into public label/value/disabled records. A
trusted initial builder pass can resolve supported expression-driven options.
Observables, remote sources, hooks, and other behavior outside that synchronous
surface remain source metadata or diagnostics until a later observation layer
provides evidence.

### What keeps private application data out of the contract?

Form factories and scenarios are selected explicitly, the demo uses only
synthetic data, model and form-state inputs must be structured-cloneable, and
the projection serializes an allowlisted public DTO rather than live Formly or
Angular objects.

### Why is explicit registration preferable to discovery in the MVP?

It makes ownership and scope reviewable and avoids guessing whether an exported
field fragment is a complete form. Workspace discovery can later help author
or validate that registry, but it should not silently redefine the current
compiler boundary.

### Which Angular and Formly versions are supported?

The reference harness is pinned to Angular `20.3.29` and Formly `6.1.8`, which
has the strongest executable evidence. The current package metadata targets
Angular 20 or newer with Formly 6.x; other combinations should be validated in
the consuming application.

### How do we detect contract drift?

Canonical serialization produces stable bytes, and each contract carries a
SHA-256 content hash. CI or code review can therefore distinguish a semantic
change from nondeterministic output.

### Is a registry or package link missing from this demo?

No. The Angular fixture registry and fresh factories already exist, the CLI has
its own focused golden factory, and pnpm workspace dependencies connect the
packages. A new registry would be consumer integration work, not a demo fix.
