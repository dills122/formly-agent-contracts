# RH-05: Agent-to-Contract-to-Playwright Context Flow

**Status:** Research complete; independent-review findings addressed;
conditional implementation recommendation

**Research date:** 2026-08-27

**Repository commit inspected:** `d4ffdb517d0d506ed7cd55074c4eac720a145f8b`

**Environment:** Node.js `22.22.1`, pnpm `10.23.0`, Angular `20.3.29`,
Formly `6.1.8`; Playwright is not a production dependency in this repository.

**Decision owner:** Project maintainer

## Executive decision

**Inference — recommendation:** Proceed with a narrow agent-context layer, but
do not begin with Playwright code generation. The smallest reliable product is
a read-only, hash-pinned discovery/query surface plus a strict test-intent
validator that can refuse execution. Add deterministic driver execution only
after a fixture can pass the validator without selector, value, scenario,
navigation, validation, or readiness guesses.

**Repository observation — current feasibility:** The v0.4 form artifacts and
workspace index already carry much of the middle of the journey: stable form
and node IDs, content hashes, model paths, labels, constraints, value domains,
interaction-profile identities, wrapper preconditions, explicit cross-field
effects, analysis completeness, locators, and diagnostics. They do not yet
carry the two ends of the journey: (1) a stable join from repository/page/route
or step evidence to a form usage, or (2) a typed test-intent and driver boundary
that can prove a browser action and assertion are supported.

**Repository observation — blocking gaps:** The current workspace source type
accepts named scenarios, but `runWorkspace` only calls the base form factory
and declared extractor; it neither invokes scenario factories nor emits a
scenario index/resolved artifact. The `claims.intake` golden therefore retains
`claimDetails.caseType` as a dynamic value domain with no executable
interaction profile. Its wrapper-aware custom radio profile also names
`wrapper-expand`, `group`, and `option` parts while the node exposes only a
`target: "control"` DOM-ID locator. A strict compiler cannot infer the missing
part scopes.

**Inference — value proposition:** The full flow is worthwhile for a
repository with many repeated Formly patterns, custom widgets, and recurring
agent-authored tests. It is not yet better than source reading plus ordinary
Playwright inspection for a one-off simple native form. Its distinctive value
is early, explainable refusal: a model can discover the right form, but cannot
silently invent a selector, option value, branch transition, validation
trigger, or readiness wait.

**Confidence:** `0.88` that the proposed contracts are sufficient for the two
paper journeys; `0.72` that they will provide net value in a real repository
before one representative usage, scenario compiler, and driver are measured.
The largest unknown is the cost of authoring usage/action/validation metadata
and exact custom-part locators in the workplace corpus.

## Evidence vocabulary and method

Every material conclusion in this report is tagged as one of:

- **Documented fact:** supported by a current repository contract/specification
  or an official external source.
- **Repository observation:** read or executed against the commit and
  environment above.
- **Inference:** a design conclusion derived from documented facts and
  repository observations.
- **Unknown:** not established by the present repository, fixture, or primary
  sources.

**Repository observation — method:** The research read [AGENTS.md](../../../AGENTS.md),
the [architecture overview](../../architecture-overview.md), the
[implementation plan](../../implementation-plan.md), the
[v0.3 locator specification](../../v0.3-test-locators-spec.md), the
[v0.4 E2E metadata specification](../../v0.4-e2e-authoring-metadata-spec.md),
the [workspace configuration contract](../../workspace-configuration.md), the
current schema/compiler/workspace implementation, the Angular monorepo fixture
sources and goldens, and the prior
[form discovery](../form-discovery-dx.md),
[field-profile](../v0.4-field-type-adapter.md), and
[cross-field effect](../v0.4-cross-field-effects.md) research.

**Documented fact — external source policy:** Playwright's locator,
actionability, and assertion claims below use only official Playwright
documentation. Accessibility claims use W3C WAI sources.

**Repository observation — retained output:** No research prototype was
retained. The paper walkthrough uses existing committed fixture sources and
goldens. This document is the only changed research artifact.

## Decision question and success bar

**Documented fact:** The target request is representative of an agent starting
with imprecise repository language, for example: “A bug was reported on order
entry step one; add positive and negative tests.” The agent must get from that
language to the correct form usage and scenario, then produce tests without
inventing selectors or application semantics.

**Inference — success bar:** A reliable journey must meet all of these gates:

1. Discovery returns explicit candidate usages with match evidence and does
   not silently pick between ambiguous forms/usages.
2. Every selected usage, form, and scenario is pinned to compatible immutable
   artifact hashes with an honest freshness state.
3. The agent initially receives a compact summary, then asks for focused nodes,
   prerequisites, effects, values, and blockers.
4. Test intent names semantic IDs and typed values/policies only. It has no CSS,
   XPath, Playwright locator, callback source, or driver package name supplied
   by the agent.
5. Validation proves the node, value, operation, commit ownership,
   post-commit assertion, ordering, readiness, wrapper/repeater access,
   validation surface, and usage action are supported.
6. Compilation resolves only pre-registered driver IDs/versions and locator
   targets. A missing fact is a diagnostic, never a fallback guess.
7. Runtime execution uses Playwright actionability and web-first assertions and
   reports parity/staleness failures against the pinned context.

## Current repository evidence

### What is already sufficient

| Current artifact fact | Evidence class | Why it helps the flow |
| --- | --- | --- |
| Workspace forms have `projectId`, `sourceId`, `formId`, `artifactPath`, schema version, content hash, diagnostics, effects, and effect-analysis state. | Repository observation | A query service can enumerate immutable declared artifacts without importing Angular. |
| Contract nodes have stable IDs, ordered trees, typed model paths, form/semantic types, labels, constraints, options/domains, state, locators, children, and array templates. | Repository observation | Node lookup and focused context slices can use stable identities rather than source-derived selectors. |
| Value domains distinguish enumerated, dynamic, and unknown values, including evidence and complete versus scenario completeness. | Documented fact | A validator can reject unsupported concrete values instead of treating a label, default, or model sample as a domain. |
| Custom profiles describe semantic parts, operations, value shape, driver identity/version, wrapper preconditions, readiness capabilities, and unknowns. | Repository observation | A driver can be allowlisted and widget-specific sequencing can be kept out of the agent prompt. |
| Explicit effects connect trigger and target node IDs with property, kind, ordering, timing/readiness, and analysis completeness. | Repository observation | The validator can require source-before-target ordering and avoid fixed sleeps. |
| Artifact diagnostics omit raw option/model/callback/error data. | Documented fact | The existing privacy boundary is compatible with model-facing queries. |

The current interfaces are defined in
[`packages/schema/src/contract.ts`](../../../packages/schema/src/contract.ts),
[`packages/schema/src/field-type-interaction.ts`](../../../packages/schema/src/field-type-interaction.ts),
[`packages/schema/src/cross-field-effect.ts`](../../../packages/schema/src/cross-field-effect.ts),
and
[`packages/workspace/src/workspace-index.ts`](../../../packages/workspace/src/workspace-index.ts).

### What is genuinely missing

| Missing input | Evidence class | Consequence if omitted | Minimum repair |
| --- | --- | --- | --- |
| Form **usage** index: repository-relative source location, symbol, consuming page/component, form ID, and usage ID. | Repository observation | Bug text or an open source file cannot be joined to the workspace form. | Add a stable, versioned usage record joined to the existing form entry. |
| Route/step membership and entry/navigation action. | Repository observation | “Step one” cannot be distinguished from another use of the same form, and the browser cannot reach it without an invented route/click. | Usage-owned entry driver and ordered step records with node/action membership. |
| Generated scenario inventory and resolved artifact references. | Repository observation | Dynamic options and conditional state remain declared/unknown even though scenario definitions exist in source. | Emit scenario IDs, safe input provenance, basis hash, resolved artifact hash, and diagnostics during trusted generation. |
| Versioned native-field and application-driver bindings. | Repository observation | Many current native nodes have no `interactionProfile`; a strict compiler cannot decide whether to fill, check, or select. | Resolve built-in profiles into artifacts or a hash-pinned driver capability registry. |
| Locator scope/target coverage for every profile part and wrapper precondition. | Repository observation | `wrapper-expand` or overlay option parts cannot be located from `target: control`. | Validate that each required part has an exact node-local locator or an explicitly defined driver-owned scoped-role recipe. |
| Value-commit ownership and post-commit assertion surfaces. | Repository observation | `fill` can change a DOM value without committing a control configured for blur/submit, producing a false-positive assertion. | Project `updateOn`/equivalent semantics into a profile-owned immediate/explicit node-local commit or a usage action, and name a committed-value assertion surface. |
| Validation activation and assertion surface. | Repository observation | “Required” says what is invalid, but not whether validation appears on blur, submit/next, or change, nor how to assert the correct message. | Usage/node metadata must name the trigger, constraint/rule ID, and observable error target/state. |
| Freshness envelope tying source inputs, usage index, scenarios, contract, and driver registry together. | Repository observation | Matching hashes can still describe an older checkout, and independently generated indexes can be mixed. | Add build ID, repository revision, input digest, registry hashes, and current/stale/unknown comparison. |
| Journey action/outcome metadata where a test must advance or submit. | Documented fact | A field contract alone cannot prove the action or expected application outcome. | Keep actions/outcomes in the usage journey contract, not in field nodes. |

**Inference:** These are minimum execution inputs, not an argument to place all
of them in the core `FormContract`. Usage/navigation/step/action data belongs
in a usage/journey index; scenario identity belongs in an artifact envelope;
field interaction, commit, value-assertion, and validation surfaces belong with
nodes/profiles; driver implementations remain in the trusted Playwright
package.

## Smallest reliable journey

**Inference — proposed sequence:**

```text
bug text / open file / route / component
                 |
         search_form_usages
                 |
   explicit candidate usage + match reasons
                 |
   get_form_context(summary, pinned hashes)
                 |
 find_form_nodes / get_e2e_slice(focus nodes)
                 |
          typed test intent
                 |
  validate_test_intent (refuse or plan)
                 |
  compile_test_intent (trusted driver calls)
                 |
 Playwright actionability + web-first assertions
                 |
 parity/freshness diagnostics against pinned context
```

**Inference — key boundary:** Discovery may use fuzzy text ranking to present
candidates, but the intent must contain an exact `usageId`, `formId`, contract
hash, and scenario artifact hash. Ranking evidence never becomes execution
authority.

### Context identity

**Inference — minimum reference carried through every query and intent:**

```ts
interface ContractContextRef {
  readonly workspaceIndexHash: `sha256:${string}`;
  readonly buildId: string;
  readonly usage: { readonly id: string; readonly version: number };
  readonly form: {
    readonly id: string;
    readonly contractHash: `sha256:${string}`;
  };
  readonly scenario?: {
    readonly id: string;
    readonly artifactHash: `sha256:${string}`;
    readonly basisContractHash: `sha256:${string}`;
  };
  readonly driverRegistryHash: `sha256:${string}`;
}
```

**Inference:** The server must reject a context whose usage, form, scenario,
and driver registry were not generated under the same build envelope. A
scenario's `basisContractHash` prevents a resolved artifact from being applied
to a newer declared form with coincidentally stable node IDs.

## Minimal query/API contract

The shapes below are proposals for strict read-only MCP tools. They are not a
production schema change.

### Shared query projections

**Inference:** Every query result is a closed, versioned DTO. Projection IDs
refer back to the immutable `contextRef`; they do not embed executable locator
recipes, callbacks, or driver modules in model-facing responses.
Runtime schemas reject unknown properties, unsupported schema versions, and
unordered duplicate identities at every input, result, plan, and compile
envelope.

