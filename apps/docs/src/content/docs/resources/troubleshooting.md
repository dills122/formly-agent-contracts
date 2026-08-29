---
title: Troubleshooting
description: Diagnose config loading, discovery, custom fields, diagnostics, and stale Formly Contract artifacts.
---

## The CLI cannot load a config

Read the stable code first:

- `CONFIG_NOT_FOUND` — `--config` did not name a file.
- `CONFIG_LOAD_FAILED` — module evaluation or import resolution failed.
- `CONFIG_EXPORT_INVALID` — the module did not default-export an object.

For load failures:

1. Confirm `tsconfigPath` points at the consumer’s real alias-owning config.
2. Import a Node-safe contracts entry point instead of an Angular barrel.
3. Keep every alias imported by that entry point in the tool config; TypeScript
   `paths` objects do not merge entry by entry through `extends`.
4. Run `pnpm exec formly-contracts list` before `generate`.

## Discovery finds the wrong files

Project patterns are relative to the workspace root. Use
`excludeProjectConfigs` for legacy or generated trees. Discovery prunes
dependencies, Git metadata, and the effective output directory, but it does not
exclude every directory named `dist`.

Project-config symlinks are rejected. Keep real configs inside the workspace.

Discovery failures carry one of these stable codes:

- `CONFIG_PATH_OUTSIDE_WORKSPACE` — a matched project config resolves
  outside the workspace root.
- `DUPLICATE_PROJECT_ID` — two discovered project configs declare the same
  `projectId`.
- `DUPLICATE_SOURCE_ID` — two sources within a project declare the same
  `sourceId`.
- `PROJECT_CONFIG_SYMLINK_UNSUPPORTED` — a matched project config path is a
  symlink.

## `generate` or `check` fails

`runWorkspace`/`checkWorkspace` throw a `WorkspaceGenerationError` with one
of these codes:

- `WORKSPACE_DISCOVERY_FAILED` — workspace discovery failed.
- `PROJECT_CONFIG_RESOLUTION_FAILED` — a project's configuration failed to
  resolve.
- `SOURCE_LIST_FAILED` — a form contract source could not be listed.
- `SOURCE_LIST_INVALID` — a form contract source returned an invalid list.
- `FORM_DEFINITION_INVALID` — a form contract definition is invalid.
- `DUPLICATE_FORM_ID` — a form ID is declared more than once.
- `FORM_FACTORY_FAILED` — a form contract factory failed.
- `FORM_INSTANCE_INVALID` — a form contract factory returned an invalid
  instance.
- `CONTRACT_EXTRACTION_FAILED` — form contract extraction failed.
- `SOURCE_USAGE_PROJECT_CONFIG_UNSUPPORTED` — source indexing found a project
  config outside the pilot's supported `.ts`, `.mts`, or `.cts` entry points.
- `SOURCE_USAGE_INDEX_FAILED` — the configured TypeScript source-usage program
  could not be built or indexed within the workspace boundary.
- `DIAGNOSTIC_POLICY_FAILED` — a generated contract violates diagnostic
  policy (`diagnostics.failOn`).
- `DEPENDENCY_SNAPSHOT_UNAVAILABLE` — a pnpm dependency snapshot could not
  be selected.
- `RUNTIME_PROVENANCE_UNAVAILABLE` — runtime toolchain provenance could not
  be determined.
- `OUTPUT_PATH_OUTSIDE_WORKSPACE` — an output path is outside the
  workspace.
- `OUTPUT_SYMLINK_UNSUPPORTED` — symlinked output paths are not supported.
- `OUTPUT_WRITE_FAILED` — workspace contract output could not be written.

Source-usage diagnostics do not use the Form Contract `diagnostics.failOn`
policy. Important source diagnostics include:

- `SOURCE_DESCRIPTOR_UNSUPPORTED` — a discovered project config or its source
  registration is outside the direct canonical helper grammar, has IDs that do
  not match runtime inventory, or contains unsupported wrapped/spread/dynamic
  source elements. No same-ID fallback is attempted.
- `SOURCE_DESCRIPTOR_CONFLICT` — more than one canonical registration claims
  the same project/source authority. Remove the duplicate; neither claim is
  selected by source order.
- `SOURCE_FILE_SNAPSHOT_MISMATCH` — final file bytes do not match the
  TypeScript `SourceFile.text` that established authority or a usage. Every
  exact usage depending on that file is suppressed, not just usages physically
  located in it.
- `SOURCE_RUNTIME_RESOLUTION_MISMATCH` — TypeScript and the exact Jiti runtime
  used for config evaluation selected different canonical files for a
  traversed authority import or re-export. Align the root resolver settings or
  use an import shape supported consistently by both.
- `SOURCE_USAGE_UNSUPPORTED` — a recognized callsite is unsafe for exact
  linkage, including unchecked JavaScript-family files and TypeScript files
  containing `@ts-nocheck`, `@ts-ignore`, or `@ts-expect-error` directives.

Run `generate` and `check` against a quiescent checkout and stop watchers that
rewrite authority files during the pass. The authority and application
TypeScript Programs are created before form factories execute, but the MVP does
not snapshot every
runtime/Jiti-loaded module and retains a short config-loading-to-Program
boundary. Source coverage is intentionally incomplete, so an unsupported
out-of-grammar call is not guaranteed to produce a per-call diagnostic.

## A custom field is unmapped

`UNMAPPED_FIELD_TYPE` means extraction preserved the field but had no reviewed
operational profile. Add a project-owned profile or keep the diagnostic. Do not
map the type to the nearest native widget by appearance.

If a profile exists, confirm its registration matches the exact Formly `type`
and any selected variant. Wrappers need their own reviewed profiles.

## Dynamic options are empty

Function- or async-backed options remain dynamic during declared extraction.
Add a named synthetic scenario in a trusted Angular/Formly environment for each
meaningful branch. The result is complete for that scenario only.

## `check` reports stale artifacts

Run `generate`, inspect the contract diff and diagnostics, and commit or publish
the new artifact set according to the consumer’s policy. Do not overwrite one
hashed contract while leaving an old workspace index in place.

Common intentional causes include field configuration changes, locator-policy
changes, profile registry changes, tool/runtime provenance changes, and lockfile
changes.

## A Playwright helper cannot find a locator

Stop. Check the node’s `locators` and diagnostics. A missing locator is missing
evidence. Add an application-owned test attribute or improve a reviewed profile
and regenerate; do not fall back to an invented CSS selector.

:::note[Canonical troubleshooting path]
The [workplace pilot guide](https://github.com/dills122/formly-contract/blob/main/docs/workplace-pilot.md)
contains the maintained privacy, JIT/barrel, alias, scenario, and feedback
workflow for real repositories.
:::
