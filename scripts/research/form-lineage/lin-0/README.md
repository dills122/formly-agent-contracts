# LIN-0 workplace gate harness

This directory contains a research-only, manifest-driven gate for the RH-01
source-lineage decision. It does not add a product API or a production source
index. It resolves every manifest-selected path under one real slice root;
TypeScript then follows the selected configs' normal semantic dependency
closure. Run it only against a sanitized scratch slice. The report retains
counts, classifications, opaque IDs, and decision codes rather than source
contents or paths.

## Public anchor rehearsal

From the repository root:

```sh
node scripts/research/form-lineage/lin-0/run-gate.mjs \
  --input scripts/research/form-lineage/lin-0/anchor.input.json \
  --check scripts/research/form-lineage/lin-0/anchor.report.json
```

The public Angular fixture is only an anchor. Its retained decision is
`inconclusive`; it cannot satisfy the representative-workplace requirement.
The rehearsal uses the harness-owned `anchor.tsconfig.json`, which selects only
the two fixture callsite roots and the imports required by those roots. This
keeps unrelated product-package source (including mutable schema, compiler, and
workspace implementation files) out of the anchor's semantic closure. The
checked-in canonical report is the staleness check for that bounded closure;
intentional fixture, compiler-option, or dependency changes require an explicit
report review.

## Command contract

The runner accepts exactly these arguments:

```text
--input  required JSON input manifest
--output optional canonical JSON report destination
--check  optional retained report to compare byte-for-byte
```

`--output` and `--check` may be used together. With neither, the canonical
report is written to standard output. A mismatch, invalid input, path escape,
unreadable file, or unresolved required config exits non-zero. The runner never
executes a command supplied by the manifest.

## Representative input contract

Use schema version `1.0.0`. All IDs retained in the report must be lowercase
opaque IDs matching `[a-z0-9][a-z0-9._-]*`; do not put customer, person, route,
repository, or source-path names in them. All file and config locations are
input-only relative POSIX paths contained by `slice.root`. Symlink escapes and
absolute target paths are rejected.

Required top-level fields:

| Field | Contract |
| --- | --- |
| `schemaVersion` | Exactly `1.0.0` |
| `slice` | `id`, `kind`, `root`, `sanitized`, and pinned `snapshotId` |
| `programSelection` | `inventoryComplete`; `true` only after every relevant leaf config is selected or reviewed out of scope |
| `programs` | Exact leaf programs; at least three are required for a go |
| `symbolProbes` | Direct call/construct probes with expected canonical declarations and import conventions |
| `crossProgramJoins` | Portable-join cases joining distinct programs through required mechanisms |
| `overlapCases` | At least one identical/deduplicated case and one conflicting-resolution case |
| `routeScan` | Explicit program IDs and whether their route scan scope is complete |
| `conventionInventory` | Exhaustive aggregate counts for the enumerated root conventions |
| `privacy` | Strict disclosure declarations listed below |
| `bundle` | Browser-output negative scans and a cycle-check result |
| `performance` | Approved budgets and at least three measured samples |

For a real gate, `slice.kind` must be `representative-workplace`,
`slice.sanitized` must be `true`, and `slice.root` should normally be `.` in the
sanitized scratch slice. `public-anchor` can rehearse the runner but can never
produce a workplace go.

Each `programs` entry has this shape:

```json
{
  "id": "leaf-app",
  "projectId": "project-a",
  "purpose": "application",
  "leaf": true,
  "tsconfig": "configs/tsconfig.app.json",
  "useSourceOfProjectReferenceRedirect": false
}
```

`tsconfig` is parsed with TypeScript 5.9.3 using its inherited options and
declared project references. Set `useSourceOfProjectReferenceRedirect` only for
the explicit host variant being measured. Each report retains configured-root,
semantic-file, declaration-file, byte, reference, diagnostic, and redirect-mode
counts, never config or source paths.

Each `symbolProbes` entry identifies one call without changing the source:

```json
{
  "id": "factory-call-a",
  "observationId": "physical-call-a",
  "programId": "leaf-app",
  "invocation": {
    "file": "src/feature/usage.ts",
    "callee": "Forms.MakeForm",
    "kind": "call",
    "occurrence": 1
  },
  "expected": {
    "resolution": "exact",
    "portableAnchorId": "forms-public-make-form",
    "conventions": ["namespace-import", "path-alias", "barrel"],
    "declaration": {
      "file": "libs/forms/src/make-form.ts",
      "name": "MakeForm",
      "kind": "function"
    }
  }
}
```

Supported retained convention labels are `relative-import`, `path-alias`,
`barrel`, `namespace-import`, and `aliased-import`. Declaration kinds are
`function`, `class`, and `callable-const`. The file, callee, declaration name,
and declaration path are used locally to verify the result and are not copied
to the report. A wrong unique match is stop evidence.

A cross-program case lists two or more probe IDs and its required mechanisms:

