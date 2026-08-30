# Architecture Overview

## Current implementation boundary

The implemented generic pilot now includes schema v0.4, declared and trusted
scenario compilation, legacy project-owned custom-field profiles,
repository-aware root/project/source configuration, deterministic multi-project
discovery and artifact generation, a workspace index, generic
`formly-contracts list`, `generate`, non-mutating `check`, and read-only
`author-factory-inputs` commands, strict
project-owned cross-field effect registries, and deterministic resolution of
validated effects into form artifacts and workspace indexes. It also includes
two opt-in workplace MVP slices: typed form definitions with explicit
`lineage.rootSymbol` anchors plus a `direct-root-call-v1` TypeScript producer,
and compact `radioChoice()` custom-type authoring that lowers reviewed semantics
to the canonical field-profile registry while sharing the Formly registration
name. Canonical Angular-fixture goldens plus linked and packed consumers verify
the generic pilot outside package-source imports. The authoring command follows
the same exact source lineage to a real factory declaration without adding a
second target registry.

An additional local workspace authoring slice can recover a supported
factory's real exported options type, classify a bounded direct-use grammar,
and render a deterministic partial TypeScript draft beside a registered form
definition. The public workspace API and CLI orchestrate that inspection from
the existing workspace/config and optional stable form IDs; the lower-level
renderer remains private. The draft automates only typed capture placeholders for supported
callbacks, canonical Observables, and unavailable view handles; it keeps
construction values explicit and unsupported inputs unresolved. The compiler
exports only the corresponding harness type—there is no runtime implementation
or application-factory execution path. Inspection calls neither source
`list()` nor the registered factory, writes no suggested file, and places no
draft content in portable contracts or hashes.

The source-usage slice recognizes only the configured
project-to-source-to-definition convention and supported direct calls or
constructor expressions in one explicit leaf application Program. A separate
project-config-only authority Program uses the configured resolver options,
its traversed authority imports and re-exports are compared with the exact Jiti
config runtime, and all three views must agree before a link is exact. The producer emits
`static-convention` evidence that joins an exact form ID and generated contract
hash; it does not execute call arguments or prove that Angular renders the
component, that a route reaches it, or that a business journey traverses it.
The compact custom-type helper currently covers one reviewed radio-choice happy
path and performs no Angular template or DOM inference.

The long-term architecture below remains the intended direction. Broader
source lineage and fragment/change-impact analysis, journey and route
reachability, the controlled Angular project host, named-environment adapter
generation and conformance, optional Nx task integration, production MCP
delivery, typed Playwright execution, browser observation, runtime parity, and
change analysis remain later layers. They must consume or extend the same
contracts rather than move trusted application execution into routine agent
requests.

Form Contract `0.4.0` remains the implemented semantic compatibility boundary.
Separately versioned sibling schema families now exist for the artifact-set
envelope, source usage and journeys, scenario references and execution
authority, the driver-registry manifest, and progressive agent-context query
DTOs. The schema package publishes the pure query API, and the private
experimental Playwright package contains the trusted-local driver
implementation inventory. These are not fields of the v0.4 contract. A real
producer now exists only for the narrow source-usage convention described
above; broader lineage, journey, scenario, Angular-observation, production MCP,
and browser-execution producers do not yet exist. The canonical ownership and
delivery order are recorded in the
[RH-06 reconciliation](planning/agent-context-hardening/rh-06-reconciliation.md)
and [execution index](planning/agent-context-hardening/execution-index.md).

See [the parser MVP specification](mvp-spec.md) for the original foundation,
[the workspace implementation plan](planning/workspace-discovery/implementation-plan.md)
for current sequencing, and the [workplace pilot guide](workplace-pilot.md) for
the supported private-repository evaluation path.

## Context

Large applications often construct Formly forms from TypeScript factories, shared fragments, presets, registered types, wrappers, validators, expressions, feature flags, roles, and asynchronous option providers. This is productive for application development but difficult for an AI agent to interpret reliably.

The end goal is not merely to list fields. An agent generating an E2E test must understand how to reach a form, which controls are relevant in a scenario, how to operate each control, what values and validations matter, and what application outcome should follow.

