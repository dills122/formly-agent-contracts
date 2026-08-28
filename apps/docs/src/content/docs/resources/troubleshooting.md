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