```ts
type E2eCapability =
  | 'open-usage'
  | 'fill'
  | 'check'
  | 'select-option'
  | 'select-from-overlay'
  | 'type-and-pick'
  | 'select-row'
  | 'add-item'
  | 'expand-item'
  | 'activate-wrapper'
  | 'wait-readiness'
  | 'commit-value'
  | 'activate-validation'
  | 'assert-state'
  | 'assert-value'
  | 'assert-validation'
  | 'invoke-usage-action'
  | 'assert-outcome';

interface PageRequestProjection<Collection extends string> {
  readonly collection: Collection;
  readonly limit?: number; // server-capped
  readonly cursor?: string; // opaque and bound to the exact context/query
}

type PageProjection<Collection extends string> =
  | {
      readonly collection: Collection;
      readonly truncated: false;
      readonly nextCursor?: never;
    }
  | {
      readonly collection: Collection;
      readonly truncated: true;
      readonly nextCursor: string;
    };

interface AtomicCollectionProjection<Collection extends string, Item> {
  readonly collection: Collection;
  readonly complete: true;
  readonly maximumItems: number;
  readonly items: readonly Item[];
}

type ContractDiagnosticCodeProjection =
  | 'OPAQUE_FUNCTION'
  | 'ASYNC_VALUE'
  | 'UNKNOWN_FIELD_SHAPE'
  | 'UNSUPPORTED_RULE'
  | 'LOCATOR_DERIVATION_FAILED'
  | 'UNRELIABLE_DOM_ID'
  | 'UNMAPPED_FIELD_TYPE'
  | 'UNMAPPED_PROFILE_VARIANT'
  | 'UNMAPPED_WRAPPER_PROFILE'
  | 'DUPLICATE_WRAPPER_REQUEST'
  | 'PROFILE_PART_CONFLICT'
  | 'WRAPPER_BLOCKS_GENERIC_DRIVER'
  | 'VALUE_DOMAIN_PROJECTION_FAILED'
  | 'AMBIGUOUS_VALUE_MAPPING'
  | 'UNKNOWN_EFFECT_SOURCE'
  | 'UNKNOWN_EFFECT_TARGET'
  | 'UNSUPPORTED_EFFECT_TARGET'
  | 'UNKNOWN_EFFECT_READINESS'
  | 'UNKNOWN_EFFECT_CONDITION'
  | 'EFFECT_CYCLE';

interface ContractDiagnosticIdentityProjection {
  readonly source: 'form-contract';
  readonly schemaVersion: '0.4.0';
  readonly code: ContractDiagnosticCodeProjection;
}

interface ContractDiagnosticEvidenceProjection {
  readonly identity: ContractDiagnosticIdentityProjection;
  readonly sourceSeverity: 'warning' | 'error';
  readonly sourcePath: readonly (string | number)[];
  readonly evidenceRefs: readonly string[];
}

interface DiagnosticSummary {
  readonly source: 'agent-context';
  readonly diagnostic: IntentDiagnostic;
  readonly count: number;
}

type AgentContextQueryDiagnostic = Extract<
  IntentDiagnostic,
  { readonly phase: 'discovery' | 'context' }
>;

type QueryDiagnosticProjection = AgentContextQueryDiagnostic;

interface UsageDriverProjection {
  readonly kind: 'application';
  readonly id: string;
  readonly version: number;
}

interface UsageEntryProjection {
  readonly id: string;
  readonly capability: 'open-usage';
  readonly driver: UsageDriverProjection;
  readonly evidenceRefs: readonly string[];
}

interface UsageActionProjection {
  readonly id: string;
  readonly kind: 'next' | 'submit' | 'cancel' | 'other';
  readonly driver: UsageDriverProjection;
  readonly outcomeIds: readonly string[];
  readonly evidenceRefs: readonly string[];
}

interface UsageOutcomeProjection {
  readonly id: string;
  readonly kind: 'remains-on-step' | 'step-changed' | 'navigation' | 'message';
  readonly assertionDriver: UsageDriverProjection;
  readonly assertionTargetRef: string;
  readonly evidenceRefs: readonly string[];
}

interface UsageStepProjection {
  readonly id: string;
  readonly ordinal: number;
  readonly label?: string;
  readonly nodeIds: readonly string[];
  readonly actionIds: readonly string[];
}

interface UsageJourneyProjection {
  readonly entry: UsageEntryProjection;
  readonly steps: readonly UsageStepProjection[];
  readonly actions: readonly UsageActionProjection[];
  readonly outcomes: readonly UsageOutcomeProjection[];
}

interface ValueDomainProjection {
  readonly kind: 'enumerated' | 'dynamic' | 'mixed' | 'unknown';
  readonly completeness: 'complete' | 'partial' | 'unknown';
  readonly values?: readonly JsonValue[];
  readonly runtimeEnumerationId?: string;
  readonly evidenceRefs: readonly string[];
}

type ValueCommitProjection =
  | {
      readonly id: string;
      readonly kind: 'node-local';
      readonly mode: 'immediate' | 'blur';
      readonly execution: 'included-in-set' | 'explicit-intent';
      readonly driverCapability: 'commit-value';
      readonly evidenceRefs: readonly string[];
    }
  | {
      readonly id: string;
      readonly kind: 'usage-action';
      readonly actionId: string;
      readonly evidenceRefs: readonly string[];
    };

interface NodeInteractionProjection {
  readonly profile: { readonly id: string; readonly version: number };
  readonly driver: {
    readonly kind: 'generic' | 'application';
    readonly id: string;
    readonly version: number;
  };
  readonly operation: E2eCapability;
  readonly partRefs: readonly string[];
  readonly locatorTargetRefs: readonly string[];
  readonly readinessIds: readonly string[];
  readonly commit?: ValueCommitProjection;
}

interface ValidationSurfaceProjection {
  readonly id: string;
  readonly constraint: string;
  readonly activation:
    | { readonly kind: 'none' }
    | {
        readonly kind: 'node-local';
        readonly activationId: string;
        readonly mechanic: 'blur' | 'click' | 'check';
        readonly partRef: string;
        readonly locatorTargetRef: string;
      }
    | { readonly kind: 'usage-action'; readonly actionId: string };
  readonly assertionTargetRef: string;
  readonly evidenceRefs: readonly string[];
}

interface ValueAssertionProjection {
  readonly id: string;
  readonly kind: 'committed-model-value' | 'control-value';
  readonly assertionTargetRef: string;
  readonly evidenceRefs: readonly string[];
}

interface E2eNodeProjection {
  readonly nodeId: string;
  readonly modelPath: readonly (string | number | '*')[];
  readonly label?: string;
  readonly semanticType?: string;
  readonly capabilities: readonly E2eCapability[];
  readonly constraintIds: readonly string[];
  readonly domain?: ValueDomainProjection;
  readonly interaction?: NodeInteractionProjection;
  readonly validationSurfaces: readonly ValidationSurfaceProjection[];
  readonly valueAssertions: readonly ValueAssertionProjection[];
  readonly unknowns: readonly {
    readonly aspect:
      | 'semantic-role'
      | 'model-codec'
      | 'runtime-states'
      | 'locator-scope'
      | 'interaction-sequence'
      | 'value-commit'
      | 'validation-surface'
      | 'value-assertion'
      | 'usage'
      | 'freshness';
    readonly blocking: boolean;
    readonly evidenceRef: string;
  }[];
}

type E2ePrerequisite =
  | {
      readonly kind: 'set-before';
      readonly effectId: string;
      readonly sourceNodeId: string;
      readonly targetNodeId: string;
    }
  | {
      readonly kind: 'wrapper-activation';
      readonly nodeId: string;
      readonly partRef: string;
      readonly operation: 'click' | 'check';
    }
  | {
      readonly kind: 'readiness';
      readonly nodeId: string;
      readonly readinessId: string;
    }
  | {
      readonly kind: 'visible-before-interaction';
      readonly nodeId: string;
      readonly witnessEffectId: string;
    }
  | {
      readonly kind: 'item-context';
      readonly nodeId: string;
      readonly itemModes: readonly ['existing-index', 'created-item'];
    };

interface DeclaredEffectProjection {
  readonly id: string;
  readonly version: number;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly targetProperty:
    | 'enabled'
    | 'options'
    | 'required'
    | 'value'
    | 'visibility';
  readonly ordering: 'none' | 'source-before-target';
  readonly timing:
    | { readonly mode: 'sync' }
    | { readonly mode: 'async'; readonly readinessId: string }
    | { readonly mode: 'unknown' };
  readonly conditionRuleId?: string;
  readonly evidenceRefs: readonly string[];
}
```

### 1. `search_form_usages`

**Inference — purpose:** Map repository or bug evidence to candidate form
usages without returning whole contracts.

```ts
interface SearchFormUsagesInput {
  readonly query?: string; // untrusted search text, never instructions
  readonly sourceLocation?: {
    readonly path: string; // workspace-relative only
    readonly line?: number;
    readonly column?: number;
  };
  readonly symbol?: {
    readonly projectId?: string;
    readonly qualifiedName: string;
  };
  readonly route?: { readonly routeId?: string; readonly path?: string };
  readonly step?: {
    readonly usageId?: string;
    readonly id?: string;
    readonly ordinal?: number;
    readonly label?: string;
  };
  readonly formId?: string;
  readonly modelPath?: readonly (string | number | '*')[];
  readonly label?: string;
  readonly scenarioId?: string;
  readonly capabilities?: readonly E2eCapability[];
  readonly candidatePage?: PageRequestProjection<'candidates'>;
}

interface FormUsageCandidate {
  readonly usage: { readonly id: string; readonly version: number };
  readonly formId: string;
  readonly projectId: string;
  readonly sourceId: string;
  readonly component?: { readonly symbol: string; readonly path: string };
  readonly route?: { readonly id: string; readonly pathTemplate?: string };
  readonly step?: { readonly id: string; readonly ordinal: number };
  readonly scenarioIds: AtomicCollectionProjection<'scenario-ids', string>;
  readonly match: AtomicCollectionProjection<
    'match-evidence',
    {
      readonly kind:
        | 'exact-source'
        | 'symbol'
        | 'route'
        | 'step'
        | 'form-id'
        | 'model-path'
        | 'label'
        | 'capability'
        | 'text';
      readonly evidenceRef: string;
    }
  >;
  readonly blockers: AtomicCollectionProjection<'blockers', DiagnosticSummary>;
  readonly contextRef: ContractContextRef;
}

type SearchFormUsagesResult =
  | {
      readonly schemaVersion: '0.1.0';
      readonly status: 'complete';
      readonly candidates: readonly FormUsageCandidate[];
      readonly page: PageProjection<'candidates'>;
      readonly diagnostics: AtomicCollectionProjection<
        'diagnostics',
        QueryDiagnosticProjection
      >;
    }
  | {
      readonly schemaVersion: '0.1.0';
      readonly status: 'refused';
      readonly diagnostics: readonly [
        Extract<
          AgentContextQueryDiagnostic,
          { readonly code: 'ATOMIC_RECORD_TOO_LARGE' }
        >,
      ];
    };
```

**Inference — ambiguity policy:** A unique exact structured match may be
selected automatically. More than one viable usage, or text-only ranking
without a configured confidence gate, returns `AMBIGUOUS_FORM_USAGE` and
candidate references. The API never resolves ambiguity with array order.

### 2. `get_form_context`

**Inference — purpose:** Return a compact form/usage/step summary after a
candidate is selected.

```ts
type GetFormContextInput =
  | {
      readonly contextRef: ContractContextRef;
      readonly view: 'summary';
      readonly stepPage?: PageRequestProjection<'steps'>;
    }
  | {
      readonly contextRef: ContractContextRef;
      readonly view: 'diagnostics';
      readonly diagnosticPage?: PageRequestProjection<'diagnostics'>;
    }
  | {
      readonly contextRef: ContractContextRef;
      readonly view: 'journey';
    };

interface FormContextSummary {
  readonly contextRef: ContractContextRef;
  readonly freshness: 'current' | 'stale' | 'unknown';
  readonly usage: {
    readonly entryCapability: 'open-usage';
    readonly steps: readonly {
      readonly id: string;
      readonly ordinal: number;
      readonly nodeCount: number;
      readonly actionIds: readonly string[];
    }[];
  };
  readonly form: {
    readonly nodeCount: number;
    readonly contractDiagnosticEvidenceCounts: AtomicCollectionProjection<
      'contract-diagnostic-evidence-counts',
      {
        readonly identity: ContractDiagnosticIdentityProjection;
        readonly sourceSeverity: 'warning' | 'error';
        readonly count: number;
      }
    >;
    readonly executableCapabilities: AtomicCollectionProjection<
      'executable-capabilities',
      E2eCapability
    >;
    readonly scenarioIds: AtomicCollectionProjection<'scenario-ids', string>;
    readonly effectAnalysis: 'complete' | 'incomplete' | 'absent';
  };
  readonly blockers: AtomicCollectionProjection<'blockers', DiagnosticSummary>;
}

type GetFormContextResult =
  | {
      readonly schemaVersion: '0.1.0';
      readonly view: 'summary';
      readonly status: 'complete';
      readonly summary: FormContextSummary;
      readonly page: PageProjection<'steps'>;
    }
  | {
      readonly schemaVersion: '0.1.0';
      readonly view: 'diagnostics';
      readonly status: 'complete';
      readonly contextRef: ContractContextRef;
      readonly diagnostics: readonly QueryDiagnosticProjection[];
      readonly page: PageProjection<'diagnostics'>;
    }
  | {
      readonly schemaVersion: '0.1.0';
      readonly view: 'journey';
      readonly status: 'complete';
      readonly contextRef: ContractContextRef;
      readonly journey: UsageJourneyProjection;
      readonly diagnostics: AtomicCollectionProjection<
        'diagnostics',
        QueryDiagnosticProjection
      >;
    }
  | {
      readonly schemaVersion: '0.1.0';
      readonly view: 'journey';
      readonly status: 'refused';
      readonly contextRef: ContractContextRef;
      readonly diagnostics: readonly [
        Extract<
          AgentContextQueryDiagnostic,
          {
            readonly code:
              | 'ATOMIC_VIEW_TOO_LARGE'
              | 'ATOMIC_RECORD_TOO_LARGE';
          }
        >,
        ...Extract<
          AgentContextQueryDiagnostic,
          {
            readonly code:
              | 'ATOMIC_VIEW_TOO_LARGE'
              | 'ATOMIC_RECORD_TOO_LARGE';
          }
        >[],
      ];
    }
  | {
      readonly schemaVersion: '0.1.0';
      readonly view: 'summary' | 'diagnostics';
      readonly status: 'refused';
      readonly contextRef: ContractContextRef;
      readonly diagnostics: readonly [
        Extract<
          AgentContextQueryDiagnostic,
          { readonly code: 'ATOMIC_RECORD_TOO_LARGE' }
        >,
      ];
    };
```

**Inference — bounded-result rule:** `summary` pages only the ordered step
summaries through `stepPage`/`collection: 'steps'`, while `diagnostics` pages
only agent-context diagnostics through
`diagnosticPage`/`collection: 'diagnostics'`. A journey is a referentially
complete atomic view:
the server either returns its entry, steps, actions, and outcomes together or
returns `ATOMIC_VIEW_TOO_LARGE` with no partial journey. This avoids a cursor
that strands an action away from its step or outcome. Any oversized atomic
summary/diagnostic record returns `ATOMIC_RECORD_TOO_LARGE` with no partial
record.

### 3. `find_form_nodes`

**Inference — purpose:** Resolve a node by form ID, model path, label,
scenario, or capability while keeping ambiguity explicit.

```ts
interface FindFormNodesInput {
  readonly contextRef: ContractContextRef;
  readonly withinStepId?: string;
  readonly nodeId?: string;
  readonly modelPath?: readonly (string | number | '*')[];
  readonly label?: string;
  readonly semanticType?: string;
  readonly capability?: E2eCapability;
  readonly scenarioId?: string;
  readonly include?: readonly (
    | 'constraints'
    | 'domain'
    | 'interaction'
    | 'locators'
    | 'effects'
    | 'unknowns'
  )[];
  readonly nodePage?: PageRequestProjection<'nodes'>;
}

type FindFormNodesResult =
  | {
      readonly schemaVersion: '0.1.0';
      readonly status: 'complete';
      readonly contextRef: ContractContextRef;
      readonly nodes: readonly E2eNodeProjection[];
      readonly page: PageProjection<'nodes'>;
      readonly diagnostics: AtomicCollectionProjection<
        'diagnostics',
        QueryDiagnosticProjection
      >;
    }
  | {
      readonly schemaVersion: '0.1.0';
      readonly status: 'refused';
      readonly contextRef: ContractContextRef;
      readonly diagnostics: readonly [
        Extract<
          AgentContextQueryDiagnostic,
          { readonly code: 'ATOMIC_RECORD_TOO_LARGE' }
        >,
      ];
    };
```

**Inference:** Exact `nodeId` and typed `modelPath` matches outrank labels.
Labels are useful discovery text, not identity. Duplicate labels return
`AMBIGUOUS_NODE` with stable IDs and model paths.

### 4. `get_e2e_slice`

**Inference — purpose:** Return only the closure needed to author one test
case: focused nodes, their step/usage entry, incoming ordering/effect edges,
wrapper/repeater preconditions, values, validation and value-commit/assertion
surfaces, readiness, and blocking unknowns.

```ts
interface GetE2eSliceInput {
  readonly contextRef: ContractContextRef;
  readonly withinStepId: string;
  readonly nodeIds: readonly string[];
  readonly goal: 'positive' | 'negative' | 'boundary';
  readonly includeOutgoingEffects?: boolean;
}

type GetE2eSliceResult =
  | {
      readonly schemaVersion: '0.1.0';
      readonly status: 'complete';
      readonly contextRef: ContractContextRef;
      readonly entry: UsageEntryProjection;
      readonly step: UsageStepProjection;
      readonly nodes: readonly E2eNodeProjection[];
      readonly prerequisites: readonly E2ePrerequisite[];
      readonly effects: readonly DeclaredEffectProjection[];
      readonly effectAnalysis: 'complete' | 'incomplete' | 'absent';
      readonly blockers: AtomicCollectionProjection<
        'blockers',
        DiagnosticSummary
      >;
    }
  | {
      readonly schemaVersion: '0.1.0';
      readonly status: 'refused';
      readonly contextRef: ContractContextRef;
      readonly diagnostics: readonly [
        Extract<
          AgentContextQueryDiagnostic,
          {
            readonly code:
              | 'STEP_SCOPE_MISMATCH'
              | 'ATOMIC_VIEW_TOO_LARGE'
              | 'ATOMIC_RECORD_TOO_LARGE';
          }
        >,
        ...Extract<
          AgentContextQueryDiagnostic,
          {
            readonly code:
              | 'STEP_SCOPE_MISMATCH'
              | 'ATOMIC_VIEW_TOO_LARGE'
              | 'ATOMIC_RECORD_TOO_LARGE';
          }
        >[],
      ];
    };
```

