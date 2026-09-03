---
title: Artifacts and source linkage
description: Read workspace indexes, content-addressed contract paths, provenance, and current source-linkage limits.
---

Generation publishes one `workspace-index.json` plus one content-addressed JSON
file per form. When root `sourceUsage` is configured, it also publishes
`source-usage-catalog.json`.

## The index is the lookup surface

Each form entry records:

- `projectId`
- `sourceId`
- `formId`
- `artifactPath`
- contract schema version and content hash
- diagnostics
- declared effects and effect-analysis completeness when present

Each project entry records its project config path, source IDs, effective
output, configuration hash, runtime provenance, and registry identities.

Consumers must parse the index with `parseWorkspaceContractIndex`, filter by
stable identity, and open the recorded `artifactPath`. Do not derive encoded
path segments or hash file names yourself.

## Publication order

Generation validates and writes form artifacts before replacing the workspace
index. Readers therefore see either the prior complete index or the new one;
the index is not published first with paths to unfinished contracts.

One generation lock covers discovery through publication. Lock ownership, the
pnpm lock digest, and runtime tool package versions are rechecked before the
index replace. If artifact promotion or index replacement fails, the prior
index remains authoritative and temporary files are removed. A completed
content-addressed artifact may remain unreferenced; rerunning generation adopts
it only when its canonical bytes match, then commits the new index last.

`formly-contracts check` regenerates expected canonical bytes in memory and
reports missing or stale paths without writing.

## Provenance

Runtime provenance records safe, deterministic identities such as tool and
loader versions, Node platform, execution profile, runtime package identities,
and an exact dependency-lock digest. Machine paths, PIDs, timings, raw
environment, and module URLs do not enter portable hashes.

## Source-usage linkage

An explicit `defineFormContractDefinition` may point
`lineage.rootSymbol` at the real factory. Exact authority begins with the
discovered project config: canonical `defineFormContractProject(...)` syntax
must directly register the canonical `defineFormContractSource(...)`
descriptor, whose expression-bodied list directly returns the helper-created
definition. Literal IDs must match the runtime inventory. A same-ID descriptor
elsewhere is not authority. When that provenance is valid and exactly one
candidate exists, a supported direct `call` or `new` use resolves to the
generated form identity and contract hash:

```text
application component
  createClaimFields(runtimeValue)
       │
       ▼
source-usage-catalog.json
  source span + validated-snapshot sourceFileHash
  + exact projectId/formId/contractHash
       │
       ▼
workspace-index.json → content-addressed contract artifact
```

The catalog is portable: locations are workspace-relative and it never contains
invocation arguments, source text, or absolute workspace paths. The convention
is deliberately partial. It reconciles a project-config authority Program with
the exact Jiti runtime used for project-config evaluation and one configured
leaf TypeScript application Program,
recognizes only direct supported syntax, reports incomplete coverage, and does
not prove routes, rendering, dynamic reachability, or execution. Ambiguity is a
non-actionable catalog resolution. Recognized unsafe optional or computed
rooted invocations may emit source-usage diagnostics; higher-order wrappers,
dynamic aliases or dispatch, and other out-of-grammar flows remain unindexed.
None of these cases produces an exact actionable link.

Every workspace-contained file on the proven authority path—the project config,
source descriptor, definition, root declaration, and traversed aliases—is
validated against the relevant TypeScript Program snapshots and the final bytes read for
materialization. A snapshot mismatch suppresses every exact usage that depends
on the changed file. The exact canonical package-export chain used only to
identify `@formly-contract/workspace` helpers may be outside a nested consumer
root; unrelated external aliases fail closed. Generation/checking should run
against a quiescent checkout. Both Programs are constructed before form factories
execute, but the MVP does not claim a complete snapshot of runtime/Jiti-loaded
modules and retains a short config-loading-to-Program boundary.

The catalog is separate from contract-only `artifactPaths`. The workspace
runner returns `sourceUsageCatalogPath` when enabled, and `check` verifies its
canonical bytes along with the other generated outputs.

:::note[Canonical source]
See the [workspace configuration reference](https://github.com/dills122/formly-contract/blob/main/docs/workspace-configuration.md#generate-a-workspace-artifact-set)
and [source-lineage research](https://github.com/dills122/formly-contract/blob/main/docs/research/hardening/form-identity-and-source-lineage.md).
:::
