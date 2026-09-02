# `@formly-contract/angular`

Controlled Angular runtime-host composition for Formly Contract.

The package keeps Angular and Formly out of the parent workspace process. Each
selected project is evaluated in a disposable child, the project-local Angular
compiler is reserved before partially compiled Angular modules load, and only
validated JSON-safe inventory and contracts cross IPC.

```ts
import { checkAngularWorkspace, runAngularWorkspace } from '@formly-contract/angular/jit';

await runAngularWorkspace({
  workspaceRoot: process.cwd(),
  rootConfigPath: 'formly-contracts.config.ts',
});
```

`checkAngularWorkspace` uses the identical isolated runtime without writing
artifacts. Both APIs preserve exact project selection and
`continueOnProjectError`; skipped inventory/compile failures are returned as
safe `projectFailures` records with stable code and phase. `explain: true` (or
CLI `--explain`) requests a bounded local cause chain and workspace-relative
frames. These details are omitted by default and never enter artifacts or
hashes.

The `angularAuthoringRuntimeHost` identifier is reserved for the separate
browser/AOT authoring lane. Loading it currently fails with an explicit stable
refusal; it is not a JIT fallback.

Angular 20 and Formly 6 are optional peers so the descriptor can be imported in
a Node-safe parent. They must resolve from the selected project's runtime base
when the JIT worker starts. TypeScript aliases for Angular runtime packages are
rejected.

The child process is a trusted-code isolation boundary for module/cache state,
crashes, and timeouts. It is not an untrusted-code or network sandbox.

## Consumer library boundary

Compiler preload solves Angular's partially compiled library prerequisite. It
does not make an application's complete browser barrel safe under Node or
repair JavaScript temporal-dead-zone cycles.

Reusable form libraries should expose separate entry points:

```text
@work/forms-kit            Angular modules and components
@work/forms-kit/forms      pure form factories
@work/forms-kit/contracts  source descriptors and profile data
```

Import only `/contracts` from `formly-contracts.project.ts`. Ensure its entire
runtime dependency closure excludes Angular components, browser integrations,
and application initialization. If a component directly self-references in
decorator provider metadata, repair that component with Angular's
`forwardRef(() => Component)` pattern separately.

The complete consumer layout, TypeScript paths, project config, selected CLI
commands, boundary tests, and temporary-shim fallback are documented in the
[Node-safe Angular libraries
guide](../../apps/docs/src/content/docs/reference/node-safe-angular-libraries.md).