## Architectural decision

Build a versioned **Form Contract** and a hash-pinned graph of sibling evidence
artifacts outside the MCP request path.

The semantic compiler projects declared Formly configuration and explicit
metadata. Separate build-time producers may use a controlled Formly builder for
scenario-specific normalization, bounded TypeScript analysis for lineage and
provenance, or an Angular application target for authoring observations. The
future MCP server exposes compact read APIs over validated artifacts. Agents
target stable semantic IDs and a typed E2E intent rather than raw selectors or
Formly implementation details.

```text
project registry + Formly configs + reviewed semantic metadata
                              |
                 v0.4 semantic contract + workspace index

root anchors + TS programs        journey catalog       scenario/Angular evidence
             |                          |                          |
             +--------------------------+--------------------------+
                                        |
                    schema-addressed artifact-set envelope
                                        |
                 pure context queries + live freshness status
                                        |
                         pure typed-intent validation
                                        |
               real producer/workplace gate -> MCP -> Playwright
```

MCP and Playwright are adapters over proven pure semantics, not the place where
source, Angular, or application factories are loaded. Live browser parity is a
later verification input and cannot silently promote an observation into
semantic or execution authority.

## Three views of a form

The contract keeps three forms of evidence separate.

### Declared

The fields, fragments, rules, actions, and variants that could exist. This view comes from explicit metadata, registered form factories, and partial static analysis. It is the best view for discovery and change impact, but arbitrary application code can leave parts unknown.

### Resolved

The normalized form for a supplied model and context such as role, locale, jurisdiction, tenant, and feature flags. This view comes from declarative rule evaluation or a controlled Formly build. It is scenario-specific and must record the inputs used to produce it.

### Observed

The controls, roles, accessible names, states, and locators seen in a running browser. This is runtime evidence for one visited state. It verifies the contract but does not reveal unvisited branches or hidden fields.

These views must not be silently merged. Every fact records its evidence origin and unresolved behavior remains explicit.

## Identity and artifact joins

The architecture keeps four identities separate:

| Identity                 | Meaning                                                                 | Authority                                                                                               |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Form ID                  | One semantic form definition and generated contract                     | Project-owned form definition                                                                           |
| Root anchor ID           | The exported function, callable `const`, or class that creates the form | Validated definition anchor plus TypeScript symbol identity                                             |
| Usage ID or callsite key | One invocation of an anchored form in application source                | Explicit usage annotation when durability is required; otherwise checker-derived, build-scoped evidence |
| Journey/step ID          | Business navigation and step membership                                 | Project-owned journey catalog or validated source annotation                                            |

These relations are many-to-many. One root may produce several semantic forms,
and one form may be used at several callsites or journey steps. If an
unannotated usage resolves to several form IDs, the result is ambiguous; names,
labels, routes, and source order are not tie-breakers.

The v0.4 Form Contract remains the semantic form record. A workspace index,
source-lineage index, journey catalog, behavior/scenario evidence, Angular
authoring report, driver-registry manifest, and agent-context manifest are
sibling record families with independent schemas and canonical hashes.

The first shared context schema is deliberately small: one artifact-set
envelope has a structured workspace-index reference, an open collection of
schema-addressed content references, and its own `contentHash`. It does not
close a universal artifact-kind list or impose one generic artifact ID grammar.
Artifact-owning schemas validate their own identities and contents. `CTX-0C`
separately owns exact execution-authority records; `CTX-1` compares pinned
inputs with a live workspace and reports freshness; `CTX-2` owns exhaustive
stable consumer diagnostics and canonical intent validation.

An executable context pins the selected usage, form contract hash, required
journey and scenario hashes, driver-registry hash, and artifact-set hash.
Assembly refuses incompatible sets, stale source evidence, scenarios based on
a different contract, incomplete coverage where a negative answer is required,
or a changed driver registry. The context manifest references artifact hashes;
it does not participate in their hash inputs.

## Major components

### 1. Form registry