**Inference — single-step and atomicity rule:** `withinStepId` is mandatory and
every focused `nodeId` must belong to that exact step. A cross-step request
returns `STEP_SCOPE_MISMATCH`; the server never chooses a step from array order.
The prerequisite/effect closure is atomic because truncating it could omit an
execution-safety edge. A server cap therefore returns `ATOMIC_VIEW_TOO_LARGE`
with no partial slice; an individually oversized node/prerequisite/effect
record instead returns `ATOMIC_RECORD_TOO_LARGE`. A later multi-step tool would
need an ordered `steps`
array and explicit node membership; it is not part of the minimum journey.

### 5. `validate_test_intent` and `compile_test_intent`

**Inference — purpose:** Validation is pure/read-only and returns either a
fully resolved execution plan or structured blockers. Compilation is stateless:
the caller resubmits the validated plan, its hash, and the exact same context
reference. The compiler canonicalizes the submitted plan, recomputes its hash,
and rejects any hash or context mismatch before resolving trusted drivers. It
never accepts raw selectors, arbitrary driver imports, or expressions.

```ts
interface ValidateTestIntentInput {
  readonly intent: TestIntent;
}

type ApprovedItemContext =
  | {
      readonly kind: 'existing-index';
      readonly repeaterNodeId: string;
      readonly index: number;
    }
  | {
      readonly kind: 'created-item';
      readonly repeaterNodeId: string;
      readonly itemContextId: string;
      readonly establishedByPlanStepId: string;
    };

interface ApprovedNodeBinding {
  readonly nodeId: string;
  readonly profile: { readonly id: string; readonly version: number };
  readonly driver: {
    readonly kind: 'generic' | 'application';
    readonly id: string;
    readonly version: number;
  };
  readonly operations: readonly [E2eCapability, ...E2eCapability[]];
  readonly targets: readonly [
    {
      readonly purpose:
        | 'control'
        | 'trigger'
        | 'popup'
        | 'option'
        | 'row'
        | 'selection'
        | 'add'
        | 'item'
        | 'expand'
        | 'wrapper';
      readonly partRef: string;
      readonly locatorTargetRef: string;
    },
    ...{
      readonly purpose:
        | 'control'
        | 'trigger'
        | 'popup'
        | 'option'
        | 'row'
        | 'selection'
        | 'add'
        | 'item'
        | 'expand'
        | 'wrapper';
      readonly partRef: string;
      readonly locatorTargetRef: string;
    }[],
  ];
  readonly itemContext?: ApprovedItemContext;
}

type ResolvedPlanValue =
  | { readonly kind: 'canonical'; readonly value: JsonValue }
  | {
      readonly kind: 'runtime-policy';
      readonly policy: 'first-enabled';
      readonly runtimeEnumerationId: string;
      readonly readinessId: string;
      readonly codecRef: string;
    }
  | {
      readonly kind: 'constraint-violation';
      readonly constraintId: string;
      readonly capabilityRef: string;
    };

type ValidatedPlanStepOrigin =
  | {
      readonly kind: 'intent';
      readonly intentStepIndexes: readonly [number, ...number[]];
    }
  | {
      readonly kind: 'declared-expansion';
      readonly parentIntentStepIndexes: readonly [number, ...number[]];
      readonly prerequisiteRef: string;
    };

interface ValidatedPlanStepBase {
  readonly planStepId: string;
  readonly origin: ValidatedPlanStepOrigin;
  readonly evidenceRefs: readonly string[];
}

type ApprovedCommitResolution =
  | {
      readonly kind: 'included-in-set';
      readonly commitId: string;
      readonly mode: 'immediate' | 'blur';
      readonly physicalOperationId: string;
    }
  | {
      readonly kind: 'node-operation';
      readonly commitId: string;
      readonly mode: 'immediate' | 'blur';
      readonly physicalOperationId: string;
      readonly planStepId: string;
    }
  | {
      readonly kind: 'usage-action';
      readonly commitId: string;
      readonly actionId: string;
      readonly physicalOperationId: string;
      readonly planStepId: string;
    };

type ApprovedNodeOperationAuthority =
  | { readonly kind: 'value-commit'; readonly commitId: string }
  | {
      readonly kind: 'validation-activation';
      readonly validationId: string;
      readonly activationId: string;
    };

type ValidatedExecutionStep = ValidatedPlanStepBase &
  (
    | {
        readonly op: 'open-usage';
        readonly entryId: string;
        readonly driver: UsageDriverProjection;
      }
    | {
        readonly op: 'activate-wrapper';
        readonly binding: ApprovedNodeBinding;
        readonly physicalOperationId: string;
        readonly partRef: string;
        readonly locatorTargetRef: string;
        readonly mechanic: 'click' | 'check';
      }
    | {
        readonly op: 'wait-readiness';
        readonly binding: ApprovedNodeBinding;
        readonly readinessId: string;
      }
    | {
        readonly op: 'set-value';
        readonly binding: ApprovedNodeBinding;
        readonly physicalOperationId: string;
        readonly value: ResolvedPlanValue;
        readonly commit: ApprovedCommitResolution;
        readonly validationActivations: readonly {
          readonly validationId: string;
          readonly activationId: string;
        }[];
      }
    | {
        readonly op: 'perform-node-operation';
        readonly binding: ApprovedNodeBinding;
        readonly physicalOperationId: string;
        readonly mechanic: 'blur' | 'click' | 'check';
        readonly partRef: string;
        readonly locatorTargetRef: string;
        readonly authorities: readonly [
          ApprovedNodeOperationAuthority,
          ...ApprovedNodeOperationAuthority[],
        ];
      }
    | {
        readonly op: 'add-item';
        readonly binding: Omit<ApprovedNodeBinding, 'itemContext'> & {
          readonly itemContext?: never;
        };
        readonly physicalOperationId: string;
        readonly addTarget: {
          readonly partRef: string;
          readonly locatorTargetRef: string;
        };
        readonly establishesItemContext: {
          readonly kind: 'created-item';
          readonly itemContextId: string;
          readonly repeaterNodeId: string;
          readonly establishedByPlanStepId: string;
          readonly itemTarget: {
            readonly partRef: string;
            readonly locatorTargetRef: string;
          };
        };
      }
    | {
        readonly op: 'expand-item';
        readonly binding: ApprovedNodeBinding & {
          readonly itemContext: ApprovedItemContext;
        };
        readonly physicalOperationId: string;
        readonly itemTarget: {
          readonly partRef: string;
          readonly locatorTargetRef: string;
        };
        readonly expandTarget: {
          readonly partRef: string;
          readonly locatorTargetRef: string;
        };
      }
    | {
        readonly op: 'expect-state';
        readonly binding: ApprovedNodeBinding;
        readonly state:
          | 'visible'
          | 'hidden'
          | 'enabled'
          | 'disabled'
          | 'valid'
          | 'invalid';
        readonly assertionTargetRef: string;
      }
    | {
        readonly op: 'expect-value';
        readonly binding: ApprovedNodeBinding;
        readonly assertionId: string;
        readonly value: ResolvedPlanValue;
      }
    | {
        readonly op: 'invoke-usage-action';
        readonly actionId: string;
        readonly driver: UsageDriverProjection;
        readonly physicalOperationId: string;
        readonly commitIds: readonly string[];
        readonly validationActivations: readonly {
          readonly nodeId: string;
          readonly validationId: string;
        }[];
        readonly expectedOutcomeIds: readonly string[];
      }
    | {
        readonly op: 'expect-validation';
        readonly binding: ApprovedNodeBinding;
        readonly validationId: string;
        readonly state: 'present' | 'absent';
        readonly assertionTargetRef: string;
      }
    | {
        readonly op: 'expect-outcome';
        readonly outcomeId: string;
        readonly driver: UsageDriverProjection;
        readonly assertionTargetRef: string;
      }
  );

interface ValidatedExecutionPlan {
  readonly schemaVersion: '0.1.0';
  readonly contextRef: ContractContextRef;
  readonly caseId: string;
  readonly steps: readonly ValidatedExecutionStep[];
}

type ValidateTestIntentResult =
  | {
      readonly schemaVersion: '0.1.0';
      readonly status: 'valid';
      readonly contextRef: ContractContextRef;
      readonly planHash: `sha256:${string}`;
      readonly plan: ValidatedExecutionPlan;
      readonly warnings: readonly IntentWarning[];
    }
  | {
      readonly schemaVersion: '0.1.0';
      readonly status: 'invalid';
      readonly contextRef: ContractContextRef;
      readonly diagnostics: readonly [
        IntentBlockingDiagnostic,
        ...IntentBlockingDiagnostic[],
      ];
      readonly warnings: readonly IntentWarning[];
    };

interface CompileTestIntentInput {
  readonly contextRef: ContractContextRef;
  readonly plan: ValidatedExecutionPlan;
  readonly planHash: `sha256:${string}`;
  readonly output: 'driver-calls' | 'playwright-test';
}

interface CompiledDriverCall {
  readonly planStepId: string;
  readonly driver: {
    readonly scope: 'usage' | 'node';
    readonly kind: 'generic' | 'application';
    readonly id: string;
    readonly version: number;
  };
  readonly operations: readonly [E2eCapability, ...E2eCapability[]];
  readonly approvedStep: ValidatedExecutionStep;
}

type CompileTestIntentResult =
  | {
      readonly schemaVersion: '0.1.0';
      readonly status: 'compiled';
      readonly contextRef: ContractContextRef;
      readonly planHash: `sha256:${string}`;
      readonly artifact:
        | {
            readonly kind: 'driver-calls';
            readonly calls: readonly CompiledDriverCall[];
          }
        | { readonly kind: 'playwright-test'; readonly source: string };
      readonly warnings: readonly IntentWarning[];
    }
  | {
      readonly schemaVersion: '0.1.0';
      readonly status: 'rejected';
      readonly contextRef: ContractContextRef;
      readonly planHash: `sha256:${string}`;
      readonly diagnostics: readonly [
        IntentBlockingDiagnostic,
        ...IntentBlockingDiagnostic[],
      ];
      readonly warnings: readonly IntentWarning[];
    };
```

**Inference:** A server-side plan handle is a credible later optimization, but
it would add storage, expiry, authorization, and replay semantics that the
smallest flow does not need. Resubmission keeps the boundary explicit and
reversible. `compile_test_intent` should be idempotent for the same canonical
plan, context, and tool version. `planHash` covers the canonical serialized
`ValidatedExecutionPlan`, including its embedded `contextRef`; compilation
requires the separately submitted `contextRef` to equal the embedded one. In
the first slice it should return driver calls for review, not write files.

**Inference:** The validator, not the compiler, chooses every binding, target,
canonical value/policy resolution, usage action, outcome, validation surface,
wrapper expansion, and readiness step serialized above. Compilation may look
up the referenced implementation in the hash-pinned trusted registries, but it
may not select a different semantic reference or add an unplanned operation.
The driver-call review output pairs the selected trusted driver with the exact
closed `ValidatedExecutionStep`; it has no secondary free-form argument bag
that could reintroduce selectors, code, or unvalidated driver options.

**Inference — losslessness invariants:** Runtime schemas and validator tests
must additionally prove all of the following before returning `status: valid`:

- every `set-value.commit` selects exactly one declared commit record;
  `included-in-set` names that set's `physicalOperationId`, while node-event and
  usage-action commits point to an existing later `planStepId` with the same
  physical operation and commit ID;
- every `perform-node-operation.authorities` entry is independently approved,
  unique, and compatible with the serialized mechanic/part/target. When one
  blur satisfies both commit and validation activation, the validator merges
  the adjacent intent authorities into one plan step whose `origin` names both
  intent indexes; the compiler emits the physical blur exactly once;
- every node binding contains the exact selected capability set and a
  purpose-to-part-to-locator-target mapping. Multiple strings are never passed
  as unordered candidate lists from which the compiler may choose;
- every wrapper expansion serializes `click` versus `check`, its exact part and
  target, and its physical-operation identity; registry lookup may rehydrate
  only those selected IDs;
- every binding for a wildcard descendant carries an exact `itemContext` whose
  establishing plan step precedes the descendant operation. No descendant
  driver may receive a default index; and
- `add-item` has no input item context, serializes its exact add-control target,
  and establishes one plan-local `created-item` context through a driver
  capability that proves exactly one new item and returns its separately
  serialized scoped item target. `expand-item` is a separate variant and
  always carries an `existing-index` or `created-item` context plus exact
  item/expand targets; a many-cardinality expand part is never passed to the
  compiler unscoped; and
- every usage-action commit is bidirectionally linked: the set points to the
  action plan step and that action's `commitIds` contains the selected commit.
- every validation activation is assigned to exactly one serialized physical
  operation: the approving set, a node operation, or an explicit usage action.
  Usage-action activations name both node and validation ID on that action.

Hash-pinned lookup is compression, not decision-making: it may retrieve an
immutable record named by the plan, but it may not choose a commit, mechanic,
row, activation, action, or assertion record that the plan omitted.

## Progressive disclosure

| Level | Agent receives | Default exclusions | Promotion trigger | Evidence class |
| --- | --- | --- | --- | --- |
| 0 — candidates | Usage/form IDs, source/component/route/step summaries, match reasons, hashes, blocker counts | Node trees, values, labels beyond matched snippets | Agent selects a candidate or asks the user to disambiguate | Inference |
| 1 — summary | Selected usage journey outline, step node counts, capabilities, scenario list, diagnostics/effect status | Full nodes and option values | Agent names goal and target field(s) | Inference |
| 2 — E2E slice | Focus nodes plus one-hop prerequisites/effects, value/constraint/interaction/validation data, blockers | Unrelated sections, full registries, raw source | Agent drafts typed intent | Inference |
| 3 — explanation | One node/effect/diagnostic with provenance and safe source references | Callback source, model values, secrets, arbitrary DOM | Validator failure or explicit explanation request | Inference |
| 4 — full artifact | Immutable contract resource | Nothing except prohibited sensitive/executable material | Explicit expert/debug request with size pagination | Documented fact from the architecture's large-form boundary |

**Documented fact:** MCP pagination uses opaque cursors: a response includes an
optional `nextCursor`, and a client continues by sending that cursor in the
next request. MCP tools may also declare output schemas; when present, servers
must conform and clients should validate the structured result.

**Inference:** Every response needs bounded arrays, deterministic ordering, and
the same `contextRef`, but not every response is safely pageable. Search,
summary steps, diagnostics, and node lists use the discriminated cursor shape.
Journey and E2E-slice closures are atomic: they return complete or refuse with
`ATOMIC_VIEW_TOO_LARGE`, never truncate. Cursors are opaque, integrity-protected,
expire within a bounded interval, and bind the context hash, normalized query,
sort order, and privacy scope so they cannot continue a different request. A
model should not need the whole contract to add a two-field regression test.

