---
title: Form sources
description: Explicitly expose fresh application-owned form factories without guessing exports.
---

A source is a Node-safe catalogue of forms a project has chosen to expose.

```ts
import {
  defineFormContractDefinition,
  defineFormContractProject,
  defineFormContractSource,
} from "@formly-contract/workspace";
import { createClaimFields } from "./forms/claim.fields.js";

export const CLAIM_FORM = defineFormContractDefinition({
  id: "claims.create",
  create: () => ({ fields: createClaimFields() }),
  lineage: { rootSymbol: createClaimFields },
});

export const CLAIMS_SOURCE = defineFormContractSource({
  sourceId: "claims/forms",
  list: () => [CLAIM_FORM],
});

export default defineFormContractProject({
  projectId: "claims/forms",
  sources: [CLAIMS_SOURCE],
});
```

`lineage.rootSymbol` is the explicit anchor for the real application factory.
For source indexing, authority starts at the discovered project config. It must
directly export canonical `defineFormContractProject(...)` syntax whose
`sources` array directly references the canonical
`defineFormContractSource(...)` descriptor. The helper-created definition—or a
direct reference to its helper-created `const`—must then be a direct element of
an expression-bodied `list: () => [...]`. Literal project/source IDs must match
the runtime inventory. Another descriptor with the same `sourceId` does not
authorize a definition. With root `sourceUsage` enabled and this provenance
proved, supported direct calls or constructor uses of the symbol can resolve to
the exact generated `formId` and contract hash in
`source-usage-catalog.json`. The index follows supported TypeScript aliases and
re-export barrels, requires the authority Program to agree with the exact Jiti
config runtime on each traversed module, and does not execute or serialize
invocation arguments.

## Identity rules

- `sourceId` is a lowercase workspace-stable ID.
- A form `id` is a contract-stable identifier.
- Project and source IDs must be globally unique.
- Form IDs must resolve unambiguously across the workspace.
- Identity does not come from a label, route, Formly-generated ID, or file
  name.
- A reusable fragment, step, or field group is lineage/dependency material, not
  a form root, unless the project explicitly registers it as an independently
  generated form.

## Freshness rules

`list()` and every form `create()` callback must return fresh arrays and
objects. Formly mutates field trees during building. Sharing an instance across
runs would make output depend on call order.

Generation still invokes each `create()` callback with no arguments. When
`lineage` is omitted, the index accepts `create` as the implicit root only if
TypeScript proves a zero-argument-compatible call signature. An explicit
`lineage.rootSymbol` may point to a real factory that requires arguments while a
deliberate Node-safe `create` adapter returns the declared form. The source
index never synthesizes dynamic input values.

## Scenarios

A definition may list named synthetic scenarios. Scenario compilation belongs
in a trusted Angular/Formly environment and describes one supplied model and
form-state branch. Do not claim scenario-resolved options or visibility are
globally complete.

## Node-safe entry points

Prefer a secondary entry point such as:

```text
@work/forms-kit            Angular modules and components
@work/forms-kit/forms      reusable factories and fragments
@work/forms-kit/contracts  Node-oriented source descriptors
```

Config loading evaluates imports; it does not tree-shake a browser barrel.

## Source-usage boundary

The current source convention recognizes only an explicit definition with one
stable root symbol and direct `call`/`new` syntax in the configured TypeScript
program. Recognized unsafe optional or computed rooted invocations may emit
diagnostics; higher-order wrappers and dynamic aliases or dispatch remain
unindexed and are not guaranteed to produce a per-call diagnostic. Unsupported
or conflicting project/source descriptor authority emits
`SOURCE_DESCRIPTOR_UNSUPPORTED` or `SOURCE_DESCRIPTOR_CONFLICT`; wrapped,
dynamic, spread, or unreturned authority never produces an exact link. This is
fail-closed and coverage is reported as incomplete. A component context is
evidence about lexical ownership—not proof that a route renders the component
or that an invocation runs.

Workspace-contained project configs, source descriptors, definitions, root
declarations, and traversed authority aliases are validated by comparing the
authority and application Program snapshots with the final bytes read for the
catalog. If any
authority file changes or cannot be read, all exact usages depending on it are
suppressed. In a nested workspace, the exact canonical
`@formly-contract/workspace` package-export chain may be external solely to
establish helper identity; an unrelated external alias remains unsupported.
Run generation/checking against a quiescent checkout. Both Programs are created
before form factories execute, but this MVP does not provide complete runtime
or Jiti module snapshots and retains a short config-loading-to-Program window.

:::note[Maintained example]
See the [Nx form definition](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/feature-lib/src/lib/claim.contract.ts),
[source descriptor](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/feature-lib/src/lib/claims.source.ts),
and [project config](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/feature-lib/formly-contracts.project.ts).
:::
