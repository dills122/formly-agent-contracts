# Architecture Overview

## Current implementation boundary

The implemented generic pilot now includes schema v0.4, declared and trusted
scenario compilation, project-owned custom-field profiles, repository-aware
root/project/source configuration, deterministic multi-project discovery and
artifact generation, a workspace index, and the pilot
`formly-contracts generate` command.

The long-term architecture below remains the intended direction. Cross-field
effects, the remaining `list`/`check` CLI commands, Angular-assisted profile
inventory, optional Nx task integration, production MCP delivery, typed
Playwright execution, browser observation, runtime parity, and change analysis
remain later layers. They must consume or extend the same contracts rather than
move trusted application execution into routine agent requests.

See [the parser MVP specification](mvp-spec.md) for the original foundation,
[the workspace implementation plan](planning/workspace-discovery/implementation-plan.md)
for current sequencing, and the [workplace pilot guide](workplace-pilot.md) for
the supported private-repository evaluation path.

## Context

Large applications often construct Formly forms from TypeScript factories, shared fragments, presets, registered types, wrappers, validators, expressions, feature flags, roles, and asynchronous option providers. This is productive for application development but difficult for an AI agent to interpret reliably.

The end goal is not merely to list fields. An agent generating an E2E test must understand how to reach a form, which controls are relevant in a scenario, how to operate each control, what values and validations matter, and what application outcome should follow.

## Architectural decision

Build a versioned **Form Contract** artifact outside the MCP request path.

The contract compiler may use the real Formly builder for scenario-specific normalization, partial TypeScript analysis for source discovery and provenance, and explicit semantic metadata for behavior that cannot be inferred. The MCP server exposes compact read and resolution APIs over the generated artifacts. Agents target stable node IDs and a typed E2E intent rather than raw selectors or Formly implementation details.

```text
Form registry + Formly configs + fragments + semantic metadata
                              |
                 build-time contract compiler
                 /                         \
        static source index          Formly scenario build
                 \                         /
                    normalized contract bundle
                              |
                   MCP resources and tools
                              |
                      typed test intent
                              |
             deterministic Playwright generation
                              |
                 live browser parity verification
```

## Three views of a form

The contract keeps three forms of evidence separate.

### Declared

The fields, fragments, rules, actions, and variants that could exist. This view comes from explicit metadata, registered form factories, and partial static analysis. It is the best view for discovery and change impact, but arbitrary application code can leave parts unknown.

### Resolved

The normalized form for a supplied model and context such as role, locale, jurisdiction, tenant, and feature flags. This view comes from declarative rule evaluation or a controlled Formly build. It is scenario-specific and must record the inputs used to produce it.

### Observed

The controls, roles, accessible names, states, and locators seen in a running browser. This is runtime evidence for one visited state. It verifies the contract but does not reveal unvisited branches or hidden fields.

These views must not be silently merged. Every fact records its evidence origin and unresolved behavior remains explicit.

## Major components

### 1. Form registry

The application or a fixture package explicitly registers supported form entry points.

```ts
registerForm({
  id: 'claim.new',
  route: '/claims/new',
  createFields: createClaimFields,
  contexts: ['adjuster-ca', 'customer-ca'],
});
```

Each factory accepts serializable, synthetic context and returns a fresh field configuration. Registration avoids guessing which exported values happen to be complete forms.

### 2. Contract compiler

The compiler runs in a controlled build or CI environment. It:

1. Loads a registered form with the same Formly providers used by the application.
2. Clones fields, model, options, and form state because Formly mutates them.
3. Invokes `FormlyFormBuilder` for named scenarios.
4. Waits for the initial synchronous expression pass to complete.
5. Projects the resulting tree through an allowlist serializer.
6. Retains expression callbacks as declared dynamic-rule metadata and records
   their JSON-safe scenario outcome when the controlled build resolves it.
7. Retains unresolved Observables, lifecycle hooks, remote data sources, and
   other executable behavior outside the expression surface as diagnostics.
8. Produces a deterministic, content-addressed bundle.

The compiler must not serialize live field objects. Built fields contain circular parent references, Angular controls, injectors, functions, subscriptions, and other runtime-only state.

### 3. Source indexer

A TypeScript compiler-API pass is optional and deliberately partial. Its appropriate responsibilities are:

