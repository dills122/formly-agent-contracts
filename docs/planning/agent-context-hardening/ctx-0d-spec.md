# CTX-0D Specification: Synthetic RH-05 Walkthrough Fixtures

- Status: Complete
- Depends on: `CTX-0B`, `CTX-0C`
- Implements: `CTX-0D` in the [execution index](execution-index.md)
- Research basis:
  [RH-05 agent-to-contract-to-Playwright context flow](../../research/hardening/agent-to-e2e-context-flow.md)

## Objective

Provide the smallest deterministic, schema-valid positive and negative RH-05
fixture set that the pure `CTX-1` query core and `CTX-2` intent validator can
consume without source loading, Angular, application runtime, MCP, Playwright,
filesystem access, randomness, or environment-dependent values.

The fixture set proves only the shared schema and synthetic consumer spine. It
is not source, runtime, workplace, scenario-producer, or driver-registry
evidence.

## Owned files

| File                                                             | Responsibility                                                                           |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `packages/schema/src/agent-context-walkthrough-fixtures.ts`      | Pure fixture factory, fixture DTOs, and exact cross-family validator                     |
| `packages/schema/src/agent-context-walkthrough-fixtures.test.ts` | Determinism, strict owner validation, synthetic marking, and cross-family mismatch tests |
| `docs/planning/agent-context-hardening/ctx-0d-spec.md`           | This contract and test plan                                                              |

Package-barrel exports, Changesets, and execution-index status are integrated
by the parent task.

## Public fixture API

```ts
interface SyntheticRh05AgentContextFixtureSet {
  readonly kind: "synthetic";
  readonly id: "synthetic.rh05.agent-context-fixture-set";
  readonly researchBasis: "RH-05";
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly artifactSet: AgentContextArtifactSet;
  readonly sourceUsageCatalog: AgentContextSourceUsageCatalog;
  readonly journeyCatalog: AgentContextJourneyCatalog;
  readonly walkthroughs: {
    readonly positive: SyntheticRh05WalkthroughFixture;
    readonly negative: SyntheticRh05WalkthroughFixture;
  };
}

function createSyntheticRh05AgentContextFixtureSet(): SyntheticRh05AgentContextFixtureSet;

function validateSyntheticRh05AgentContextFixtureSet(input: unknown): void;
```

The factory accepts no input and creates fresh detached data on each call. The
validator first passes unknown input through a descriptor-safe exact outer
boundary, invokes every owner parser against the resulting detached ordinary
graph, and then validates the joins that no single owner schema can prove.

## Fixture composition

One fixture set contains:

- one CTX-0A artifact-set envelope;
- one CTX-0B source-usage catalog with two exact declared usages;
- one CTX-0B journey catalog with two single-step journeys;
- two declared Form Contracts;
- two resolved Form Contracts; and
- two CTX-0C execution-authority artifacts.

The artifact set has exactly eight references: the two catalogs, four Form
Contracts, and two execution authorities. The structured workspace-index
anchor remains separate as CTX-0A requires.

The Form Contracts pin deterministic synthetic field-profile and cross-field
effect registry identities where the Form Contract schema requires those
owner references. Those referenced producer artifacts are not added to the
fixture set and must not be reported as driver-registry or workplace evidence.

### Positive walkthrough

The positive fixture is the synthetic equivalent of RH-05 walkthrough 1:

- form `synthetic.rh05.operations.purchase-order`;
- usage `synthetic.rh05.test-app.catalog.operations.purchase-order@1`;
- journey `synthetic.rh05.operations.purchase-order@1`;
- step `synthetic.rh05.operations.purchase-order.step-one`;
- supplier, currency, and total nodes; and
- scenario reference `synthetic.rh05.suppliers-ready@1`.

The resolved supplier has a scenario-bounded synthetic domain and explicit
interaction-owned readiness. Currency has the complete `CAD`/`USD` domain.
Total has required/minimum constraints, a custom fill profile, one explicit
blur physical operation, an explicit blur commit, a minimum-validation
activation linked to the same blur, and a committed-model-value assertion.
Supplier and currency use immediate included-in-set commits.

The shared blur record is the only physical operation and is owned exactly by
the total commit and total validation activation.

### Negative walkthrough

The negative fixture is the synthetic equivalent of RH-05 walkthrough 2:

- form `synthetic.rh05.claims.intake`;
- usage `synthetic.rh05.test-app.page.claims-intake-step-one@1`;
- journey `synthetic.rh05.claims.intake@1`;
- step `synthetic.rh05.claims.intake.step-one`;
- product, case-type, and other-details nodes; and
- scenario reference `synthetic.rh05.auto-other@1`.

Both declared and resolved contracts retain the explicit synchronous,
source-before-target effects from product to case-type options and from case
type to other-details visibility. Effect analysis remains incomplete because
the source rules are opaque.

The resolved contract supplies the scenario-bounded `other` domain, the custom
overlay profile and interaction-owned readiness, visible other-details state,
and the required constraint. Execution authority supplies immediate commits,
an independent visibility assertion, and one blur operation used only by the
required-validation activation. The walkthrough focuses only other-details;
its expected same-step closure contains product, case type, and other details.

## Synthetic boundary

The fixture uses defense in depth rather than adding an unsupported property
to strict owner schemas:

- the set and both walkthrough records carry literal `kind: 'synthetic'`;
- project, form, root, usage, journey, step, node, scenario, profile, driver,
  target, and authority identities use the `synthetic.rh05.` namespace;
- evidence references use `synthetic:rh05:`;
- source locations are opaque synthetic file identities, not real paths or
  spans;
- source coverage is explicitly incomplete with
  `synthetic-fixture-only`; and
- repository revision is `synthetic.ctx-0d.rh05.v1`.