The application or a fixture package explicitly registers supported semantic
form definitions. The implemented workspace source contract owns the form ID,
a fresh declared field instance, and an optional typed root-symbol anchor; it
does not also own page, route, or journey meaning.

```ts
const claimForm = defineFormContractDefinition({
  id: "claim.new",
  create: () => ({ fields: createClaimFields() }),
  lineage: { rootSymbol: createClaimFields },
});

const claimsSource = defineFormContractSource({
  sourceId: "claims/forms",
  list: () => [claimForm],
});
```

Registration avoids guessing which exported values happen to be complete
forms. For the opt-in MVP, `lineage.rootSymbol` connects the semantic definition
to a canonical exported function or class. The `direct-root-call-v1` producer
can then record supported direct application usages in a portable source-usage
catalog with `static-convention` evidence. This is not complete source lineage:
fragments and indirect flows remain unindexed, while page, route, action, and
step membership remain planned for a separate journey catalog.

The example above is a trusted, project-authored declared source. It is not a
general instruction to call arbitrary application factories with plausible
synthetic services, streams, callbacks, or templates. Future parameterized
factory support first classifies inert values and opaque capabilities; actual
application-factory execution remains blocked behind the rootless OCI gate
described below.

### 2. Contract compiler

The current generic compiler projects declared field trees and reviewed
metadata into Form Contract `0.4.0`. A future trusted Angular JIT scenario lane
may run in a controlled build or CI environment. That lane would:

1. Load a registered form with the same Formly providers used by the application.
2. Clone fields, model, options, and form state because Formly mutates them.
3. Invoke `FormlyFormBuilder` for named scenarios.
4. Wait for the initial synchronous expression pass to complete.
5. Project the resulting tree through an allowlist serializer.
6. Retain expression callbacks as declared dynamic-rule metadata and record
   their JSON-safe scenario outcome when the controlled build resolves it.
7. Retain unresolved Observables, lifecycle hooks, remote data sources, and
   other executable behavior outside the expression surface as diagnostics.
8. Produce a deterministic, content-addressed bundle.

The compiler must not serialize live field objects. Built fields contain circular parent references, Angular controls, injectors, functions, subscriptions, and other runtime-only state.

#### Controlled project execution hosts

> This subsection describes the long-term, per-project child-process host
> (see "Current implementation boundary" above). Today, `runWorkspace`
> extracts in-process — its recorded runtime provenance worker id is
> `@formly-contract/workspace/in-process` — not via the child-process
> protocol below.

Trusted project configuration and future Formly/Angular execution must not run
in the root orchestrator, Nx daemon, or MCP request process. The workspace
package owns the framework-neutral orchestration boundary and a versioned,
serializable runtime-host protocol:

1. The parent loads only a Node-safe root config, expands project config paths,
   and creates a validated request containing the project config path, project
   root, runtime package-resolution base, effective tsconfig, root policy, and a
   parent-selected runtime-host module descriptor.
2. One fresh child process per project imports the trusted host module by its
   already resolved file URL, evaluates the project config, inventories IDs, and
   waits. No executable module URL may come from config data.
3. The parent rejects cross-project duplicate identities before allowing form
   factories to run. Children then compile and return only JSON-safe artifacts,
   diagnostics, and provenance; live configs, injectors, modules, and functions
   never cross IPC.
4. The parent validates and hashes every result, sorts independently of worker
   completion order, and performs content-addressed artifact publication with
   the workspace index replaced last.

Optional Nx integration must preserve that single orchestration and publication
owner. The first Nx contract therefore attaches one aggregate target to an
explicitly selected coordinator project and delegates one complete workspace
run. It may cache and select that aggregate target from project inputs, but it
must not launch independent per-project publishers: doing so would either bypass
the pre-factory global duplicate gate or contend for the same generation lock
and index. Finer-grained Nx sharding requires a separate protocol design that
retains those invariants.