**Inference — cursor ownership:** Every page serializes exactly one collection
name: `candidates`, `steps`, `diagnostics`, or `nodes`. Its matching request
property and `PageRequestProjection` repeat that same literal collection name.
All top-level secondary arrays in that result are
`AtomicCollectionProjection`s repeated completely on every page. Nested arrays
inside one primary record are part of that atomic record. Strict output schemas
cap every nested string/array and each primary record; if one candidate, node,
summary, diagnostic, or secondary atomic collection cannot fit, the tool
returns `ATOMIC_RECORD_TOO_LARGE` and no partial primary record. Cursor tests
must concatenate only the named collection, verify stable repeated atomic
metadata, and reject a cursor under a different collection/query/context.

## Minimal typed test intent

```ts
interface TestIntent {
  readonly schemaVersion: '0.1.0';
  readonly contextRef: ContractContextRef;
  readonly case: {
    readonly id: string;
    readonly title: string;
    readonly polarity: 'positive' | 'negative';
  };
  readonly steps: readonly TestIntentStep[];
}

type IntentValue =
  | { readonly kind: 'domain-value'; readonly value: JsonValue }
  | { readonly kind: 'candidate'; readonly id: string }
  | {
      readonly kind: 'runtime-policy';
      readonly policy: 'first-enabled';
    }
  | {
      readonly kind: 'constraint-violation';
      readonly constraint: 'required' | 'min' | 'max' | 'pattern' | string;
    }
  | {
      readonly kind: 'literal';
      readonly value: JsonValue;
      readonly expectedClassification: 'valid' | 'invalid';
    };

type IntentItemContext =
  | {
      readonly kind: 'index';
      readonly repeaterNodeId: string;
      readonly index: number;
    }
  | {
      readonly kind: 'created-item';
      readonly repeaterNodeId: string;
      readonly capture: string;
    };

interface TestIntentNodeTarget {
  readonly nodeId: string;
  readonly itemContext?: IntentItemContext;
}

type TestIntentStep =
  | { readonly op: 'openUsage' }
  | (TestIntentNodeTarget & {
      readonly op: 'set';
      readonly value: IntentValue;
    })
  | {
      readonly op: 'addItem';
      readonly nodeId: string;
      readonly captureAs: string;
    }
  | {
      readonly op: 'expandItem';
      readonly nodeId: string;
      readonly itemContext: IntentItemContext;
    }
  | (TestIntentNodeTarget & {
      readonly op: 'expectState';
      readonly state:
        | 'visible'
        | 'hidden'
        | 'enabled'
        | 'disabled'
        | 'valid'
        | 'invalid';
    })
  | (TestIntentNodeTarget & {
      readonly op: 'expectValue';
      readonly assertionId: string;
      readonly value: IntentValue;
    })
  | (TestIntentNodeTarget & {
      readonly op: 'commitValue';
      readonly commitId: string;
    })
  | {
      readonly op: 'invokeUsageAction';
      readonly actionId: string;
    }
  | (TestIntentNodeTarget & {
      readonly op: 'activateValidation';
      readonly validationId: string;
    })
  | (TestIntentNodeTarget & {
      readonly op: 'expectValidation';
      readonly validationId: string;
      readonly constraint: string;
      readonly state: 'present' | 'absent';
    })
  | {
      readonly op: 'expectOutcome';
      readonly outcomeId: string;
    };
```

### Value authority

**Inference:** `domain-value` is executable only when the canonical JSON value
is present in the selected complete or scenario domain. `candidate` resolves
to an application-declared synthetic value. `runtime-policy` is allowed only
when the profile/driver declares runtime enumeration, readiness, stable order,
and a value codec; it is unsuitable when the assertion depends on a particular
business value. `constraint-violation` delegates negative-value construction
to a reviewed validator/driver capability.

**Inference:** A `literal` is a proposal, not authority. Validation may approve
it only when all relevant constraints can decisively classify it and no opaque
validator/parser/codec could change that classification. Otherwise it returns
`VALUE_CLASSIFICATION_UNKNOWN`. Defaults and current model samples never
authorize a value domain.

### Ordering, readiness, wrappers, hidden fields, and repeaters

**Inference:** Cross-field ordering is not silently repaired. If an effect says
source-before-target and intent sets the target first, validation returns
`ORDERING_PRECONDITION_MISSING` with a machine-readable required source node.
After the source step, the validator may expand only the declared readiness
capability into the plan; the compiler executes that serialized step and may
not add a fixed sleep.

**Inference:** Wrapper activation preconditions are mechanical and may be
expanded only by validation after mechanic/part/locator-target approval; the
compiler consumes the serialized expansion. Hidden fields require an explicit
reachable trigger path and an `expectState` before interaction. Repeater
descendants require a serialized item context plus explicit `addItem` or
`expandItem` when the profile says activation is needed. An array wildcard is
never converted to row zero by convention.

**Inference:** `addItem.captureAs` is a plan-local alias, not a DOM locator. The
validator resolves it to an `itemContextId`; the approved add driver must prove
that the operation creates exactly one item and return that item under the
exact serialized item target, separately from the add-control target. Capture
aliases are unique within a case and a created-item reference must point to an
earlier add step. If the driver cannot establish exactly one item, validation returns
`REPEATER_ITEM_CAPTURE_UNSUPPORTED`. `expandItem` always names either an exact
existing index or a prior capture, and validation serializes item-scoped item
and expand targets. Missing context is rejected before plan creation.

**Inference:** Validation assertions do not authorize activation. A declared,
node-local activation such as blur requires an explicit `activateValidation`
step and may not navigate, submit, persist data, or invoke a usage action.
`next`, `submit`, and every other journey-changing action require an explicit
`invokeUsageAction` step naming an allowlisted `actionId`; the compiler never
inserts one to make a later assertion pass.

**Inference:** Value commit is a third, separate authority. A profile may
declare that `set` includes an immediate/node-local commit, or it may require
an explicit `commitValue` naming a declared node-local commit ID such as blur.
A usage-action commit (for example Angular `updateOn: 'submit'`) cannot compile
from `commitValue`; it requires `invokeUsageAction`. The validator rejects a
duplicate explicit commit when `set` already owns it, preventing accidental
double blur or duplicate side effects.

**Inference:** Separate authority does not require duplicate browser events.
When the selected commit and validation activation records require the same
node, mechanic, part, and target, validation may coalesce the adjacent intent
steps into one `perform-node-operation` carrying both authority records and
both intent origins. If those physical facts differ or are unknown, validation
keeps separate operations or refuses; the compiler never discovers or merges
them on its own.

## Diagnostic model and failure UX

```ts
interface IntentDiagnosticBase {
  readonly schemaVersion: '0.1.0';
  readonly message: string; // rendered from the code-owned stable template
  readonly evidenceRefs: readonly string[];
  readonly sourceDiagnostics: readonly ContractDiagnosticEvidenceProjection[];
}

interface SearchDiagnosticLocation {
  readonly kind: 'search';
  readonly queryRef: string;
}

interface ContextDiagnosticLocation {
  readonly kind: 'context';
  readonly usageId: string;
  readonly view?: 'summary' | 'diagnostics' | 'journey' | 'e2e-slice';
}

interface IntentStepDiagnosticLocation {
  readonly kind: 'intent-step';
  readonly stepIndex: number;
  readonly usageId: string;
}

interface PlanDiagnosticLocation {
  readonly kind: 'plan';
  readonly planStepId?: string;
}

interface RuntimeDiagnosticLocation {
  readonly kind: 'runtime';
  readonly planStepId: string;
  readonly nodeId?: string;
}

interface IntentDiagnosticPolicyByCode {
  readonly AMBIGUOUS_FORM_USAGE: {
    readonly phase: 'discovery'; readonly severity: 'error'; readonly blocking: true;
    readonly at: SearchDiagnosticLocation;
    readonly remediation: readonly [{ readonly kind: 'choose-candidate'; readonly usageIds: readonly string[] }];
  };
  readonly AMBIGUOUS_NODE: {
    readonly phase: 'context'; readonly severity: 'error'; readonly blocking: true;
    readonly at: ContextDiagnosticLocation & { readonly queryRef: string };
    readonly remediation: readonly [{ readonly kind: 'choose-node'; readonly nodeIds: readonly string[] }];
  };
  readonly FORM_USAGE_NOT_FOUND: {
    readonly phase: 'context'; readonly severity: 'error'; readonly blocking: true;
    readonly at: ContextDiagnosticLocation;
    readonly remediation: readonly [{ readonly kind: 'register-usage'; readonly usageId: string }];
  };
  readonly NODE_NOT_FOUND: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'choose-node'; readonly nodeIds: readonly string[] }];
  };
  readonly STALE_CONTEXT: {
    readonly phase: 'context'; readonly severity: 'error'; readonly blocking: true;
    readonly at: ContextDiagnosticLocation;
    readonly remediation: readonly [{ readonly kind: 'regenerate-artifacts' }];
  };
  readonly CONTEXT_MISMATCH: {
    readonly phase: 'compile'; readonly severity: 'error'; readonly blocking: true;
    readonly at: PlanDiagnosticLocation;
    readonly remediation: readonly [{ readonly kind: 'revalidate-intent' }];
  };
  readonly PLAN_HASH_MISMATCH: {
    readonly phase: 'compile'; readonly severity: 'error'; readonly blocking: true;
    readonly at: PlanDiagnosticLocation;
    readonly remediation: readonly [{ readonly kind: 'revalidate-intent' }];
  };
  readonly USAGE_ENTRY_UNSUPPORTED: {
    readonly phase: 'context'; readonly severity: 'error'; readonly blocking: true;
    readonly at: ContextDiagnosticLocation & { readonly entryId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-entry-driver'; readonly entryId: string }];
  };
  readonly USAGE_ACTION_NOT_FOUND: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly actionId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-action'; readonly actionId: string }];
  };
  readonly USAGE_ACTION_UNSUPPORTED: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly actionId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-action-driver'; readonly actionId: string }];
  };
  readonly OUTCOME_NOT_FOUND: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly outcomeId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-outcome'; readonly outcomeId: string }];
  };
  readonly OUTCOME_ASSERTION_UNSUPPORTED: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly outcomeId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-outcome-assertion'; readonly outcomeId: string }];
  };
  readonly VALIDATION_NOT_FOUND: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly validationId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-validation'; readonly validationId: string }];
  };
  readonly VALIDATION_ACTIVATION_UNSUPPORTED: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly validationId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-validation-activation'; readonly validationId: string }];
  };
  readonly VALIDATION_ASSERTION_UNSUPPORTED: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly validationId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-validation-assertion'; readonly validationId: string }];
  };
  readonly COMMIT_NOT_FOUND: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly commitId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-commit'; readonly commitId: string }];
  };
  readonly COMMIT_UNSUPPORTED: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly commitId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-commit-driver'; readonly commitId: string }];
  };
  readonly COMMIT_AUTHORITY_AMBIGUOUS: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'choose-commit'; readonly commitIds: readonly string[] }];
  };
  readonly VALUE_ASSERTION_NOT_FOUND: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly assertionId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-value-assertion'; readonly assertionId: string }];
  };
  readonly VALUE_ASSERTION_UNSUPPORTED: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly assertionId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-value-assertion-driver'; readonly assertionId: string }];
  };
  readonly SCENARIO_REQUIRED: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'choose-scenario'; readonly scenarioIds: readonly string[] }];
  };
  readonly VALUE_OUT_OF_DOMAIN: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'choose-domain-value'; readonly candidateIds: readonly string[] }];
  };
  readonly VALUE_CLASSIFICATION_UNKNOWN: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'inspect-source'; readonly sourceRefs: readonly string[] }];
  };
  readonly UNSUPPORTED_INTERACTION: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-profile'; readonly formlyType: string }];
  };
  readonly MISSING_LOCATOR_TARGET: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-locator-target'; readonly target: string }];
  };
  readonly LOCATOR_PARITY_MISMATCH: {
    readonly phase: 'runtime'; readonly severity: 'error'; readonly blocking: true;
    readonly at: RuntimeDiagnosticLocation;
    readonly remediation: readonly [{ readonly kind: 'inspect-source'; readonly sourceRefs: readonly string[] }];
  };
  readonly ORDERING_PRECONDITION_MISSING: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'set-before'; readonly nodeId: string }];
  };
  readonly READINESS_UNAVAILABLE: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-readiness'; readonly readinessId: string }];
  };
  readonly HIDDEN_NODE_UNREACHABLE: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'inspect-source'; readonly sourceRefs: readonly string[] }];
  };
  readonly REPEATER_CONTEXT_REQUIRED: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'choose-item-context'; readonly repeaterNodeId: string }];
  };
  readonly REPEATER_ITEM_CAPTURE_UNSUPPORTED: {
    readonly phase: 'validation'; readonly severity: 'error'; readonly blocking: true;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'declare-repeater-capture'; readonly repeaterNodeId: string }];
  };
  readonly EFFECT_COVERAGE_INCOMPLETE: {
    readonly phase: 'validation'; readonly severity: 'warning'; readonly blocking: false;
    readonly at: IntentStepDiagnosticLocation & { readonly nodeId: string };
    readonly remediation: readonly [{ readonly kind: 'inspect-source'; readonly sourceRefs: readonly string[] }];
  };
  readonly STEP_SCOPE_MISMATCH: {
    readonly phase: 'context'; readonly severity: 'error'; readonly blocking: true;
    readonly at: ContextDiagnosticLocation & { readonly requestedStepId: string };
    readonly remediation: readonly [{ readonly kind: 'choose-step'; readonly stepIds: readonly string[] }];
  };
  readonly ATOMIC_VIEW_TOO_LARGE: {
    readonly phase: 'context'; readonly severity: 'error'; readonly blocking: true;
    readonly at: ContextDiagnosticLocation;
    readonly remediation: readonly [{ readonly kind: 'narrow-slice'; readonly maximumItems: number }];
  };
  readonly ATOMIC_RECORD_TOO_LARGE: {
    readonly phase: 'context'; readonly severity: 'error'; readonly blocking: true;
    readonly at: ContextDiagnosticLocation & { readonly recordKind: string; readonly recordId: string };
    readonly remediation: readonly [{ readonly kind: 'narrow-projection'; readonly maximumBytes: number }];
  };
  readonly CONTRACT_CONTEXT_INVALID: {
    readonly phase: 'context'; readonly severity: 'error'; readonly blocking: true;
    readonly at: ContextDiagnosticLocation & { readonly aspect: string };
    readonly remediation: readonly [{ readonly kind: 'regenerate-artifacts' }];
  };
  readonly RUNTIME_PARITY_MISMATCH: {
    readonly phase: 'runtime'; readonly severity: 'error'; readonly blocking: true;
    readonly at: RuntimeDiagnosticLocation;
    readonly remediation: readonly [{ readonly kind: 'inspect-source'; readonly sourceRefs: readonly string[] }];
  };
}

type IntentDiagnosticCode = keyof IntentDiagnosticPolicyByCode;

type IntentDiagnostic = IntentDiagnosticBase & {
  readonly [Code in IntentDiagnosticCode]: {
    readonly code: Code;
  } & IntentDiagnosticPolicyByCode[Code];
}[IntentDiagnosticCode];

type IntentWarning = Extract<
  IntentDiagnostic,
  { readonly severity: 'warning'; readonly blocking: false }
>;

type IntentBlockingDiagnostic = Extract<
  IntentDiagnostic,
  { readonly blocking: true }
>;
```