- Discover form and fragment symbols.
- Record source locations and import relationships.
- Track shared-fragment usage and change impact.
- Explain literal spreads and overrides.
- Detect unsupported dynamic constructs.
- Determine cache invalidation inputs.

It is not an authoritative evaluator for arbitrary factories, dependency injection, mutations, hooks, or asynchronous behavior.

### 4. Semantic contract model

The contract bundle contains four related graphs:

- **Model schema:** value types and ordinary constraints.
- **UI graph:** steps, sections, controls, arrays, actions, ordering, and locators.
- **Rule graph:** visibility, enabled, required, readonly, defaults, options, and cross-field validation.
- **Journey contract:** route, authentication, fixtures, navigation, submit behavior, and expected application outcomes.

A representative control node is:

```json
{
  "id": "claimant.email",
  "modelPath": ["claimant", "email"],
  "kind": "control",
  "semanticType": "email",
  "formlyType": "input",
  "actions": ["fill", "clear"],
  "presentation": {
    "label": "Email address",
    "accessibleRole": "textbox"
  },
  "locators": [
    {
      "target": "control",
      "strategy": "testId",
      "attribute": "data-testid",
      "value": "claimant.email",
      "evidence": "declared",
      "confidence": "exact"
    }
  ],
  "constraints": [
    { "id": "required", "kind": "required" },
    { "id": "email-format", "kind": "format", "format": "email" }
  ],
  "visibleWhen": {
    "op": "eq",
    "left": { "ref": "model", "path": ["contactMethod"] },
    "right": { "const": "email" }
  },
  "origin": {
    "fragment": "person.contact",
    "instance": "claimant"
  },
  "sensitivity": "pii",
  "evidence": "declared"
}
```

Stable semantic identity is separate from model path, generated Formly ID, label, and layout. Fragment nodes have both a canonical template ID and a namespaced instance ID. Repeated groups retain an item template such as `owners[*].email` as well as scenario-specific row instances.

Locators are ordered, node-local operational facts rather than semantic
identity. A locator names a node-local target so one field can expose several
interactive parts. Declared and resolved candidates never claim browser
observation; only a browser parity layer can emit `observed` evidence.

### 5. Rule representation

Rules are evaluated with three-valued logic: `true`, `false`, or `unknown`. Missing context and opaque legacy behavior must produce `unknown` rather than a guess.

For new code, a typed rule builder should emit both a serializable rule AST and the evaluator used by Formly:

```ts
const emailSelected = eq(
  modelRef('contactMethod'),
  value('email'),
);
```

Legacy string and function expressions can be recognized only when safe. Otherwise the contract records a rule ID, declared dependencies, source provenance, known scenario outcomes, and an opacity diagnostic. Arbitrary expression source is never evaluated by the MCP server.

State rules and operational cross-field effects are separate contracts. A
state rule says when one property evaluates true/false/unknown. An actionable
effect is application-declared per form and connects stable trigger and target
node IDs with a semantic kind, target property, ordering, timing/readiness,
condition reference, and declared evidence.

Conservative string-expression references, opaque handler/function signals,
and controlled scenario deltas may help authors review missing declarations,
but they never become operational verbs automatically. When opaque behavior
makes analysis coverage incomplete, absence of an effect edge cannot prove
independence or unreachability. Readiness capabilities remain serializable field
profile data; trusted drivers implement validated capabilities rather than
inventing cross-field relationships.

### 6. Field-type adapter registry

Custom widgets require explicit operational semantics. Each adapter describes:

- Semantic control and model value type.
- Supported actions and assertions.
- Composite interactive parts.
- Mapping from Formly props into contract fields.
- Stable selector attachment.
- Valid, invalid, and boundary value generation.
- Option-provider and loading states.
- UI-to-model value codec and parser identity.
- Stable Playwright driver ID/version and required interaction capabilities.

The adapter profile is serializable data; it does not contain an executable
Playwright implementation. Generic driver IDs are resolved by the Playwright
compiler, while application-specific IDs resolve through a trusted application
allowlist. Angular reflection and source/render analysis belong to the trusted
build-time authoring host and do not run in the schema or MCP query path.

One Formly field may map to multiple interactive controls. For example, a date range has start and end parts, while an address lookup may expose a search box, suggestions, and a confirmed structured value.

### 7. MCP server

The MCP server reads versioned bundles; it does not import Angular or execute application form factories during routine queries.