`@formly-contract/workspace` is the framework-neutral host and orchestrator;
it stays `private: true` and experimental for now (see
[Releasing](releasing.md)), unlike `@formly-contract/schema` and
`@formly-contract/compiler`, which are on the npm-publish path. A future
`@formly-contract/angular` peer will own Angular-specific JIT and AOT
integration; schema owns portable compatibility and provenance DTOs. Angular
packages must resolve from the explicit project runtime base without
treating TypeScript aliases as runtime package authority. Any core/compiler
anchor preflight is a bounded compatibility check, not proof of whole-graph
singleton enforcement; private or bundled Angular copies remain unsupported
until a retained compatibility gate proves otherwise.

A project child contains compiler-facade/module-cache state, crashes, timeouts,
and failed-import contamination, but it is not a hostile-code or network
sandbox. Trusted local execution uses a scrubbed environment and records that
network denial is not enforced. Reproducible CI generation requires a configured
external isolation provider and fails closed when network denial is requested
but unavailable. Portable provenance records exact tool/loader/runtime versions,
the worker and execution-profile versions, and a canonical dependency-lock
digest; machine paths, module URLs, PIDs, timings, and raw environment never
enter hashes.

The portable contract starts at runtime-provenance schema `1.0.0`. It records
the worker ID/version/protocol, adapter ID/version/mode, exact workspace,
compiler, and schema tool versions, Jiti version and canonical loader options,
Node version/platform/architecture, execution-profile identity and network
claim, selected dependency snapshot, and canonically ordered runtime-package
identities. Jiti provenance distinguishes effective `tsconfigPaths` use while
loading the root config from effective use while loading project configs. Tool
and Jiti versions come from the package manifests that own the resolved module
entries rather than from dependency declarations. The dependency snapshot is
the SHA-256 of the selected lockfile's exact bytes and stores only its safe
workspace-relative path. It attests the declared lock state, not installed
package bytes.

Workspace configuration and index schemas move together from `0.1.0` to
`0.2.0` for this provenance boundary. Runtime provenance participates in every
project configuration hash; the root configuration hash includes the parent
provenance plus the resulting project hashes. Readers reject prior workspace
index/configuration schema versions and require regeneration rather than
silently interpreting provenance-free indexes. Form Contract schema `0.4.0`
does not change, so this migration cannot change content-addressed form
artifact bytes or paths.

The execution modes remain deliberately distinct:

| Mode                         | Purpose                                                                          | Boundary                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Trusted config/JIT worker    | Load trusted repository config and approved Angular/Formly scenario entries      | Short-lived project process with policy, timeout, and output controls; not an untrusted-code sandbox                                           |
| AOT authoring browser worker | Build and observe real custom fields through a pinned Angular application target | Fresh browser contexts and deterministic interception where supported; not an OS sandbox                                                       |
| Rootless OCI factory runner  | Future execution of parameterized application factories                          | Required containment profile with a code-free sidecar, runner-owned violation ledger, structural identity gate, and retained negative controls |

The first two modes execute trusted application code for different evidence
purposes and must not share a protocol merely because both use Angular. The OCI
mode remains blocked until `oci-rootless-v1` conformance passes; an ordinary
child process is not a substitute.

### 3. Source indexer

The current optional TypeScript compiler-API pass implements one deliberately
partial source-usage producer. Its portable catalog is a sibling artifact, not
fields silently added to the v0.4 form contract. Within an explicitly
configured leaf application Program, a project-config-only authority Program
that agrees with the exact Jiti config runtime,
and the validated static project/source/definition convention, it can:

- resolve explicitly anchored form-root symbols and supported direct call or
  constructor usages across validated aliases, barrels, and namespace imports;
- record build-scoped source locations and lexical component context with
  `static-convention` evidence, exact form IDs and contract hashes, and
  explicitly incomplete coverage; and
- fail closed for recognized invalid or ambiguous authority without executing
  or serializing application call arguments.

Broader source-lineage responsibilities remain planned, including shared
fragment dependency/change-impact analysis, literal spread and override
explanation, comprehensive dynamic-construct diagnostics, and complete cache
invalidation inputs. Route rendering, page reachability, and journey membership
belong to separate future evidence producers.

It is not an authoritative evaluator for arbitrary factories, dependency
injection, mutations, hooks, asynchronous behavior, or business journeys.
Wrapper calls, dynamic routes, and cross-program joins that are not proven
remain ambiguous or unknown. An explicit usage or journey annotation may add
authority, but it must attach to a validated source location and preserve the
underlying evidence.