**Inference:** `keyof IntentDiagnosticPolicyByCode` is the closed vocabulary for
schema version `0.1.0`; the mapping above is normative and exhaustive, not an
illustrative subset. Each code structurally fixes phase, severity, blocking,
permitted location, and exactly one remediation shape. Producers supply only
the code-specific location/remediation data and privacy-safe evidence; they do
not choose a policy tuple. The implementation must materialize the same mapping
as an exhaustive runtime constant using `satisfies Record<IntentDiagnosticCode,
...>` and generate a strict discriminated runtime schema from it. A unit test
must compare runtime-policy keys to schema variants in both directions.

Adding a code is an additive schema-version change; changing any existing
code's phase, severity, blocking behavior, location, template, or remediation
shape requires a breaking version. Machine consumers must reject an unsupported
diagnostic schema version rather than treating arbitrary strings as executable
guidance. `USAGE_ENTRY_UNSUPPORTED` and `OUTCOME_ASSERTION_UNSUPPORTED` cover
existing records whose trusted drivers are absent; missing, unsupported, and
ambiguous commit/value-assertion cases have distinct codes rather than one
catch-all refusal.

**Inference — form-contract diagnostic boundary:** Raw
`ContractDiagnosticCodeProjection` values are not executable diagnostics in
MCP results. They appear only as source evidence counts or inside
`IntentDiagnosticBase.sourceDiagnostics`, where `sourceSeverity` preserves the
artifact's observed/configured severity without granting agent-facing phase,
blocking, or remediation semantics. Query `diagnostics` and every `blockers`
collection contain only `IntentDiagnostic` variants.

A schema-owned projection first classifies the affected agent operation/aspect,
then emits the corresponding fixed `IntentDiagnosticPolicyByCode` variant—for
example, an opaque value classifier becomes `VALUE_CLASSIFICATION_UNKNOWN`, an
incomplete effect becomes `EFFECT_COVERAGE_INCOMPLETE`, and an unmapped
interaction becomes `UNSUPPORTED_INTERACTION`—while attaching the raw contract
record as causal evidence. Raw identity or severity alone never selects that
variant. If a contract problem lacks the structured node/effect/usage unknown
needed for one of those operation-specific projections, the context is invalid
for agent execution and returns fixed `CONTRACT_CONTEXT_INVALID`; it never
forwards a generic form-contract severity/phase/blocking tuple. Runtime tests
must enumerate every `ContractDiagnosticCodeProjection`, prove it is
evidence-only, exercise every allowed structured operation/aspect-to-agent-code
mapping in both directions, and fail closed on a missing structured projection.

| Failure | Required diagnostic behavior | Example stable message | Evidence class |
| --- | --- | --- | --- |
| Multiple usage matches | Block and return match reasons, not a winner. | `AMBIGUOUS_FORM_USAGE: 2 usages match; choose an exact usageId.` | Inference |
| Exact semantic reference is absent/unsupported | Block according to the schema-owned semantic-reference policy above. | `NODE_NOT_FOUND: node ... is absent from the pinned context.` | Inference |
| Usage exists but entry cannot execute | Block before authoring an intent. | `USAGE_ENTRY_UNSUPPORTED: entry ... has no trusted open-usage driver.` | Inference |
| Outcome exists but cannot be asserted | Block the outcome assertion. | `OUTCOME_ASSERTION_UNSUPPORTED: outcome ... has no trusted assertion driver.` | Inference |
| Focus nodes cross the requested step | Refuse the whole slice; return exact step candidates. | `STEP_SCOPE_MISMATCH: all focus nodes must belong to step ...` | Inference |
| Atomic journey/slice exceeds its safe cap | Refuse without partial data and suggest a narrower focus. | `ATOMIC_VIEW_TOO_LARGE: requested closure exceeds ... items.` | Inference |
| One primary or secondary atomic record exceeds its cap | Refuse without partial data. | `ATOMIC_RECORD_TOO_LARGE: node ... exceeds the safe projection cap.` | Inference |
| Contract evidence has no structured agent-context projection | Refuse executable context and regenerate/fix the artifact projection. | `CONTRACT_CONTEXT_INVALID: aspect ... cannot be represented safely.` | Inference |
| Source/artifact drift | Block compile; search may still return stale candidates. | `STALE_CONTEXT: form contract was generated from a different input digest.` | Inference |
| Submitted context differs from validated plan | Block before driver resolution. | `CONTEXT_MISMATCH: compile context does not equal the plan's pinned context.` | Inference |
| Submitted plan does not reproduce its hash | Block before driver resolution. | `PLAN_HASH_MISMATCH: canonical submitted plan does not match planHash.` | Inference |
| Scenario absent for a dynamic node | Block concrete set. | `SCENARIO_REQUIRED: node ... has a dynamic domain and no resolved scenario artifact.` | Repository observation + inference |
| Value outside selected domain | Block before browser execution. | `VALUE_OUT_OF_DOMAIN: canonical value is absent from scenario ...` | Inference |
| Literal cannot be classified | Block; do not downgrade to warning. | `VALUE_CLASSIFICATION_UNKNOWN: opaque validator or codec prevents classification.` | Inference |
| Missing profile/driver | Block only the affected operation. | `UNSUPPORTED_INTERACTION: node ... has no executable interaction profile.` | Repository observation + inference |
| Missing custom part locator | Block compilation. | `MISSING_LOCATOR_TARGET: profile requires wrapper-expand but no scoped locator recipe exists.` | Repository observation + inference |
| Locator resolves zero/many at runtime | Fail with parity evidence; never use `.first()`/`.nth()` fallback. | `LOCATOR_PARITY_MISMATCH: expected exactly 1 target; observed 2.` | Documented fact + inference |
| Target used before source | Block and return the source node/effect. | `ORDERING_PRECONDITION_MISSING: set ...product before ...caseType.` | Repository observation + inference |
| Async target lacks readiness | Block; no sleep suggestion. | `READINESS_UNAVAILABLE: effect requires an undeclared or unsupported readiness capability.` | Inference |
| Hidden branch lacks witness | Block interaction, allow explicit source inspection. | `HIDDEN_NODE_UNREACHABLE: selected context does not prove a visible path.` | Inference |
| Repeater wildcard lacks row context | Block. | `REPEATER_CONTEXT_REQUIRED: choose/add an item before addressing wildcard descendant.` | Inference |
| Add driver cannot identify exactly one created item | Block capture and every dependent descendant/expand step. | `REPEATER_ITEM_CAPTURE_UNSUPPORTED: add-item cannot establish a deterministic item context.` | Inference |
| Value commit ID absent, driver unsupported, or authority ambiguous | Block post-set execution with the distinct fixed policy. | `COMMIT_NOT_FOUND`, `COMMIT_UNSUPPORTED`, or `COMMIT_AUTHORITY_AMBIGUOUS`. | Repository observation + inference |
| Committed-value assertion ID absent or driver unsupported | Block the assertion with the distinct fixed policy. | `VALUE_ASSERTION_NOT_FOUND` or `VALUE_ASSERTION_UNSUPPORTED`. | Inference |
| Validation record absent | Block activation/assertion. | `VALIDATION_NOT_FOUND: validation ID ... is absent from the pinned context.` | Repository observation + inference |
| Validation activation unsupported | Block activation. | `VALIDATION_ACTIVATION_UNSUPPORTED: validation ... has no supported node-local activation.` | Inference |
| Validation assertion target unsupported | Block assertion. | `VALIDATION_ASSERTION_UNSUPPORTED: required is known but its assertion surface is not executable.` | Repository observation + inference |
| Effect analysis incomplete | Permit explicitly declared path; warn against claims based on absent edges. | `EFFECT_COVERAGE_INCOMPLETE: do not infer independence or unreachability from missing effects.` | Documented fact |
| Browser differs from contract | Fail with redacted observed facts. | `RUNTIME_PARITY_MISMATCH: declared role/target/state did not match the visited page.` | Inference |

**Documented fact:** Playwright locators are strict for operations on one DOM
target; a multi-match throws, and Playwright advises a uniquely identifying
locator rather than `.first()`, `.last()`, or `.nth()` fallbacks. Playwright
also auto-waits for actionability such as uniqueness, visibility, stability,
event reception, enabled state, and editability, depending on the action.
Therefore runtime diagnostics should preserve strictness rather than defeat it.

## Walkthrough 1 — positive order-entry step-one test

### User request and current evidence

> A bug was reported on order entry step one; add a positive test.

**Repository observation:** The closest current fixture is
`operations.purchase-order` in
[`apps/formly-test-app/src/app/forms/operations/operations-forms.ts`](../../../apps/formly-test-app/src/app/forms/operations/operations-forms.ts).
It has an async/Observable supplier select, a static currency select, and a
custom currency-like total field with `min: 0` and
`modelOptions.updateOn: 'blur'`. The fixture application reaches forms through
a catalog in
[`apps/formly-test-app/src/app/app.component.ts`](../../../apps/formly-test-app/src/app/app.component.ts),
not a route/step journey contract.

**Repository observation — current stop:** This form is not in the committed
workspace golden index, no current usage metadata connects “order entry step
one” to its symbol or catalog entry, the supplier value source is async, and
the custom `currency` type has no production interaction profile in the
workspace artifact set. The current contract also does not project
`modelOptions.updateOn` into versioned value-commit metadata. Current artifacts
cannot compile this test reliably.

**Documented fact:** Angular documents `updateOn` as the event on which a form
control updates itself and explicitly states that `updateOn: 'blur'` updates on
blur. Playwright documents `locator.fill()` as focusing, filling, and emitting
an `input` event; it does not claim that `fill()` blurs the control.

**Inference:** A generic fill operation therefore cannot prove that this
fixture's Formly model and validation state committed. Commit behavior and a
post-commit assertion surface must be declared independently.

### Complete paper prerequisites

**Inference:** This walkthrough is valid only with the following global and
case-specific inputs; these are prerequisites, not optional enrichment:

- one compatible immutable context envelope containing the workspace, usage,
  form, scenario, and driver-registry identities and freshness digests;
- usage `test-app.catalog/operations.purchase-order@1`, joined to the source
  symbol and form ID, plus step `details@1` with member nodes `supplier`,
  `currency`, and `total`;
- an allowlisted catalog-entry driver keyed by the exact form ID;
- executable profiles and supported drivers for the supplier select, currency
  select, and custom currency field, including strict node-scoped locator
  targets and canonical value codecs;
- the complete static `currency` domain and a safe synthetic supplier scenario
  with “supplier options ready,” stable runtime enumeration, and privacy-safe
  candidate identity; and
- a reviewed scalar decimal codec and `fill` operation for `total`, plus a
  declared node-local commit record
  `operations.purchase-order.total.commit-on-blur` whose execution is
  `explicit-intent`;
- post-commit assertion records for the committed canonical value and the
  absence of the `min` validation state. A DOM input value alone is not the
  committed-value surface.

**Inference:** The supplier can use `first-enabled` because the positive test
does not assert supplier-specific business behavior. The total cannot use an
unclassified generated number if an opaque parser/validator exists; in this
fixture the known `min: 0` and reviewed decimal codec can classify `125` as
valid.

### Query storyboard

```json
{"query":"order entry step one","step":{"ordinal":1},"capabilities":["fill","commit-value","assert-value"]}
```

**Inference — expected candidate:** `search_form_usages` returns the one usage
with match evidence such as source symbol/title/step metadata, not its full
contract. The agent pins the returned context, requests the three nodes, then
asks for an E2E slice with the exact returned step ID, those node IDs, and goal
`positive`. If discovery cannot supply that step ID, the slice is not called.

### Typed intent

```json
{
  "schemaVersion": "0.1.0",
  "contextRef": {
    "workspaceIndexHash": "sha256:<index>",
    "buildId": "fixture-build-1",
    "usage": {"id": "test-app.catalog/operations.purchase-order", "version": 1},
    "form": {"id": "operations.purchase-order", "contractHash": "sha256:<declared>"},
    "scenario": {
      "id": "synthetic-suppliers-ready",
      "artifactHash": "sha256:<resolved>",
      "basisContractHash": "sha256:<declared>"
    },
    "driverRegistryHash": "sha256:<drivers>"
  },
  "case": {
    "id": "purchase-order-step-one-positive",
    "title": "accepts a valid order total",
    "polarity": "positive"
  },
  "steps": [
    {"op": "openUsage"},
    {
      "op": "set",
      "nodeId": "operations.purchase-order::path:s_supplier",
      "value": {"kind": "runtime-policy", "policy": "first-enabled"}
    },
    {
      "op": "set",
      "nodeId": "operations.purchase-order::path:s_currency",
      "value": {"kind": "domain-value", "value": "CAD"}
    },
    {
      "op": "set",
      "nodeId": "operations.purchase-order::path:s_total",
      "value": {"kind": "literal", "value": 125, "expectedClassification": "valid"}
    },
    {
      "op": "commitValue",
      "nodeId": "operations.purchase-order::path:s_total",
      "commitId": "operations.purchase-order.total.commit-on-blur"
    },
    {
      "op": "activateValidation",
      "nodeId": "operations.purchase-order::path:s_total",
      "validationId": "operations.purchase-order.total.min"
    },
    {
      "op": "expectValue",
      "nodeId": "operations.purchase-order::path:s_total",
      "assertionId": "operations.purchase-order.total.committed-value",
      "value": {"kind": "literal", "value": 125, "expectedClassification": "valid"}
    },
    {
      "op": "expectValidation",
      "nodeId": "operations.purchase-order::path:s_total",
      "validationId": "operations.purchase-order.total.min",
      "constraint": "min",
      "state": "absent"
    }
  ]
}
```

### Validation and compilation result

**Inference — valid only if all minimum inputs exist:** The validator confirms
the exact usage and scenario hashes, waits through the declared supplier
readiness capability, lets the driver select the first enabled runtime option,
validates `CAD` against its enumerated domain, classifies `125` through the
reviewed decimal codec plus `min: 0`, proves that the selected profile requires
the explicit node-local blur commit, and verifies post-commit value and
validation activation/assertion surfaces. Because the commit and validation
records select the same blur mechanic, part, and target, the validated plan
contains one `perform-node-operation` with both intent-step origins and both
authorities. The relevant lossless plan fragment is:

```json
[
  {
    "planStepId": "total.set",
    "origin": {"kind": "intent", "intentStepIndexes": [3]},
    "evidenceRefs": ["fixture:operations.purchase-order.total"],
    "op": "set-value",
    "physicalOperationId": "total.set.1",
    "binding": {
      "nodeId": "operations.purchase-order::path:s_total",
      "profile": {"id": "native.currency", "version": 1},
      "driver": {"kind": "application", "id": "test-app.currency", "version": 1},
      "operations": ["fill"],
      "targets": [
        {"purpose": "control", "partRef": "control", "locatorTargetRef": "total.control"}
      ]
    },
    "value": {"kind": "canonical", "value": 125},
    "commit": {
      "kind": "node-operation",
      "commitId": "operations.purchase-order.total.commit-on-blur",
      "mode": "blur",
      "physicalOperationId": "total.blur.1",
      "planStepId": "total.blur"
    },
    "validationActivations": []
  },
  {
    "planStepId": "total.blur",
    "origin": {"kind": "intent", "intentStepIndexes": [4, 5]},
    "evidenceRefs": ["fixture:operations.purchase-order.total.updateOn"],
    "op": "perform-node-operation",
    "binding": {
      "nodeId": "operations.purchase-order::path:s_total",
      "profile": {"id": "native.currency", "version": 1},
      "driver": {"kind": "application", "id": "test-app.currency", "version": 1},
      "operations": ["commit-value", "activate-validation"],
      "targets": [
        {"purpose": "control", "partRef": "control", "locatorTargetRef": "total.control"}
      ]
    },
    "physicalOperationId": "total.blur.1",
    "mechanic": "blur",
    "partRef": "control",
    "locatorTargetRef": "total.control",
    "authorities": [
      {"kind": "value-commit", "commitId": "operations.purchase-order.total.commit-on-blur"},
      {
        "kind": "validation-activation",
        "validationId": "operations.purchase-order.total.min",
        "activationId": "operations.purchase-order.total.min.on-blur"
      }
    ]
  }
]
```