```json
{
  "id": "forms-public-join",
  "probeIds": ["source-redirect-call", "declaration-output-call"],
  "requiredMechanisms": ["source-redirect", "declaration-output"]
}
```

At least one contributing program must carry a real project reference. Both
mechanisms, exact probe results, and one shared `portableAnchorId` are required.
The opaque portable ID represents the reviewed project/module/export anchor;
this prevents a symbol-name comparison from masquerading as a portable join.

An overlap case names probes for the same physical observation under different
program configs:

```json
{
  "id": "app-test-overlap",
  "probeIds": ["app-view", "test-view"],
  "expected": "deduplicated"
}
```

Use a second controlled config whose resolution differs and set `expected` to
`conflict`. The runner compares private declaration identities, retains only
the classification and contributor count, and emits a mismatch if the expected
policy outcome is not observed.

`routeScan.programIds` selects the exact program source sets, and every
`routeScan.registrations` entry must belong to that set. A registration locates
one `provideRouter`/`RouterModule`-style call by contained file, callee text, and
occurrence, then verifies the helper's expected declaration file and name. The
runner traverses only the registered route array (including literal `children`)
and counts literal dynamic imports under `loadChildren`/`loadComponent`
separately from dynamic loaders. Unregistered lookalike objects are ignored. It
never retains route templates, helper names, or import strings. Set
`routeScan.complete` only after every relevant route registration in the
sanitized slice is listed.

```json
{
  "complete": true,
  "programIds": ["leaf-app"],
  "registrations": [
    {
      "id": "app-router",
      "programId": "leaf-app",
      "file": "src/app/routes.ts",
      "callee": "provideRouter",
      "occurrence": 1,
      "expectedDeclaration": {
        "file": "node_modules/@angular/router/index.d.ts",
        "name": "provideRouter"
      }
    }
  ]
}
```

The convention inventory must provide `enumeratedRootCount`, `complete`, and
non-negative integer counts for:

```text
directExportFunction
directExportClass
directExportCallableConst
exportListOnly
inlineOrWrapper
other
```

The counts must sum to the enumerated total. This is an inventory measurement,
not authority to treat every matching declaration as a form root.

The strict privacy block is:

```json
{
  "disclosureMode": "module-only",
  "retainCallArguments": false,
  "retainEnvironment": false,
  "retainObservedUrls": false,
  "retainRouteTemplates": false,
  "retainSourceText": false
}
```

The runner also audits its report for absolute paths and disallowed retained
fields. It records TypeScript diagnostic counts only; messages and source
snippets are not retained.

`bundle.files` names built browser outputs inside the slice. Each forbidden
probe has an opaque ID, one of the kinds `root-anchor`, `usage-annotation`, or
`source-location`, and local literal strings to scan. Literal values and file
paths are not retained. A go requires all three kinds, zero matches, at least
one scanned bundle, and `runtimeCycleCheckPassed: true` from the pinned local
bundle/cycle experiment.

Performance input uses this exact structure:

```json
{
  "protocol": "lin-0-program-probe-v1",
  "budgetsApproved": true,
  "budgets": {
    "coldMs": 2000,
    "incrementalMs": 500,
    "peakRssMiB": 1024,
    "artifactBytes": 100000
  },
  "samples": [
    {
      "id": "sample-1",
      "coldMs": 1000,
      "incrementalMs": 250,
      "peakRssMiB": 512,
      "artifactBytes": 50000
    }
  ]
}
```

Retain at least three independent samples. `coldMs` is a fresh-process full
leaf-program probe; `incrementalMs` is the affected-leaf rerun after one
allowlisted usage-only edit under the same pinned tool/host overlay;
`peakRssMiB` is peak resident memory for the cold probe; `artifactBytes` is the
canonical candidate lineage artifact size. The runner derives maxima and
compares them with the approved budgets. It does not fabricate timings. A
missing budget/measurement is inconclusive; an observed overrun is no-go.

## Work-laptop run

Create a customer-data-free sanitized scratch slice first. Then, from that
slice, run:

```sh
FORMLY_CONTRACT_REPO=/absolute/path/to/formly-agent-contracts
node "$FORMLY_CONTRACT_REPO/scripts/research/form-lineage/lin-0/run-gate.mjs" \
  --input ./lin-0.input.json \
  --output ./lin-0.report.json
node "$FORMLY_CONTRACT_REPO/scripts/research/form-lineage/lin-0/run-gate.mjs" \
  --input ./lin-0.input.json \
  --check ./lin-0.report.json
```

Do not copy the unsanitized workspace, raw diagnostics, sources, bundles, or
input manifest into this public repository. Retain only the reviewed report
after its opaque IDs and numeric measurements pass a human disclosure review.

## Decision semantics

- A public anchor or unsanitized slice is always `inconclusive`.
- A sanitized representative slice with missing evidence is `inconclusive`.
- A sanitized representative slice with an observed stop condition is
  `no-go`.
- Only a sanitized representative slice with every fixed check passing is
  `go`.

Input cannot set the decision or weaken the required check list.