The validator walks every ID-bearing and evidence-bearing record to preserve
that boundary even when a downstream test extracts an owner artifact from the
outer fixture set.

## Exact outer parsing boundary

The validator accepts `unknown`; it does not trust a TypeScript annotation at
the runtime boundary. Before reading owner artifacts or evaluating joins it:

- performs an iterative descriptor-only preflight capped at nesting depth 128
  and 100,000 total data-graph nodes before any recursive copy or structured
  clone;
- copies the entire candidate graph from data-property descriptors without
  executing getters;
- rejects proxies before reflection and rejects accessors, cycles, symbol
  keys, sparse or extended arrays, non-enumerable properties, non-finite
  numbers, and nonordinary objects or arrays;
- permits exactly the documented fixture-set keys;
- permits exactly `positive` and `negative` in the walkthrough map;
- permits exactly the documented walkthrough-record keys; and
- binds the positive slot to `positive` / `RH-05 walkthrough 1` and the
  negative slot to `negative` / `RH-05 walkthrough 2`.

The detached graph must also round-trip through structured clone as identical
ordinary JSON data. This brand check refuses built-ins whose visible prototype
was disguised as `Object.prototype`.

The detached graph prevents caller aliases or hostile property behavior from
crossing into owner parsing and cross-family validation. Owner schemas remain
responsible for their own exact nested artifact shapes.

## Exact reference rules

Validation requires:

1. the artifact set and both catalogs to use the same workspace-index anchor;
2. the source-usage and journey catalogs to contain exactly the two
   walkthrough-selected identities and no additional records;
3. each selected usage to resolve exactly one declared contract identity;
4. each single-step journey entry and step to contain the exact usage and form
   reference;
5. authority, scenario, and execution-usage bases to equal the declared Form
   Contract ID and hash;
6. scenario artifact hash to equal the resolved Form Contract hash;
7. CTX-0C execution usage ID/version to equal the CTX-0B usage ID/version;
8. entry identity, landing step, step identity/ordinal, and step action IDs to
   exactly project the selected CTX-0B journey;
9. CTX-0C action, outcome, and transition semantic records to exactly project
   the selected CTX-0B journey, excluding only execution-specific driver and
   assertion authority;
10. the positive resolved supplier to preserve its documented scenario domain
    and resolved interaction profile, plus its exact interaction-owned
    readiness authority;
11. the positive walkthrough to preserve its one shared blur operation and the
    negative walkthrough to preserve its one validation-only blur operation;
12. each walkthrough focus list to equal its documented nonempty, unique
    fixture-specific focus (all three positive nodes and only negative
    other-details);
13. every expected/focus node to resolve in that step and resolved contract;
14. exactly one artifact-set reference for every catalog, contract, and
    execution-authority artifact, with no orphan or extra reference; and
15. strict CTX-0B source-usage/journey cross-catalog validation to pass.

Cross-family validation intentionally remains fixture-scoped. General bundle
assembly and consumer diagnostics belong to `CTX-1` and `CTX-2`.

## Tests and exit evidence

Focused tests prove:

- both walkthroughs and exactly eight artifact references are present;
- all owner artifacts strictly parse and canonical round-trip;
- CTX-0B cross-catalog validation passes;
- two factory calls have byte-identical canonical data and hashes while
  returning fresh detached graphs, proven by mutating the first factory result
  directly across outer, catalog, and authority collections;
- exact outer keys, including enumerable own `__proto__` keys at the root or
  nested in owner artifacts, and named-walkthrough metadata are enforced before
  owner parsing;
- accessors and proxy traps are rejected without execution, deep/oversized
  graphs refuse at the iterative traversal budget, and prototype-disguised
  built-ins fail the structured-clone brand check;
- cycles, nonordinary objects, symbols, sparse arrays, and extended arrays
  refuse;
- positive blur is shared by commit and validation, while negative blur is
  validation-only, and owner-valid rehashed/repinned topology substitutions
  refuse;
- positive supplier scenario-domain/profile/readiness loss refuses even when
  the declared-like resolved contract and authority remain owner-valid and all
  affected hashes are repinned;
- empty, redirected, or duplicate focus lists refuse against the exact
  fixture-specific positive and negative focus;
- caller-rehashed scenario, usage, journey-form, and resolved-contract
  mismatches refuse;
- independently added usage or journey catalog records, caller-rehashed
  journey steps that point at another walkthrough's form or usage, and
  journey/execution projection drift refuse;
- stale owner hashes and unknown keys refuse before fixture joins; and
- loss of synthetic evidence marking refuses.

Run from the repository root:

```text
pnpm exec vitest run packages/schema/src/agent-context-walkthrough-fixtures.test.ts
pnpm --filter @formly-contract/schema typecheck
pnpm exec eslint packages/schema/src/agent-context-walkthrough-fixtures.ts packages/schema/src/agent-context-walkthrough-fixtures.test.ts
```

Retained completion evidence on 2026-08-28: 31 focused tests and the 190-test
combined `CTX-0A` through `CTX-0D` suite passed; schema typecheck, scoped lint,
and diff safety passed. All findings from the maximum three independent-review
passes were converted into owner-valid regressions and remediated; the complete
repository gate then passed with 701 tests.

## Deliberate limits

- The resolved Form Contract is the synthetic scenario target for this pilot;
  there is no `BHV-4` resolved-scenario producer artifact yet.
- Driver references are synthetic data only; there is no `DRV-0` manifest or
  executable driver implementation in the fixture set.
- “Negative” describes a valid negative-test walkthrough. Malformed artifacts
  are generated only as test mutations.
- No typed query, intent, plan, diagnostic, producer, or browser contract is
  introduced by CTX-0D.