Compilation emits that physical blur once, conceptually equivalent to:

```ts
await formDriver.openUsage(contextRef);
await formDriver.setRuntimeChoice(supplierNode, 'first-enabled');
await formDriver.set(currencyNode, 'CAD');
await formDriver.set(totalNode, 125);
await formDriver.performNodeOperation(
  totalNode,
  {
    physicalOperationId: 'total.blur.1',
    mechanic: 'blur',
    partRef: 'control',
    locatorTargetRef: 'total.control',
    authorities: [
      {
        kind: 'value-commit',
        commitId: 'operations.purchase-order.total.commit-on-blur',
      },
      {
        kind: 'validation-activation',
        validationId: 'operations.purchase-order.total.min',
        activationId: 'operations.purchase-order.total.min.on-blur',
      },
    ],
  },
);
await formDriver.expectValue(
  totalNode,
  'operations.purchase-order.total.committed-value',
  125,
);
await formDriver.expectValidation(
  totalNode,
  'operations.purchase-order.total.min',
  'absent',
);
```

**Inference:** No selector, option label, widget event sequence, or sleep comes
from the agent. If runtime option order is not declared stable, validation must
reject `first-enabled` and require a resolved exact domain value instead.
Generic `fill` does not imply blur: if commit metadata or the post-commit
assertion surface is absent, validation blocks rather than accepting a DOM-only
value assertion or a vacuously absent error. If the commit and activation
records do not prove the same physical blur, the validator must not coalesce
them; it serializes two approved operations or refuses the intent.

## Walkthrough 2 — negative conditional/custom-field test

### User request and current evidence

> On claim intake step one, selecting “Other” must reveal details; add a
> negative test for leaving those details empty.

**Repository observation:** The committed `claims.intake` artifact is
`sha256:690ac3bdc549efefb1c2cfbb1e72d7624fbce1d288ca0e158fd8d21dbd2e7d07`.
Its declared effects require product before case type and case type before the
visibility of other details. The source in
[`claim-details.fragment.ts`](../../../fixtures/angular-monorepo/libs/forms-kit/src/lib/fragments/claim-details.fragment.ts)
shows scenario-dependent case-type options and a function-driven conditional
field. The declared artifact honestly keeps both callbacks opaque.

**Repository observation:** `caseType` is the custom `dependent-select` type.
Although the project registry declares its trigger/listbox/option parts and a
readiness capability in
[`field-type-profiles.ts`](../../../fixtures/angular-monorepo/libs/forms-kit/src/lib/field-type-profiles.ts),
the declared golden has a dynamic function domain and no interaction profile.
The base source definition declares `new-claim`, but the workspace runner does
not generate a resolved scenario artifact.

**Repository observation:** The other-details node has a required constraint,
but no validation trigger or assertion target. The current artifact can explain
why this is a candidate regression test; it cannot execute it.

### Complete paper prerequisites

**Inference:** This walkthrough is valid only with the following global and
case-specific inputs; these are prerequisites, not optional enrichment:

- one compatible immutable context envelope containing the workspace, usage,
  form, scenario, and driver-registry identities and freshness digests;
- usage/component/step metadata for the claim-intake page and an allowlisted
  usage-entry driver;
- a trusted resolved scenario `auto-other` whose basis is the declared hash and
  whose `caseType` domain contains canonical value `"other"`;
- executable profiles and supported drivers for the native product control,
  custom `dependent-select`, and native other-details control, including value
  codecs and strict node/part-scoped locator targets;
- the two already declared sync ordering/effect edges and an explicit
  visibility outcome for the scenario/effect; and
- a validation record `otherDetails.required.on-blur` with a bounded,
  node-local blur activation and an observable error target/state for the
  other-details `required` rule.

**Inference:** The paper walkthrough deliberately chooses node-local blur. If
the application exposes the error only on `next` or `submit`, the usage
contract must instead declare that action and its expected blocked-navigation
outcome, and the intent must contain an explicit `invokeUsageAction`; the
compiler may not substitute it for `activateValidation`.

### Query storyboard

```json
{
  "formId": "claims.intake",
  "step": {"ordinal": 1},
  "scenarioId": "auto-other",
  "capabilities": [
    "select-from-overlay",
    "fill",
    "activate-validation",
    "assert-validation"
  ]
}
```

**Inference:** `get_e2e_slice` names the exact claim-intake step ID and focuses
`caseType` plus `otherDetails`; it must include the incoming
product-to-options effect even if the agent did not name product. It also
returns `effectAnalysis: incomplete` because of opaque rules. That warning does
not invalidate this explicitly declared path, but it forbids a claim that no
other effect can interfere.

### Typed intent

```json
{
  "schemaVersion": "0.1.0",
  "contextRef": {
    "workspaceIndexHash": "sha256:<index>",
    "buildId": "fixture-build-1",
    "usage": {"id": "test-app.page/claims.intake/step-one", "version": 1},
    "form": {
      "id": "claims.intake",
      "contractHash": "sha256:690ac3bdc549efefb1c2cfbb1e72d7624fbce1d288ca0e158fd8d21dbd2e7d07"
    },
    "scenario": {
      "id": "auto-other",
      "artifactHash": "sha256:<resolved-auto-other>",
      "basisContractHash": "sha256:690ac3bdc549efefb1c2cfbb1e72d7624fbce1d288ca0e158fd8d21dbd2e7d07"
    },
    "driverRegistryHash": "sha256:<drivers>"
  },
  "case": {
    "id": "claim-other-details-required",
    "title": "requires details when case type is Other",
    "polarity": "negative"
  },
  "steps": [
    {"op": "openUsage"},
    {
      "op": "set",
      "nodeId": "claims.intake::path:s_claimDetails.s_product",
      "value": {"kind": "domain-value", "value": "auto"}
    },
    {
      "op": "set",
      "nodeId": "claims.intake::path:s_claimDetails.s_caseType",
      "value": {"kind": "domain-value", "value": "other"}
    },
    {
      "op": "expectState",
      "nodeId": "claims.intake::path:s_claimDetails.s_otherDetails",
      "state": "visible"
    },
    {
      "op": "set",
      "nodeId": "claims.intake::path:s_claimDetails.s_otherDetails",
      "value": {"kind": "constraint-violation", "constraint": "required"}
    },
    {
      "op": "activateValidation",
      "nodeId": "claims.intake::path:s_claimDetails.s_otherDetails",
      "validationId": "otherDetails.required.on-blur"
    },
    {
      "op": "expectValidation",
      "nodeId": "claims.intake::path:s_claimDetails.s_otherDetails",
      "validationId": "otherDetails.required.on-blur",
      "constraint": "required",
      "state": "present"
    }
  ]
}
```

### Validation and compilation result

**Inference:** Validation proves product precedes case type, inserts no sleep
for the declared sync effect, checks `"other"` against the selected resolved
scenario domain, compiles the custom overlay operation through the pinned
profile/driver, waits for visible other-details through a web-first assertion,
clears/omits its value through the required-violation capability, verifies that
`otherDetails.required.on-blur` is node-local and non-navigating, and asserts
the declared error surface. Compilation emits trusted calls conceptually
equivalent to:

```ts
await formDriver.openUsage(contextRef);
await formDriver.set(productNode, 'auto');
await formDriver.set(caseTypeNode, 'other');
await formDriver.expectState(otherDetailsNode, 'visible');
await formDriver.setConstraintViolation(otherDetailsNode, 'required');
await formDriver.performNodeOperation(
  otherDetailsNode,
  {
    physicalOperationId: 'other-details.blur.1',
    mechanic: 'blur',
    partRef: 'control',
    locatorTargetRef: 'other-details.control',
    authorities: [
      {
        kind: 'validation-activation',
        validationId: 'otherDetails.required.on-blur',
        activationId: 'otherDetails.required.on-blur',
      },
    ],
  },
);
await formDriver.expectValidation(
  otherDetailsNode,
  'otherDetails.required.on-blur',
  'present',
);
```

**Inference:** `expectValidation` is assertion-only. Compilation cannot add a
blur, `next`, submit, or any other activation that is absent from the validated
plan. A journey-changing action compiles only from an explicit
`invokeUsageAction` and must carry its own declared outcome/preconditions.

**Inference — important refusal:** If the agent reverses product and case type,
validation returns `ORDERING_PRECONDITION_MISSING`. If it uses the current
declared artifact, validation returns `SCENARIO_REQUIRED` and
`UNSUPPORTED_INTERACTION`. If the validation surface is absent, it returns
`VALIDATION_ASSERTION_UNSUPPORTED`. None is recoverable by reading the dynamic
function body, selecting by visible text, or writing a CSS locator.

## RH-01–RH-04 metadata dependency audit

The work item describes capabilities other lanes may provide but does not
guarantee their success. This table states what this flow actually consumes.

| Proposed lane metadata | Required for this flow | Optional / useful later | Not useful as execution authority | Evidence class |
| --- | --- | --- | --- | --- |
| Stable form/source-lineage index | **Required:** form ID; project/source ID; form definition symbol/path/span; consuming page/component usage; stable usage ID; route/entry when present; ordered step ID/membership; source-input digest. | Owners, tags, full import graph, blame/history, human descriptions. | Raw AST dumps, arbitrary source snippets in every response, heuristic “looks like a form root” findings without registration authority. | Inference based on current missing join |
| Declared/resolved scenario artifacts | **Required for dynamic/conditional tests:** scenario ID/version; safe synthetic-input provenance; declared basis hash; resolved artifact hash; scenario diagnostics; resolved node state/domain/profile; effect/readiness outcome. | Automatically generated witnesses, large scenario matrices, human scenario prose. | Executable scenario callbacks in MCP, customer-derived inputs, a model sample treated as a domain, one scenario claimed globally complete. | Documented fact + repository observation |
| Custom field interaction profiles | **Required for every non-native/custom operation:** semantic/value shape; operation; named parts/cardinality/roles; codec/value projection; driver ID/version; wrapper preconditions; locator scope/targets; readiness; value-commit mode/ownership; blocking unknowns. | Angular component symbol/template evidence, authoring scaffolds, component-harness references, observed conformance history. | Inferring behavior from a Formly type name, assuming `fill` commits every control, serializing Angular component classes, agent-selected driver packages. | Documented fact + repository observation + inference |
| Static/dynamic/mixed values | **Required:** domain kind, canonical values when known, label mapping for choice drivers, evidence, completeness, disabled state, runtime-enumeration capability, privacy classification. | Boundary-value candidates, locale-specific display samples, generator explanations. | Defaults/current model as domain, raw remote option payloads, labels alone as model values. | Documented fact |
| Explicit/derived effects | **Required for dependent paths:** validated declared ordering, timing/readiness, endpoints/properties, condition reference, coverage completeness, unknowns. Derived/observed evidence may corroborate but not authorize. | Witness generation, change-impact graph, observed parity history. | Operational verbs inferred from callbacks, handler names, source proximity, one scenario delta, or missing edges under incomplete analysis. | Documented fact |
| Explicit unknowns | **Required:** machine-readable blocker scope and aspect on nodes, scenarios, effects, profiles, usage, validation, and freshness. | Aggregate coverage dashboards and ownership routing. | Free-form warnings with no stable code/evidence/remediation. | Inference |

**Inference — minimum versus nice-to-have:** Full source dependency graphs,
whole-contract dumps, automatic boundary generation, exhaustive scenario
witnesses, and browser observation history improve authoring and maintenance,
but neither walkthrough needs them. Both do need the small usage join,
hash-compatible resolved scenarios, executable field profiles, values/effects,
and validation/entry surfaces.

## Freshness, ambiguity, and runtime boundaries

### Freshness and staleness

**Repository observation:** Current contracts and the workspace index are
content-addressed, and `formly-contracts check` can compare expected artifacts
with generated output. The current index does not record a repository revision,
scenario artifact, usage lineage/input digest, or driver-registry identity.

**Inference — policy:** Queries may read stale artifacts but must label them.
Intent validation should fail closed unless freshness is `current`, or the
caller explicitly uses a review-only mode that cannot compile. For a dirty
working tree, a commit SHA alone is insufficient; generation must record a
canonical input digest covering the form definition, relevant fragments,
usage metadata, scenario definition, profile/effect registries, compiler, and
driver registry. If the MCP deployment cannot inspect the current checkout,
freshness is `unknown`, not `current`.

### Multiple forms/usages

**Inference:** One form may have multiple page usages, steps, roles, tenants, or
navigation paths. A route may contain multiple forms. Search therefore returns
usage candidates, not only form IDs. An exact form ID still requires a usage
for browser entry unless the caller requests contract-only analysis.

### Dynamic runtime values

**Inference:** Three distinct policies are needed:

1. Exact scenario value: deterministic and preferred when the behavior depends
   on the chosen value.
2. Runtime `first-enabled`: allowed only for irrelevant setup fields with a
   declared stable enumeration/readiness/codec capability.
3. Unknown dynamic value: blocks execution and directs the author to add a safe
   scenario/provider or application driver.

**Unknown:** The workplace proportion of dynamic fields that can safely expose
stable runtime enumeration without leaking sensitive option data is not
measured.

### Browser parity

**Documented fact:** Playwright's role locators follow ARIA role, attribute,
and accessible-name semantics. W3C WAI explains that interactive elements need
accessible names and that browsers compute names through defined precedence.
This makes roles/names valuable observed evidence, but not proof that a
declared custom profile still matches the rendered component.

**Inference:** Before each operation, the driver should resolve its declared
node-local target strictly and report zero/many matches as parity failures. It
may use Playwright actionability and web-first assertions for waiting, but those
features do not invent cross-field readiness or prove a hidden branch is
reachable.

## Security and privacy constraints

