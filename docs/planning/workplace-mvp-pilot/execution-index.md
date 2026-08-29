# Workplace MVP Pilot Execution Index

- Status: Ready for PR
- Branch: `codex/mvp-form-linkage-generated-profiles`
- Integration destination: `main`
- Canonical background:
  - [Architecture overview](../../architecture-overview.md)
  - [Form identity and source lineage](../../research/hardening/form-identity-and-source-lineage.md)
  - [ADR 0011](../../decisions/0011-named-formly-environments-and-contracted-field-adapters.md)

## Objective and completion boundary

Ship one opt-in, fail-closed workplace pilot that proves two user-visible
outcomes without claiming completion of the broader `LIN-*` or `ANG-*`
roadmaps:

1. an agent can start from one supported Angular component or registered form
   ID and resolve the exact generated contract and content hash through the
   existing source-usage query model; and
2. one custom Formly radio-group type can generate the canonical
   `FieldTypeProfileRegistry` from a compact, reviewed declaration that also
   supplies the type name used by the real Formly registration.

The source link is `static-convention` evidence. It proves a supported source
construction relationship, not route reachability or observed browser
rendering. The compact field declaration is semantic authority; component
names, templates, and DOM observations never infer or promote behavior.

## Deliberate pilot constraints

- One explicitly configured leaf application Program plus one narrow
  project-config authority Program whose traversed imports and re-exports must
  agree with the exact Jiti config runtime.
- One directly exported function root and one direct component call grammar.
- Callsites must be below a discovered project-config root; source-empty
  feature configs are the manual MVP ownership anchor.
- One `radioChoice()` preset.
- Node-safe contract declarations remain separate from Angular component
  imports.
- Recognized invalid definitions and unsafe rooted calls emit deterministic
  diagnostics. Ambiguous calls carry a non-actionable resolution, and other
  out-of-grammar flows remain unindexed under explicitly incomplete coverage.
  None produces an exact actionable link.
- No named environments, lazy-scope inventory, route/journey inference,
  browser conformance, arbitrary wrappers, inferred runtime factory inputs, MCP
  transport, or Playwright execution.
- This pilot does not mark `LIN-0`, `LIN-1`–`LIN-4`, `AUTH-0`, or
  `ANG-2R`–`ANG-5` complete. It supplies measured implementation and workplace
  evidence for those later gates.

## Work items

| ID        | Outcome                                                                                                                                    | Owner             | Depends on           | Status   | Verification                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PILOT-0` | Freeze the opt-in API, supported grammar, authority boundary, and independent golden                                                       | Lead              | none                 | complete | This execution index and focused design exploration agree                                                                                                                                                   |
| `PILOT-1` | Add a typed form-definition helper and explicit root-symbol anchor without serializing functions                                           | Workspace lane    | `PILOT-0`            | complete | Focused source parser/helper tests pass, including invalid lineage shapes                                                                                                                                   |
| `PILOT-2` | Add Node-safe `defineContractedFormlyType`, `radioChoice`, real-registration binding, and pure lowering to the existing canonical registry | Profile lane      | `PILOT-0`            | complete | Unit tests compare against independently authored canonical bytes and reject malformed/duplicate inputs; schema and Nx AOT builds pass                                                                      |
| `PILOT-3` | Build the strict TypeScript-symbol source-usage producer and emit existing canonical source-usage artifacts                                | Lineage lane      | `PILOT-1`            | complete | Authority/application/Jiti disagreement, invalid or suppressed TypeScript, unchecked JavaScript-family calls, snapshot drift, and ambiguous roots all fail closed; focused workspace/Nx verification passes |
| `PILOT-4` | Convert the Nx fixture into one integrated real registration, generated profile, direct component usage, and exact query walkthrough       | Integration owner | `PILOT-2`, `PILOT-3` | complete | Query by form ID and source path reaches the exact contract hash; canonical generated profile and production Angular build pass                                                                             |
| `PILOT-5` | Package, document, review, and prepare the workplace checkout                                                                              | Lead              | `PILOT-4`            | complete | `pnpm check` passes with 995 tests, all package/application/Angular/Nx builds, linked and packed consumers, release/pack/demo gates, 104 documentation checks, and the 18-page docs build                   |

## Acceptance demo

The retained Nx fixture must demonstrate this complete chain:

```text
Angular component direct factory call
  -> TypeScript symbol-resolved root anchor
  -> stable form ID
  -> generated contract and exact content hash
  -> source-usage query result

radioChoice() declaration
  -> actual Formly type registration name
  -> generated canonical field-type profile registry
  -> compiler projection for the custom field
```

The acceptance test must additionally prove:

- arguments passed by application code are neither executed nor serialized by
  source indexing;
- no absolute paths or source text enter portable artifacts;
- discovery order does not change canonical registry or source-usage output;
- the expected canonical registry bytes are independent test data, not output
  generated by the implementation under test;
- a production Angular AOT build still succeeds; and
- recognized invalid source or custom-field shapes fail closed with stable
  guidance, while other out-of-grammar source flows remain unindexed under
  incomplete coverage;
- canonical source membership and literal source identity bind the static
  definition to the runtime-indexed form; and
- snapshot mismatch, ambiguous resolution, and recognized optional/computed
  rooted calls never become exact actionable usages.

## Parallel delivery plan

- `PILOT-1` and `PILOT-2` run in parallel after the API freeze.
- `PILOT-3` starts from the settled `PILOT-1` contract and owns a new isolated
  indexer module.
- Only the integration owner edits workspace orchestration and the Nx
  end-to-end fixture after producer handoff, avoiding shared-file conflicts.
- The lead reconciles every retained change, updates this index, and runs final
  integration verification.

## Official implementation references

- TypeScript programs and type-checker symbol resolution:
  <https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API>
- Angular production builds and AOT template checking:
  <https://angular.dev/tools/cli/aot-compiler>
- Formly custom-type registration and aliasing:
  <https://formly.dev/docs/guide/custom-formly-field/>
- Formly `FormlyModule.forChild` API:
  <https://formly.dev/docs/api/core/>

## Risks and mitigations

| Risk                                                                     | Mitigation                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workplace barrels or tsconfig boundaries prevent exact symbol resolution | Configure explicit root/runtime and leaf application tsconfigs, require both Programs to agree, retain incomplete coverage, and use the workplace run to decide the next grammar increment                                                      |
| Angular imports leak into Node config loading                            | Keep contracted declarations data-only and pass the component only to an Angular-side registration helper                                                                                                                                       |
| Generated profiles accidentally bypass real registration                 | Remove the fixture's manual registry and assert the registration name and generated profile reference share one declaration                                                                                                                     |
| Static evidence is mistaken for runtime proof                            | Tag it `static-convention`; keep route/render/browser claims explicitly out of scope                                                                                                                                                            |
| Compiler API changes or source changes during analysis                   | Pin and package TypeScript 5.9.3, bind catalogs to the lock-pinned workspace index, hash only a byte snapshot proven equal to analyzed `SourceFile.text`, validate workspace-owned source/declaration realpaths, and retain incomplete coverage |
