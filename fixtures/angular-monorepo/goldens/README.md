# Canonical Angular Workspace Goldens

This directory contains the committed expected output for the maintained
[Angular CLI workspace fixture](../README.md). The acceptance test generates a
fresh artifact set and compares it byte-for-byte with these files.

`workspace-index.golden.json` is the lookup surface. Contract files are nested
under encoded project and form IDs and use content-addressed filenames. The
`id_...` directory names are portable encoded identities, not opaque random
folders; the `sha256-...` segment is the contract content hash.

The `.golden.json` and `.contract.golden.json` suffixes distinguish reviewed
test expectations from ordinary generated output, which remains ignored.

Do not edit these files merely to make a failing test pass. Regenerate and
review them only when a schema, compiler, profile, effect, or fixture change is
intended to alter the canonical contract.

Run the owning comparison from the repository root:

```sh
pnpm exec vitest run fixtures/angular-monorepo/workspace-fixture.test.ts
```