| Constraint | Required behavior | Evidence class |
| --- | --- | --- |
| No trusted-code execution in queries | MCP reads validated immutable artifacts; it never loads config, Angular, form factories, scenario callbacks, expressions, or driver modules from request data. | Documented fact |
| No agent selectors | Intent schemas contain semantic node/action IDs only. Locator strategies and driver bindings come from trusted, hash-pinned artifacts/registries. Reject unknown properties. | Inference |
| No agent package execution | Application drivers are installed and allowlisted by ID/version/hash at deployment. The agent cannot name a module path or package. | Inference |
| Treat presentation as untrusted data | Labels, help text, option labels, route titles, and source snippets are data fields with length/control-character limits; never interpolate them into tool instructions or diagnostic templates. | Documented fact + inference |
| Workspace path confinement | Normalize source paths; reject absolute paths, traversal, symlink escapes, unsupported URI schemes, and source locations outside the configured workspace. | Repository observation + inference |
| Synthetic values only | Do not emit customer values, secrets, credentials, unrestricted option payloads, callback source, or service errors. Values need provenance and sensitivity classification. | Documented fact |
| Runtime selection privacy | A runtime policy returns only success/selected candidate ID when permitted; logs and model context do not receive the full option collection by default. | Inference |
| Test artifact privacy | Screenshots, video, and traces can capture rendered values and network activity; retention/redaction must be configured per project, with failure artifacts treated as sensitive. | Documented fact + inference |
| Bounded read surface | Cap result size, node/value counts, recursive depth, and query complexity; paginate deterministically. | Inference |
| Hash and schema pinning | Validate schema versions and all referenced hashes before intent validation and again before compilation/runtime. | Inference |

**Documented fact:** Playwright can record screenshots, video, and traces as
test artifacts. Its Trace Viewer documentation says traces can contain action
screenshots, complete DOM snapshots, and network requests; request details can
include headers plus request and response bodies.

**Inference:** Those documented contents can expose rendered or transported
sensitive data. Projects should therefore define retention, access, and
redaction policy before enabling failure artifacts, rather than treating
traces as harmless diagnostics.

**Documented fact:** W3C WCAG 2.2 SC 3.3.1 requires an automatically detected
input error to identify the item and describe the error in text. Its
understanding document says programmatic information can complement that
description but is not required by SC 3.3.1. W3C technique ARIA21 demonstrates
one sufficient, non-mandatory pattern using `aria-invalid` and
`aria-describedby` to connect a field and message.

**Inference:** A negative-test contract should prefer an application-declared,
programmatically associated error state/description when the product provides
one, because it is more semantic than visual adjacency. It must also support a
different declared observable surface when that is the product's actual
accessible behavior; the contract cannot infer association from WCAG or
manufacture one in the browser.

## Alternatives compared consistently

| Option | Constraints satisfied | Main failure modes | Complexity/reversibility | Confidence | Evidence that would change the decision |
| --- | --- | --- | --- | ---: | --- |
| A. Source reading + ordinary Playwright inspection | Can solve one form with a live app; no new metadata system. | Agent chooses wrong usage, misses hidden branches, invents selectors/values/waits, depends on auth/data, repeats work, leaks runtime data. | Lowest initial cost; fully reversible. | 0.95 that it remains best for one-off simple forms. | Repeated first-run success across representative custom/dynamic forms with low review cost would weaken the case for contracts. |
| B. Contract query, then agent writes raw Playwright | Improves form/node/value discovery. | Still invents widget selectors, wrapper/overlay sequence, readiness, validation trigger, and page navigation. | Medium; easy to stop before public driver API. | 0.90 that it is insufficient for the stated reliability goal. | Evidence that existing app-owned page objects already provide complete semantic drivers could make this enough. |
| C. Live Playwright/ARIA inspection first | Uses current rendered truth and Playwright strictness/actionability. | Sees only visited state, may require real data/auth, cannot prove unvisited branches or model codecs, and may collect sensitive traces. | Medium operational cost; little artifact investment. | 0.82 that it is valuable as parity/audit, not authority. | A safe synthetic environment with exhaustive scenario navigation and stable app-owned page objects could raise it to primary. |
| D. Full proposed usage → query → typed intent → driver flow | Meets no-selector/no-guess goal, supports early diagnostics, reuse, freshness, and progressive context. | Metadata/driver authoring cost, drift, false sense of completeness, complex diagnostics, scenario explosion. | Highest cost, but reversible if delivered as slices with validator first. | 0.88 for technical feasibility; 0.72 for near-term net value. | A representative pilot showing low coverage, excessive manual usage metadata, or driver maintenance above ordinary tests should stop expansion. |
| E. Generate selectors/values from source or DOM heuristics | Appears automatic. | Confuses configuration/DOM with semantics, breaks on overlays/wrappers/repeaters/codecs, hides uncertainty. | Medium build cost; costly to unwind after generated tests spread. | 0.95 confidence in rejection. | Only a tightly bounded native-control subset with measured uniqueness/parity could be admitted as an explicit profile, not a general heuristic. |

**Inference — decision:** Choose D incrementally, keep A as the explicit
fallback for blocked/rare cases, and use C only as observed parity evidence.
Do not ship B as “safe agent generation,” because it preserves the most
failure-prone last mile.

### Contract-closure remediation decisions

| Finding | Credible options considered | Selected correction and constraint fit | Failure modes / reversibility | Confidence and evidence that would change it |
| --- | --- | --- | --- | --- |
| Lossy validated plan | Re-derive from pinned metadata; duplicate every record; serialize stable selections and rehydrate exact IDs. | Serialize commit linkage, physical-operation authority, wrapper mechanic, and item context; split add/capture from exact-item expand; allow lookup only by selected immutable ID. Preserves stateless compilation without copying locator recipes. | More plan bytes and referential-integrity checks; fully versionable and reversible before production schemas exist. | 0.94. A proof that every omitted choice is globally unique and immutable across registry versions could justify less serialization. |
| Non-exhaustive diagnostics | Generic envelope plus prose table; forward raw form diagnostics; schema-owned agent policy with raw diagnostics retained only as evidence. | Use the exhaustive agent policy map as the normative source for code, phase, severity, blocking, location, and remediation; raw contract codes never enter executable diagnostic collections. | Policy changes become versioned contract changes; aspect projection adds modest tooling. Reversible by versioning, not silent mutation. | 0.93. If structured node/effect unknowns cannot conservatively project a raw contract issue, keep the operation blocked rather than restoring a generic tuple. |
| Incomplete pagination | Page every nested array; silently cap; page one named safe list and atomically repeat/refuse all secondary data. | Each cursor names exactly one primary collection; journey/slice closures and secondary collections are complete, while an oversized record refuses. | Atomic refusal can block unusually large records/steps; the user must narrow focus. Reversible through a future separate multi-step/chunked closure protocol. | 0.90. Measured workplace records/closures regularly exceeding caps would justify a graph-continuation design with dependency proofs. |
| Ambiguous slice step | Infer from first node; return multiple steps; require exact step. | Require `withinStepId` and reject cross-step focus. It is the smallest truthful shape for the stated step-one request. | Cross-step tests need multiple slices or a later tool; no silent membership loss. Additive future extension is straightforward. | 0.96. Representative tests that inherently assert across several steps would justify an ordered multi-step result sooner. |

## UX failure modes

| User-visible problem | Likely cause | Good agent response | Bad fallback to prohibit | Evidence class |
| --- | --- | --- | --- | --- |
| “No form found” for a source file | Missing usage/source lineage | Show searched keys and nearby source/config references; suggest registration. | Scan arbitrary exports and pick one. | Inference |
| Several forms match “order entry” | Shared fragments, aliases, multiple steps/usages | Show concise candidates with route/component/step/match reasons; ask only if evidence cannot disambiguate. | Choose first result. | Inference |
| Contract exists but compile says stale | Checkout changed since generation | Offer exact regeneration/check command and preserve the drafted intent. | Compile against stale selectors. | Inference |
| Dynamic field has no value | Scenario not generated or runtime provider unsafe | Explain required scenario/provider/readiness capability. | Use first visible text or model default. | Repository observation + inference |
| Custom widget is structurally known but not operable | Missing/blocked profile, driver, codec, or part locator | Name the exact missing aspect and source owner. | Use type-name or DOM heuristics. | Documented fact |
| Filled value has not committed to the form model | Missing/ambiguous commit ownership or a blur/submit strategy | Require the declared commit/action and a post-commit assertion surface. | Treat DOM `toHaveValue` or an absent error as proof of acceptance. | Repository observation + inference |
| Conditional target remains hidden | Wrong scenario, missing trigger, or opaque behavior | Return prerequisite edge/witness when declared; otherwise mark unreachable unknown. | Force click/fill hidden control. | Inference |
| Test times out after source change | Locator/role/readiness parity drift | Report expected target and redacted observed count/state; point to source/profile. | Increase timeout or force action. | Documented fact + inference |
| Negative test cannot assert error | Constraint known but activation/surface missing | Offer source inspection and metadata addition; do not generate partial assertion. | Assert any nearby text or CSS class. | Repository observation + inference |
| Repeater child resolves ambiguously | Missing item identity/index/activation | Require explicit item context and add/expand step. | Assume row zero or call `.nth(0)`. | Inference |
| Large form overwhelms context | Whole artifact returned eagerly | Page independent summaries/nodes; narrow an atomic E2E slice or surface `ATOMIC_VIEW_TOO_LARGE`. | Truncate a journey or prerequisite closure. | Inference |

## Ordered implementation slices and stop/go gates

### Slice 0 — Artifact envelope and usage join

**Inference:** Add versioned usage records, route/component/source/step joins,
journey entry/action IDs, build/repository/input digests, scenario references,
and driver-registry identity to an index extension. Do not change the core node
schema unless a node-owned fact is required.

**Gate:** From a source path, component symbol, form ID, catalog/route, and step
query, a fixture returns the correct usage or an explicit ambiguity diagnostic.
If representative workplace forms cannot be joined without per-field manual
metadata, revisit the source-lineage design before proceeding.

### Slice 1 — Read-only progressive query surface

**Inference:** Implement `search_form_usages`, `get_form_context`,
`find_form_nodes`, and `get_e2e_slice` over immutable validated artifacts.
Enforce strict schemas, cursor pagination for independent lists, complete-or-
refuse caps for atomic closures, path confinement, untrusted presentation data,
and no trusted-code loading.

**Gate:** The two paper journeys can obtain all relevant nodes/prerequisites
without reading a full contract. Measure result size and ambiguity on at least
one large form. Validate every closed result variant, including summary,
diagnostics, journey, node-search pagination, and the complete E2E slice.
Property-test the `PageProjection` union so `truncated: true` always has a
cursor and `false` never does; replay every cursor only with its pinned query
and context. Verify complete continuation for each pageable view. For atomic
journey/slice views, exceed the cap and assert refusal with no partial payload.
For every pageable result, assert that request, page, and continuation name the
same single collection; concatenate only that collection and prove all
secondary `AtomicCollectionProjection`s repeat completely and identically.
Exceed each candidate/node/summary/diagnostic record cap and assert
`ATOMIC_RECORD_TOO_LARGE` with no partial record.
Request nodes from two steps and assert `STEP_SCOPE_MISMATCH`; a same-step
request must return the exact requested `withinStepId`.

### Slice 2 — Pure typed-intent schema and validator

**Inference:** Add intent DTO/runtime validation, value classification,
ordering/reachability checks, profile/driver/locator coverage, validation
surface checks, a versioned closed diagnostic vocabulary, and a canonical plan
plus hash. Expected-valid intents produce complete executable plans and
warnings; expected-invalid intents produce only blocking diagnostics and never
a plan. Return no Playwright code.

**Gate:** Separately assert that valid fixture intents produce canonical plans
whose hashes reproduce, while reversed ordering, stale hashes, missing
scenarios, unknown values, missing part locators, hidden/repeater ambiguity,
unknown usage/node/action/outcome/validation/commit/assertion references,
unsupported usage entry/action/outcome assertion/commit/value assertion,
ambiguous commit authority, and unsupported validation activation/assertion
produce no plan and fail with their exact discriminated policies. Assert that
the runtime diagnostic policy and schema have identical exhaustive code sets
and reject every wrong code/phase/severity/blocking/location/remediation pair.
Enumerate every form-contract code and prove it can appear only as source
evidence; cover every allowed operation/aspect translation to a fixed
agent-context diagnostic and reject generic raw projections. Split `addItem`
from `expandItem`: reject expand without exact item context and exact scoped
targets, round-trip both an existing-index expand and add-created capture, and
reject add when the driver cannot prove/capture exactly one created item.
Assert that every valid plan step is one member of the closed discriminated
union and contains all approved binding, target, value, commit, wrapper
mechanic, item context, precondition, readiness, activation, action, and
outcome references required by compilation. This slice alone tests the central
value proposition.

### Slice 3 — One native positive/negative driver vertical

**Inference:** Add one usage-entry driver and built-in fill/select/check
profiles plus validation surfaces for native controls. Compile only validated
plans to stable driver calls, then Playwright tests. The caller resubmits the
plan, hash, and context; compilation recomputes the canonical hash and rejects
context drift or tampering before driver resolution. Retain strict uniqueness,
actionability, and web-first assertions.

**Gate:** One positive and one negative native fixture test pass repeatedly
without raw selectors in intent or generated source. Cover immediate,
explicit-blur, and usage-action commit modes; reject missing and duplicate
commit authority; and prove post-commit rather than DOM-only value state.
Round-trip representative plans through canonical JSON, then compile them with
a registry API instrumented to fail if it performs selection instead of exact
ID lookup. Prove wrapper click/check preservation, repeater descendant item
binding at schema/compile-call level, bidirectional usage-action commit linkage,
and that a shared blur-commit/validation activation emits exactly one browser
event. Browser-level add/capture/expand proof remains in Slice 5.
Compare author/review time and first-run rate against an ordinary hand-written
Playwright test.

### Slice 4 — Resolved scenario and custom/dynamic vertical

**Inference:** Generate/index trusted resolved scenarios, part-scoped locators,
runtime value/readiness capabilities, custom profile drivers, wrapper
preconditions, and the claims conditional path.

**Gate:** Walkthrough 2 passes and each deliberately removed metadata item
causes the expected blocker. If safe scenario materialization cannot settle the
dynamic field, use an application driver or keep the flow blocked; do not move
execution into MCP.

### Slice 5 — Repeaters, browser parity, and change analysis

**Inference:** Add explicit repeated-item context, add/expand capabilities,
observed locator/role/state parity, source-to-contract change impact, and
redacted trace policy only after the simpler path is stable.

**Gate:** Representative repeater and overlay cases remain deterministic under
row count and DOM changes. Prove add establishes exactly one created-item
context, expand requires and stays scoped to an exact existing/created item,
and a many-cardinality expand part never reaches the driver unscoped. Parity
failures identify the contract/profile owner without exposing sensitive values.

## Feasibility and value recommendation

**Inference — feasibility:** Technically feasible. The current schema already
models most field-level planning facts and deliberately separates data from
trusted execution. A small query/validator layer can reuse those boundaries.
The missing metadata is identifiable and versionable; no arbitrary source or
browser inference is necessary.

**Inference — value:** Conditional go. Build Slices 0–2 and measure them before
committing to a broad Playwright driver package. A validator that catches stale,
ambiguous, dynamic, hidden, ordering, readiness, wrapper/repeater, and
validation-surface gaps provides value even if compilation remains limited.

**Inference — stop conditions:** Stop or narrow the project if a representative
pilot shows any of:

- usage/step metadata requires duplicating application routing/form structure
  manually with high drift;
- fewer than roughly 70% of targeted nodes can pass intent validation without
  application-specific drivers;
- scenario generation needs production data/network access or cannot remain
  synthetic and deterministic;