### 4. Semantic contract model

The semantic form artifact and its sibling records expose related graphs without
collapsing their ownership:

- **Model schema:** value types and ordinary constraints.
- **UI graph:** sections, controls, arrays, ordering, and locators.
- **Rule graph:** visibility, enabled, required, readonly, defaults, options, and cross-field validation.
- **Journey catalog (sibling):** route, authentication, fixtures, navigation,
  submit behavior, step membership, and expected application outcomes.
- **Behavior/scenario evidence (sibling):** normalized state conditions, exact
  causal edges, access prerequisites, replay cases, scoped completeness, and
  resolved scenario references.

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
const emailSelected = eq(modelRef("contactMethod"), value("email"));
```

Legacy string and function expressions can be recognized only when safe. Otherwise the contract records a rule ID, declared dependencies, source provenance, known scenario outcomes, and an opacity diagnostic. Arbitrary expression source is never evaluated by the MCP server.

State rules and operational cross-field effects are separate contracts. A
state rule says when one property evaluates true/false/unknown. An actionable
effect is application-declared per form and connects stable trigger and target
node IDs with a semantic kind, target property, ordering, timing/readiness,
condition reference, and declared evidence.

Conservative string-expression references, opaque handler/function signals,
and controlled scenario deltas may help authors review missing declarations,
but they never become operational verbs automatically. Existing v0.4 explicit
effects remain authoritative for business verbs such as `loads`, `filters`,
`clears`, `controls-state`, and `toggles`. A closed normalized rule witnessed
against pinned evaluation semantics may authorize only the exact state edge it
proves, such
as visibility or required state under one condition. When opaque behavior makes
analysis coverage incomplete, absence of an edge cannot prove independence or
unreachability. Readiness capabilities remain serializable field-profile data;
trusted drivers implement validated capabilities rather than inventing
cross-field relationships.

Portable condition, edge, access, replay, and completeness semantics are owned
by the behavior/scenario schema. Trusted Angular scenario compilation produces
resolved artifacts tied to one basis contract hash. Angular AOT observation may
corroborate those artifacts, while the context/query layer only references and
validates them; it is not a scenario producer.

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

Reviewed declarations and Angular authoring evidence have different authority.
The current MVP implements one narrow authoring slice: a browser-safe
`radioChoice()` contracted-type declaration supplies the same exact Formly type
name to production registration and to deterministic lowering into the
canonical `FieldTypeProfileRegistry`. It does not inspect a component or infer
semantics from Angular metadata, templates, or rendered DOM. Other custom-field
families still require a legacy reviewed registry or remain explicitly
unmapped.

[ADR 0011](decisions/0011-named-formly-environments-and-contracted-field-adapters.md)
proposes the broader end state: reusable field libraries author compact
contracted adapters once through the same catalog/helper path used by
production Formly registration, and projects select one exact named Formly
environment. Third-party types require an explicit reviewed binding adapter.
A future Angular host inventories that real environment, joins its reviewed
adapter contributions, runs required controlled conformance, and
deterministically lowers them to the existing canonical
`FieldTypeProfileRegistry`.

The generated registry remains the compiler and contract compatibility
boundary; Angular metadata, source/template candidates, rendered roles and
parts, coverage, drift, and migration scaffolds remain evidence. They cannot
approve semantics, choose a codec, or register a driver. The MVP radio-choice
path is declared semantic metadata, not Angular conformance. The broader model
will require a profile's exact registration, declaration, driver capability,
and required conformance to agree before it is actionable. Display/assertion-only
components require an explicit non-interactive disposition and remain
non-executable or unknown until the schema defines their no-driver/assertion
surface. Current project-owned raw registries remain the explicit legacy
authoring path for controls outside the compact radio-choice slice rather than
the intended final UX.

One Formly field may map to multiple interactive controls. For example, a date range has start and end parts, while an address lookup may expose a search box, suggestions, and a confirmed structured value.

### 7. Pure context and intent core, then MCP

Before adding transport, `CTX-1` provides progressive usage, context, node, and
E2E-slice queries plus live freshness comparison over strict synthetic fixtures
and, later, real producer artifacts. `CTX-2` accepts only typed semantic IDs and
policies, verifies all pinned references and execution authority, emits
exhaustive stable diagnostics, and produces a canonical validated plan and
hash. It imports neither Angular nor Playwright and performs no registry or
browser lookup. Its exit proves the positive and negative synthetic
walkthroughs only.

Transport and browser execution remain blocked until the real representative
producer/workplace `CTX-GATE` also has current outputs from `LIN-4`, `BHV-4`,
`ANG-5`, and `DRV-0`. After that gate, the MCP server exposes the same pure
semantics, and the first Playwright vertical schedules after MCP. The MCP server
reads versioned bundles; it does not import Angular or execute application form
factories during routine queries.

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

Before any Playwright package resolves a driver, the pure validator proves
that:

- Every node, rule, and action exists at the pinned contract hash.
- Each step is reachable from the preceding state.
- The field adapter supports the requested interaction.
- Values are valid or intentionally invalid for the requested assertion.
- Locators are unique and appropriately scoped.
- Required behavior is not opaque.
- The journey catalog contains the expected navigation or submit outcome.

The Playwright layer recompiles or revalidates the complete canonical plan,
checks the pinned driver-registry hash, and then resolves only pre-registered
driver IDs and node-local targets. The generated test calls stable form-driver
APIs. The agent does not provide CSS, XPath, widget-specific interaction code,
or a module path. Native-field execution is the first browser vertical; custom
fields, dynamic behavior, repeaters, and parity follow only after their
producer evidence and refusal tests exist.

## Formly integration constraints

`FormlyFormBuilder` is a stateful compiler, not a pure parser. It can apply registered type defaults, wrappers, presets, extensions, controls, initial expressions, and array instances for a supplied scenario. However:

- Component-level defaults and type lifecycle extensions may require an Angular view container and dependency injection.
- Field lifecycle hooks and Observable expressions may run only when the actual Formly component is mounted.
- Arrays with an empty model have no realized rows, so the item template must be retained separately.
- Async options, validators, and remote-driven structure require declared provider contracts and browser verification.
- Hidden fields may be unregistered and reset, changing the model during evaluation.

The real browser therefore remains a parity oracle for representative states. Structural field mutation should be moved out of rendered lifecycle hooks when practical.

## Versioning and change control

Keep format compatibility, semantic form identity, and exact content identity
separate:

- `schemaVersion`: compatibility of the contract format.
- `formId`: the project-owned semantic form identity. Adding an independent
  `contractVersion` would require an explicit schema decision.
- `contentHash`: exact reproducibility of a generated bundle.

The current workspace index records configuration, registry, tool/runtime, and
dependency-snapshot identities around v0.4 content-addressed artifacts. Planned
sibling records add repository/build and scenario inputs where those facts are
owned. Generated tests pin a content hash and list their node/rule dependencies.
Semantic diffs classify removed nodes, value-shape changes, action changes,
rule changes, additive optional fields, and presentation-only changes.

Sibling artifact owners define their own schema, canonical content hash, causal
inputs, coverage, and identity rules. The shared envelope pins them through
open schema-addressed content references and a structured workspace-index
anchor; it does not manufacture a universal build ID or input digest. An agent
context pins the exact compatible set instead of asking for unqualified
“latest” data. Staleness, a basis-hash mismatch, ambiguous usage, or incomplete
authoritative coverage is a blocking result for compilation, not a warning
followed by best-effort execution.

## Security and privacy

- Build only explicitly registered forms in the execution profile authorized
  for that evidence class. A trusted JIT child contains runtime state but is not
  a network or hostile-code sandbox; an AOT browser host is not an OS sandbox;
  arbitrary application-factory execution requires the separate rootless OCI
  profile.
- Require an externally enforced network-denying profile for reproducible CI
  generation; trusted local mode must state that network denial is not enforced.
  Use synthetic fixtures in both profiles.
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
