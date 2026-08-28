---
title: Artifacts and source linkage
description: Read workspace indexes, content-addressed contract paths, provenance, and current source-linkage limits.
---

Generation publishes one `workspace-index.json` plus one content-addressed JSON
file per form.

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

`formly-contracts check` regenerates expected canonical bytes in memory and
reports missing or stale paths without writing.

## Provenance

Runtime provenance records safe, deterministic identities such as tool and
loader versions, Node platform, execution profile, runtime package identities,
and an exact dependency-lock digest. Machine paths, PIDs, timings, raw
environment, and module URLs do not enter portable hashes.

## Current linkage limit

The current source link is identity-based:

```text
application contracts entry
  id: claims.create
       │
       ▼
workspace index
  projectId + sourceId + formId
       │
       ▼
content-addressed contract artifact
```

The index names the owning project config but does not yet record the factory’s
TypeScript symbol, source file, or line number. The optional source-indexer
architecture is planned and deliberately partial. Keep IDs beside factories
and treat diagnostics’ `sourcePath` as a path inside the projected field tree,
not a TypeScript file path.

:::note[Canonical source]
See the [workspace configuration reference](https://github.com/dills122/formly-contract/blob/main/docs/workspace-configuration.md#generate-a-workspace-artifact-set)
and [source-lineage research](https://github.com/dills122/formly-contract/blob/main/docs/research/hardening/form-identity-and-source-lineage.md).
:::