- first-run success and review effort do not materially improve over source
  reading plus ordinary Playwright; or
- teams bypass diagnostics with raw-selector escape hatches.

**Unknown:** The 70% figure is a proposed pilot gate, not a measured threshold.
The maintainer should replace it with an observed cost/coverage target after
the first workplace sample.

## Acceptance traceability

| Acceptance criterion | Evidence in this artifact | Result |
| --- | --- | --- |
| 1. Two end-to-end walkthroughs cover positive and negative tests, including a custom/dynamic field and conditional branch. | “Walkthrough 1” covers a positive order-entry flow with async runtime choice, custom currency control, explicit blur commit, a separately approved validation activation coalesced into one serialized physical event, and post-commit assertions; “Walkthrough 2” covers a negative custom dependent-select and conditional required field. Both enumerate complete execution prerequisites and include query, intent, validation, and conceptual driver calls/refusals. | Met as paper walkthrough; current artifacts are explicitly shown insufficient. |
| 2. Minimal query/intent contract and diagnostic model with alternatives and security constraints. | Closed query results; collection-named request/response cursors with atomic secondary metadata and oversized-record refusal; complete-or-refuse atomic closures; exact single-step slice scope; progressive disclosure; typed intent with exact add/capture/expand authority and distinct commit/validation/action authority; a lossless discriminated stateless plan/compile handoff; raw form diagnostics retained only as evidence behind an exhaustive fixed agent policy; security/privacy; and alternatives/remediation-decision sections. | Met as a proposed contract, pending production-schema tests in Slices 1–2. |
| 3. Explicit required/optional/not-useful RH-01–RH-04 metadata list. | “RH-01–RH-04 metadata dependency audit.” | Met without assuming lane success. |
| 4. Feasibility/value recommendation, confidence, UX failure modes, ordered implementation slices. | Executive decision, alternatives, UX table, slices/stop gates, and feasibility/value section. | Met. |

## Verification record

**Repository observation:** The following commands were run from the repository
root on the commit/environment stated at the top. Exact final results are
recorded here after the artifact was written.

```text
$ pnpm install --frozen-lockfile --offline
Scope: all 10 workspace projects
Lockfile is up to date; 1029 packages reused from the local store; exit 0.
Warnings: fixture CLI bins were unavailable before workspace build outputs,
and pnpm reported ignored dependency build scripts. No tracked file changed.

$ pnpm exec vitest run fixtures/angular-monorepo/workspace-fixture.test.ts
Test Files  1 passed (1)
Tests       7 passed (7)
Duration    15.76s
Exit        0

$ pnpm check:docs
Documentation checks passed for 57 files.
Exit 0.

$ git diff --check
No output; exit 0.
```

### Independent-review correction verification

**Repository observation:** On 2026-08-27, the five findings from independent
review instance 1 of 3 were addressed in this artifact only. The correction
worktree was based on commit
`9bb07180535b2ff22e38680f838151303d63eb7d` on branch
`codex/rh-05-agent-e2e-context-flow` with the environment recorded above.

```text
$ pnpm check:docs
Documentation checks passed for 57 files.
Exit 0.

$ pnpm exec vitest run fixtures/angular-monorepo/workspace-fixture.test.ts
Test Files  1 passed (1)
Tests       7 passed (7)
Duration    14.88s
Exit        0

$ git diff --check
No output; exit 0.

$ git diff --name-only
docs/research/hardening/agent-to-e2e-context-flow.md
Exit 0.
```

**Documented fact — source readback:** Official Playwright Trace Viewer
documentation was checked for trace screenshot, DOM snapshot, and network
request contents. W3C WCAG 2.2 SC 3.3.1 and technique ARIA21 were checked to
separate the normative text-error requirement from the optional programmatic
association technique.

### Review-instance-2 correction verification

**Repository observation:** On 2026-08-27, the three findings from independent
review instance 2 of 3 were addressed in this artifact only. The correction
worktree was based on commit
`cc522ff6784f6ee54a6fa5175c5224afcc354d6a` on branch
`codex/rh-05-agent-e2e-context-flow` with the environment recorded above.

```text
$ pnpm check:docs
Documentation checks passed for 57 files.
Exit 0.

$ pnpm exec vitest run fixtures/angular-monorepo/workspace-fixture.test.ts
Test Files  1 passed (1)
Tests       7 passed (7)
Duration    15.38s
Exit        0

$ git diff --check
No output; exit 0.

$ git diff --name-only
docs/research/hardening/agent-to-e2e-context-flow.md
Exit 0.
```

**Repository observation — contract self-check:** An in-memory TypeScript
compiler-API audit extracted all 11 `ts` fences from this artifact. It parsed
796 TypeScript lines with zero syntax diagnostics and found no unresolved
custom type references; `JsonValue` is intentionally supplied by the existing
repository schema.

**Documented fact — source readback:** Official Angular `FormControl.updateOn`
and Playwright `Locator.fill` documentation were checked to distinguish blur
commit semantics from Playwright's documented focus/fill/input behavior.

### Review-instance-3 findings correction and adversarial self-review

**Repository observation:** On 2026-08-27, the four findings from independent
review instance 3 of 3 were accepted and addressed in this artifact only. The
correction worktree started from commit
`37f76f13717a9f292d651f17e4a2c74b3e3df863` on branch
`codex/rh-05-agent-e2e-context-flow`.

| Accepted finding | Retained correction | Adversarial self-check |
| --- | --- | --- |
| Plan loses commit, wrapper, repeater, or shared-event authority | Required commit linkage on every set; physical-operation identity/authorities; exact wrapper mechanic/target; exact item context; bidirectional usage-action commit linkage; exact purpose-mapped targets. | Type-negative checks reject a set without commit and a wrapper without mechanic/target. Walkthrough 1 serializes one blur with two independently approved authorities. Prose search found and removed the remaining compiler-owned readiness expansion. |
| Diagnostic policy is incomplete or freely combinable | `IntentDiagnosticPolicyByCode` is the exhaustive discriminant map; 34 codes each fix phase, severity, blocking, location, and one remediation shape. Missing/unsupported/ambiguous commit and value assertion are distinct; usage-entry, outcome-assertion, and validation-assertion policies are explicit. | AST audit found 34 complete entries and all required refusal codes. Type-negative checks reject the wrong phase and wrong remediation for `VALIDATION_ASSERTION_UNSUPPORTED`; warning and blocker result arrays are distinct. |
| Pagination is inconsistent or cannot continue | Discriminated page states; matching cursor request for summary/diagnostics; cursor-bound search/node lists; complete-or-refuse journey/slice closures. | Type-negative checks reject both invalid page states. Slice 1 gates cursor replay/binding and atomic overflow with no partial payload. Current MCP cursor/output-schema behavior was rechecked against the official 2025-11-25 specification. |
| E2E slice cannot represent cross-step focus | Mandatory `withinStepId`, exact membership validation, fixed `STEP_SCOPE_MISMATCH`, and an explicitly single-step complete result. | Type-negative check rejects a slice request without the step. Slice 1 gate requires a cross-step refusal and exact same-step success. |

```text
$ pnpm check:docs
Documentation checks passed for 57 files.
Exit 0.

$ pnpm exec vitest run fixtures/angular-monorepo/workspace-fixture.test.ts
Test Files  1 passed (1)
Tests       7 passed (7)
Duration    13.27s
Exit        0

$ pnpm check
First sandboxed run: lint, 34 test files / 450 tests, and builds passed; the
workspace-consumer check then failed because pnpm could not write its external
store (`ERR_PNPM_EPERM`). This was an environment limitation, not a test
failure.
Approved rerun: lint passed; 34 test files / 450 tests passed; all demo/app/
fixture builds passed; workspace consumers, release manifest, package checks,
demo smoke, and 57-file documentation checks passed. Exit 0.

$ node <in-memory TypeScript contract-fence audit>
Contract fences  9
TypeScript lines 1118
Unexpected syntax/semantic diagnostics  0
Exit 0.

$ node <in-memory negative type/assertion audit>
Negative type assertions  7
Unexpected diagnostics    0
Exit 0.

$ node <in-memory diagnostic-policy AST audit>
Policy codes               34
Incomplete policy entries  0
Required refusal codes     all present
Exit 0.

$ git diff --check
No output; exit 0.

$ git diff --name-only
docs/research/hardening/agent-to-e2e-context-flow.md
Exit 0.
```

**Documented fact — source readback:** The MCP 2025-11-25 pagination page was
checked for opaque cursor request/continuation semantics, and the tools page was
checked for output-schema conformance requirements. Current official Angular
and Playwright sources were rechecked for `updateOn`, `fill`, `blur`, strict
locator, and actionability behavior.

### New-cycle review-instance-1 correction and final self-review

**Repository observation:** On 2026-08-27, the three findings from independent
review instance 1 of 3 in the newly authorized cycle were accepted and
addressed in this artifact only. The correction worktree started from commit
`8f69d33de2591c6739efad79cd45ba9a22bd7393` on branch
`codex/rh-05-agent-e2e-context-flow`.

| Accepted finding | Retained correction | Adversarial self-check |
| --- | --- | --- |
| Repeater add/expand authority still permits an unscoped row | Split intent and plan add/expand variants. Add has no input item context, names the exact add target, and establishes a unique created-item capture with a separate exact item target. Expand requires an exact existing-index or earlier created-item context plus exact item/expand targets. | Strict negative types reject expand without context, add with an input context, add without its target, and incomplete created-item authority. Slice 2 owns schema/round-trip proof; Slice 5 owns browser proof that a many-cardinality expand never reaches a driver unscoped. |
| Raw form-contract diagnostics bypass the fixed agent policy | Removed raw form-contract branches from executable query diagnostics and blockers. Raw identity/severity remain evidence only; structured artifact aspects select one of the fixed agent variants, while an absent safe projection returns fixed `CONTRACT_CONTEXT_INVALID`. | AST audit found 37 structurally complete policy entries. A negative type rejects raw form diagnostics as `QueryDiagnosticProjection`; Slice 2 enumerates source codes, mappings, missing-projection refusal, and wrong policy tuples. |
| A cursor does not identify which collection it continues or how other records remain complete | Both request and response page types carry the same literal collection identity. Each result pages one primary list; top-level secondary lists are atomic and repeat completely. Nested arrays are part of capped atomic records, and an oversized primary/secondary record refuses with `ATOMIC_RECORD_TOO_LARGE`. | Type negatives reject both illegal truncation states and request/response collection mismatch. The Slice 1 gate requires per-collection continuation, stable repeated atomic metadata, cursor binding, and oversized-record refusal without partial data. |

The final self-review also separated existing-index authority from plan-created
item authority, required distinct add-control and created-item targets, and
added the fail-closed contract-context diagnostic. These are bounded contract
clarifications, not production implementation or an architecture change.

```text
$ pnpm check:docs
Documentation checks passed for 57 files.
Exit 0.

$ pnpm exec vitest run fixtures/angular-monorepo/workspace-fixture.test.ts
Test Files  1 passed (1)
Tests       7 passed (7)
Duration    14.80s
Exit        0.

$ pnpm check
First sandboxed run: lint, 34 test files / 450 tests, and all builds passed;
the workspace-consumer check then failed because pnpm could not write its
external store (`ERR_PNPM_EPERM`). This was an environment limitation, not a
test failure.
Approved rerun: lint passed; 34 test files / 450 tests passed; all demo/app/
fixture builds passed; workspace consumers, release manifest, package checks,
demo smoke, and 57-file documentation checks passed. Exit 0.

$ node /private/tmp/rh05-type-audit.cjs
Total TypeScript fences       11
Contract fences                9
Contract TypeScript lines   1234
Unexpected diagnostics         0
Negative type assertions      14
Unexpected diagnostics         0
Policy codes                   37
Incomplete policy entries      0
Required correction codes    all present
Executable raw contract diagnostics excluded
Request/response page collections owned: candidates, diagnostics, nodes, steps
Repeater add/expand split and exact expand binding confirmed
Exit 0.
The temporary audit file was outside the repository and removed after use so
the named research artifact remains the only retained path.
```

## Primary sources

### Repository sources

- [Architecture overview](../../architecture-overview.md)
- [Implementation plan](../../implementation-plan.md)
- [v0.3 test locator specification](../../v0.3-test-locators-spec.md)
- [v0.4 E2E authoring metadata specification](../../v0.4-e2e-authoring-metadata-spec.md)
- [Workspace configuration](../../workspace-configuration.md)
- [Schema contract](../../../packages/schema/src/contract.ts)
- [Field interaction DTOs](../../../packages/schema/src/field-type-interaction.ts)
- [Cross-field effect DTOs](../../../packages/schema/src/cross-field-effect.ts)
- [Workspace source/scenario definitions](../../../packages/workspace/src/source.ts)
- [Workspace runner](../../../packages/workspace/src/run-workspace.ts)
- [Workspace index](../../../packages/workspace/src/workspace-index.ts)
- [Angular monorepo workspace golden](../../../fixtures/angular-monorepo/goldens/workspace-index.golden.json)
- [Claims intake contract golden](../../../fixtures/angular-monorepo/goldens/projects/id_Zml4dHVyZS1mZWF0dXJlLWxpYg/forms/id_Y2xhaW1zLmludGFrZQ/sha256-690ac3bdc549efefb1c2cfbb1e72d7624fbce1d288ca0e158fd8d21dbd2e7d07.contract.golden.json)

### Official external sources

- Model Context Protocol 2025-11-25, [Pagination](https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/pagination)
- Model Context Protocol 2025-11-25, [Tools and structured output](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- Playwright, [Locators](https://playwright.dev/docs/locators)
- Playwright, [Auto-waiting and actionability](https://playwright.dev/docs/actionability)
- Playwright, [Assertions](https://playwright.dev/docs/test-assertions)
- Playwright, [Test configuration and artifacts](https://playwright.dev/docs/test-configuration)
- Playwright, [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- Playwright, [`Locator.fill`](https://playwright.dev/docs/api/class-locator#locator-fill)
- Angular, [`FormControl.updateOn`](https://angular.dev/api/forms/FormControl#updateOn)
- W3C WAI, [Providing Accessible Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)
- W3C WAI, [Understanding SC 3.3.1: Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)
- W3C WAI, [Understanding SC 4.1.3: Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)
- W3C WAI, [Technique ARIA21: Using `aria-invalid` to Indicate an Error Field](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA21.html)

## Limitations and next evidence

**Unknown:** No production MCP server, intent validator, driver registry,
Playwright dependency, or usage/scenario artifact schema exists to execute the
proposed shapes. The walkthrough is deliberately a paper validation over
existing synthetic fixtures, not a claim that generated tests currently pass.

**Unknown:** The current Angular monorepo fixture has page/component usages but
no route/step-one or submit/next action. The proposed usage/step metadata is a
minimal paper supplement, not observed repository output.

**Unknown:** Async option settlement, cancellation, empty/error states, stable
runtime order, localization, and customer-data redaction require a real
application pilot. Playwright actionability does not answer those application
questions.

**Inference — recommended next action:** Implement Slice 0 as an isolated
versioned research/experimental usage-and-artifact envelope, then implement the
pure Slice 2 validator against fixture JSON before adding MCP transport or
Playwright execution. The first gate should reproduce every valid/refusal
result in the two walkthroughs.