In particular, the MCP server never invokes expression callbacks. Scenario
resolution is a trusted build/CI operation whose output is an immutable bundle.

Candidate resources:

- `form://catalog`
- `form://{formId}/{contentHash}/summary`
- `form://{formId}/{contentHash}/contract`
- `form://{formId}/{contentHash}/node/{nodeId}`
- `form://fragment/{fragmentId}/{version}`
- `form://{formId}/diff/{oldHash}/{newHash}`

Candidate read-only tools:

- `search_forms`
- `find_form_nodes`
- `resolve_form_state`
- `explain_form_node`
- `find_state_witness`
- `generate_boundary_cases`
- `validate_test_intent`
- `compile_test_intent`

Tools use strict input and output schemas and return explicit diagnostics such as `OPAQUE_RULE`, `UNKNOWN_FIELD_TYPE`, `AMBIGUOUS_NODE`, `UNSUPPORTED_ACTION`, and `STALE_CONTRACT`. Large forms are queried through summaries and node slices rather than placed wholesale into model context.

### 8. Typed E2E intent and Playwright compiler

The agent converts a prompt into a typed intent referencing semantic nodes:

```json
{
  "formRef": {
    "id": "claim.new",
    "hash": "sha256:..."
  },
  "context": {
    "role": "adjuster",
    "locale": "en-CA"
  },
  "steps": [
    { "op": "set", "node": "claimant.contactMethod", "value": "email" },
    { "op": "expectState", "node": "claimant.email", "state": "visible" },
    { "op": "set", "node": "claimant.email", "value": "not-an-email" },
    { "op": "expectValidation", "node": "claimant.email", "rule": "email-format" },
    { "op": "invoke", "action": "submit" }
  ]
}
```

Before emitting Playwright, the compiler validates that:

- Every node, rule, and action exists at the pinned contract hash.
- Each step is reachable from the preceding state.
- The field adapter supports the requested interaction.
- Values are valid or intentionally invalid for the requested assertion.
- Locators are unique and appropriately scoped.
- Required behavior is not opaque.
- The journey contract contains the expected navigation or submit outcome.

The generated test calls stable form-driver APIs. The agent does not provide CSS, XPath, or widget-specific interaction code.

## Formly integration constraints

`FormlyFormBuilder` is a stateful compiler, not a pure parser. It can apply registered type defaults, wrappers, presets, extensions, controls, initial expressions, and array instances for a supplied scenario. However:

- Component-level defaults and type lifecycle extensions may require an Angular view container and dependency injection.
- Field lifecycle hooks and Observable expressions may run only when the actual Formly component is mounted.
- Arrays with an empty model have no realized rows, so the item template must be retained separately.
- Async options, validators, and remote-driven structure require declared provider contracts and browser verification.
- Hidden fields may be unregistered and reset, changing the model during evaluation.

The real browser therefore remains a parity oracle for representative states. Structural field mutation should be moved out of rendered lifecycle hooks when practical.

## Versioning and change control

Track three independent identities:

- `schemaVersion`: compatibility of the contract format.
- `contractVersion`: intentional semantic version of a form.
- `contentHash`: exact reproducibility of a generated bundle.

Bundles also record source commit, compiler version, Formly version, adapter-registry hash, locale, and scenario inputs. Generated tests pin a content hash and list their node/rule dependencies. Semantic diffs classify removed nodes, value-shape changes, action changes, rule changes, additive optional fields, and presentation-only changes.

## Security and privacy

- Build only explicitly registered forms in an isolated process.
- Disable network access by default and use synthetic fixtures.
- Do not include customer values, secrets, unrestricted option sets, or internal service credentials.
- Treat labels, help text, and remotely supplied options as untrusted data when presenting them to a model.
- Validate form IDs, resource URIs, context, and tool inputs against allowlists and schemas.
- Redact sensitive values from logs and generated test artifacts.
- Never evaluate agent-supplied expressions or function source.

## Success measures

- Percentage of fields, actions, and rules with non-opaque semantics.
- Percentage of rendered interactive controls mapped to exactly one contract node.
- Selector uniqueness across representative states.
- Contract-to-runtime parity failures.
- Held-out prompt-to-intent accuracy.
- Intent validation rejection reasons.
- Generated-test first-run pass rate and flake rate.
- Query latency and model-context size for large forms.
