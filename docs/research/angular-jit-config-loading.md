# Angular JIT Config Loading in Monorepos

- Status: Accepted for bounded v1 implementation; Task 7A.1 is the first gate
- Date: 2026-08-27
- Decision owner: Formly Contract maintainers
- Confidence: High that a matching compiler preload fixes the observed
  partial-Ivy failure and high that the reviewed host architecture covers the
  stated peer-correct v1 boundary; deliberately unproven for private/bundled
  Angular graphs and for removing each workplace shim until the representative
  graph is rerun

## Decision summary

Preloading the consuming project's matching `@angular/compiler` before Jiti
evaluates a partially compiled Angular import is a valid Angular-supported JIT
fallback. It reproduced and fixed the reported failure against this repository's
Angular and Nx monorepo fixtures.

Do not implement the screenshot's literal fix as an unconditional
`import('@angular/compiler')` inside `@formly-contract/workspace`. A bare import
there resolves from the workspace package, not from the consuming Angular
project, and fails in the repository's strict pnpm layout. Bundling a compiler
with the generic workspace package could instead select a version incompatible
with the consumer's Angular core.

The productized design should be:

1. Promote `@formly-contract/workspace` from the current private prototype to a
   publishable package. It owns the generic runtime-host protocol, alias-free
   package resolver, project-worker launcher, and deterministic parent
   aggregation. It never depends on Angular.
2. Let the parent load only the Node-safe root config, expand project paths, and
   create serializable project execution requests. It must not import a project
   config to discover its ID or sources.
3. Execute each project config, source catalog, and form factory in one fresh
   child process. The child returns only validated JSON-safe inventory,
   diagnostics, provenance, and artifact drafts; no function, Angular object, or
   module namespace crosses IPC.
4. Make `@formly-contract/angular` a compatible workspace peer and the
   composition root for Angular execution. Its dependency-light `./jit` entry
   supplies a parent-resolved worker-module URL; workspace never tries to find an
   undeclared Angular adapter from its own package scope.
5. Resolve and preflight the project-visible `@angular/core` and
   `@angular/compiler` without TypeScript aliases, reject Angular-matching path
   aliases, force those packages through Jiti's native-module path, reserve the
   pair, and import the exact compiler URL before project evaluation.
6. Scope v1 to a **peer-correct Angular graph**: evaluated libraries must consume
   Angular through peers and one physical core/compiler pair must be visible for
   that project. Fresh processes and anchor checks materially improve safety,
   but Jiti 2.7 plus Node 22.13 cannot prove every transitive module used that
   pair. Do not advertise whole-graph singleton enforcement.
7. Version portable runtime-host and toolchain provenance in schema/workspace
   index hashing. Physical URLs remain private worker data; a canonical lockfile
   digest records declared dependency state without claiming installed-byte
   attestation.
8. Keep workers unable to publish. The parent completes cross-project inventory
   and duplicate checks before compilation, waits for every worker, validates
   results, sorts independently of completion order, and commits the workspace
   index last.

Keep Node-safe `contracts` entry points as the preferred low-side-effect source
boundary and as the fallback for barrels that fail for reasons unrelated to
partial compilation. A compiler preload should reduce unnecessary shims; it does
not make arbitrary browser barrels safe. A workplace shim is removable only
after the retained harness and a workplace rerun prove which failure it served.

## Current implementation status

This document is a decision and implementation gate, not a claim that the
feature already exists. The current runner still imports every project config
and executes its factories in the parent process. The current Jiti setup also
applies one root `tsconfigPath` to every project and enables both exact aliases
and full tsconfig-path matching. Until the worker/host slices land, Angular-heavy
configs must keep their proven Node-safe contract entry points or shims; the
diagnostic-only compiler-first bridge is not a supported generation mode.

## Report interpreted

The workplace report described this chain:

```text
Formly Contract config
  -> broad application barrel
  -> partially compiled Angular dependency
  -> ɵɵngDeclareFactory during module evaluation
  -> no global Angular compiler facade
  -> JIT compiler error before form discovery
```

That causal chain is correct. Angular's partial-declaration helpers synchronously
request the compiler facade while class static initializers run. Angular core's
error recommends the Linker as the ideal treatment and explicitly allows a
manual `import '@angular/compiler'` fallback. Importing the compiler publishes
the process-global facade used by those helpers.

Several broader claims in the report need narrowing:

- This is not simply "Node versus browser." It is direct module evaluation that
  bypasses the Angular build/linker without first installing the JIT facade.
- Standard Angular CLI workspaces normally include the compiler, but custom and
  package-based workspaces are not guaranteed to expose it from every package.
- The preload fixes partial declarations. It does not fix missing aliases,
  browser globals, asset loaders, external templates, package export errors,
  initializers, or arbitrary top-level effects.
- Loading the compiler compiles Angular declaration/template metadata into
  executable definitions. It does not by itself instantiate components, render
  templates, or run change detection.
- Contract determinism still depends on the imported config and barrel graph;
  those modules remain trusted executable code.
- The measured cost is environment- and graph-dependent. It is not a fixed
  Angular guarantee.
- Existing shims and dedicated tsconfig files should be removed only after each
  one is shown to address this JIT error rather than another loading problem.

## Official Angular model

Angular Package Format libraries are published in partial compilation mode.
Angular normally finishes that compilation during an application build. For a
non-CLI build pipeline, Angular documents the
`@angular/compiler-cli/linker/babel` plugin as the supported build-time linker.
This is the preferred application build path and produces AOT-ready code.

Runtime JIT is a supported fallback for this controlled design-time tool. Angular
documents importing `@angular/compiler` when JIT is required outside the CLI,
and Angular 20.3.29's own missing-facade diagnostic names the same fallback. It
is not the production deployment recommendation.

The exact 20.3.29 implementation matters:

- partial-declaration calls synchronously request `ng.ɵcompilerFacade`;
- the compiler entry point intentionally publishes that global facade;
- the compiler entry point is declared side-effectful; and
- Angular core declares the compiler as an optional, exact-version peer.

Those facts explain both why preloading works and why Formly Contract must use
the consumer's compatible compiler rather than carrying an unrelated copy.

## Controlled evidence

The spike used Node 22.22.1, pnpm 10.23.0, Jiti 2.7.0, Angular 20.3.29, and the
repository's existing monorepo fixtures. Each behavioral case ran in a fresh
process. The retained harness is
`scripts/research/angular-jit-config-loading.mjs`; its primary inputs are:

- `fixtures/angular-monorepo/libs/formly-kit/src/index.ts`;
- `fixtures/nx-workspace/libs/forms-kit/src/index.ts`; and
- `fixtures/nx-workspace/tsconfig.json`.

| Case | Result |
| --- | --- |
| Native import of `@ngx-formly/core` without compiler | Failed at partially compiled `PlatformLocation` |
| Native compiler import, then Formly import | Passed |
| Jiti import of the maintained Angular `formly-kit` barrel without compiler | Failed with the same Angular error |
| Config-anchored Jiti compiler preload, then the same barrel | Passed |
| Bare compiler import from `packages/workspace` | Failed with `ERR_MODULE_NOT_FOUND` |
| Config-anchored compiler preload in the Nx fixture without its tsconfig | Advanced to an unresolved Nx path alias |
| Config-anchored compiler preload plus the Nx fixture `tsconfig.json` | Passed |
| Config source imports compiler first, then the browser barrel | Passed |
| Config source imports browser barrel first, then compiler | Failed before compiler evaluation |

The Nx result is important: runtime bootstrap and workspace resolution are
complementary layers. The existing `tsconfigPath` support is still needed for
source aliases even when Angular JIT is available.

Seven fresh-process runs produced these medians in the experiment environment:

| Operation | Median |
| --- | ---: |
| Simple TypeScript config through Jiti | 72.4 ms |
| Compiler import itself | 28.4 ms |
| Compiler plus Angular config through Jiti | 192.9 ms |

The full Angular path was about 120 ms slower than the simple config path in
this fixture. This is an indicative startup sanity measurement with a small
sample, not a performance commitment or benchmark. Workplace dependency graphs
can be substantially different.

## Why loader-relative native import is wrong

Node resolves a bare module specifier relative to the importing module. pnpm's
layout intentionally makes declared dependencies and compatible peers visible
to a package; an Angular dependency installed in a sibling application is not a
package contract for `@formly-contract/workspace`.

This repository proves the distinction directly:

```text
packages/workspace -> import('@angular/compiler')       -> not found
fixture config     -> config-anchored Jiti resolution  -> Angular 20.3.29
```

An optional peer on its own would document compatibility, but it would not make
a compiler installed only in an unrelated sibling project visible. An ordinary
dependency on the workspace package would be worse: it could load a compiler
that does not match the Angular core in the user's imported graph.

Do not rely on hoisting, `NODE_PATH`, arbitrary `node_modules` scanning, or a
TypeScript path alias to bridge this boundary. TypeScript paths do not establish
runtime package dependencies, and a config alias must not be allowed to replace
the framework compiler used for bootstrapping.

## Recommended architecture

### Two-stage workspace loading

The runner must load the root config before it knows which project configs
exist. The supported composition is therefore:

```text
stage 1: parent/root discovery (Node-safe by default)
  -> validate root policy
  -> expand project config globs without importing those configs
  -> build validated, serializable project execution requests
stage 2: one fresh child process per project config
  -> preflight project runtime packages
  -> bootstrap Angular when selected
  -> load the project config with its effective source-alias tsconfig
  -> inventory source/form identities and pause
stage 3: parent validation and compile command
  -> reject cross-project duplicate identities before any form factory runs
  -> ask surviving workers to compile
  -> validate and canonically aggregate their serializable results
  -> publish content-addressed artifacts and commit the index last
```

The default root config remains dependency-light and must not import Angular
browser barrels. A root-scoped Angular preset may later load that root config in
its own short-lived process. Its reservation applies only to the root import
graph; isolated project workers may still use different Angular versions. A root
config that itself reaches multiple Angular copies remains unsupported.

Bootstrap selection cannot be read from the executable config that needs the
bootstrap. It must come from a trusted CLI preset, programmatic runner option,
or future Nx executor. Config plugin data may name a host policy, but it cannot
supply or replace executable host-module URLs.

The pre-load request must carry every fact needed before project config
evaluation. An illustrative shape is:

```ts
interface ProjectExecutionRequest {
  readonly protocolVersion: '1';
  readonly operation: 'inventory' | 'generate' | 'check';

  // Local IPC only; never enters portable artifacts.
  readonly workspaceRoot: string;
  readonly runtimeHost?: RuntimeHostModuleDescriptor;

  // Canonical workspace-relative paths.
  readonly rootConfigPath: string;
  readonly configPath: string;
  readonly projectRoot: string;
  readonly runtimeResolutionBase: string;
  readonly tsconfigPath?: string;

  readonly rootPolicy: SerializableResolvedRootPolicy;
  readonly cliOverrides?: WorkspaceCliOverrides;
  readonly explain?: boolean;
}

interface RuntimeHostModuleDescriptor {
  readonly protocolVersion: '1';
  readonly id: string;
  readonly version: string;
  readonly moduleUrl: string;
  readonly exportName: 'createWorkspaceRuntimeHost';
  readonly options?: JsonValue;
}
```

Protocol version `1` is strict and package-lockstep. It identifies the IPC
shape shipped by one exact `@formly-contract/workspace` release; it is not an
independent compatibility promise between separately upgraded parents,
workers, or custom worker modules. Unknown keys are rejected, so a custom
worker must be compiled and tested against the exact parent package version.

`projectId` and `sourceIds` are intentionally absent because they are unknown
until the child evaluates the project config. The generic defaults are the
project config directory for `projectRoot` and `runtimeResolutionBase`, then the
root `tsconfigPath` when supplied. A versioned root-config override keyed by an
exact project config path may set `projectRoot`, `runtimeResolutionBase`, or
`tsconfigPath` for centralized configs and per-package tsconfigs. Precedence is:
an explicit project override, then the root default, then absence. A future Nx
executor supplies Nx's authoritative project root and tsconfig through the same
DTO. All paths are revalidated against the canonical workspace root in both
parent and child.

The worker boundary contains the entire trusted project execution, not only the
initial import. Project configs expose factories and registries that cannot
cross IPC safely. The worker loads once, returns inventory, waits for the parent
to approve compilation, then returns JSON-safe artifact drafts and exits. On any
failure the parent terminates and awaits all workers and publishes nothing.

### Generic workspace bootstrap seam

There are two separate contracts: a serializable parent/child descriptor and a
local in-child host interface. Callbacks never cross IPC. The child imports the
already parent-resolved `file:` module URL, validates its protocol/id/version and
named factory, and constructs the host locally. That host receives a constrained
workspace-owned context similar to:

```ts
interface RuntimePackageResolution {
  readonly specifier: string;
  readonly entryUrl: string;
  readonly packageJsonUrl: string;
}

interface WorkspaceRuntimeBootstrapContext {
  readonly configPath: string;
  readonly runtimeResolutionBase: string;
  resolveRuntimePackage(
    specifier: string,
  ): Promise<RuntimePackageResolution | undefined>;
  readRuntimePackageMetadata(
    resolution: RuntimePackageResolution,
  ): Promise<Readonly<Record<string, unknown>>>;
  importResolvedRuntime(resolution: RuntimePackageResolution): Promise<unknown>;
}

interface WorkspaceRuntimeBootstrap {
  readonly id: string;
  readonly version: string;
  beforeConfigLoad(
    context: WorkspaceRuntimeBootstrapContext,
  ): Promise<void>;
}
```

This is illustrative, not a committed public API. The important properties are:

- bootstrap selection happens before config evaluation;
- executable host URLs come from the trusted wrapper/registry, never config;
- resolution is anchored at the explicit project runtime base;
- **workspace code owns runtime-package resolution** and never applies config
  `paths` aliases to framework packages;
- the existing alias-aware Jiti instance remains responsible for the config;
- the worker rejects any inherited tsconfig path rule that can match reserved
  `@angular/core` or `@angular/compiler` specifiers before creating Jiti;
- resolved native imports are cached by absolute URL only inside one worker;
- bootstrap failure is never swallowed; and
- a failed or possibly contaminated worker is discarded rather than reused.

Formly Contract must not explicitly implement a "fail, load compiler, retry"
path. Modules that ran before the initial failure could otherwise execute
top-level effects a second time. Jiti may itself retry a failed native load by
transforming the module, so the Angular preset must mark core/compiler as
`nativeModules` and retain a regression proving a rejected native runtime is not
transformed. Any failed project-load process is poisoned and its output is
discarded.

### Angular integration ownership

Package ownership is explicit:

- make `@formly-contract/workspace` publishable; expose runtime-host/IPC
  contracts from a Node-specific subpath and CLI composition from another
  public subpath, while keeping the worker entry private but packed;
- keep the path-free provenance DTO in `@formly-contract/schema`;
- make `@formly-contract/angular` declare a mandatory compatible workspace peer
  plus a repository dev dependency so consumers cannot receive a second nested
  host-protocol copy;
- expose `@formly-contract/angular/jit` as a dependency-light wrapper with no
  static `@angular/*` import; it creates its worker descriptor relative to its
  own installed `import.meta.url`; and
- keep `@formly-contract/workspace` independent of Angular. The child imports the
  descriptor's exact module URL instead of trying to bare-resolve an undeclared
  adapter.

The intended consumer paths are explicit:

```text
pnpm add -D @formly-contract/workspace @formly-contract/angular
pnpm exec formly-contracts-angular generate
```

```ts
import { runAngularWorkspace } from '@formly-contract/angular/jit';
```

The generic `formly-contracts` CLI and `runWorkspace` API remain available for
Node-safe framework-neutral generation. A future Nx executor calls the Angular
wrapper and awaits its project processes; it never imports Angular runtime state
into the Nx daemon.

### Angular preflight and supported graph

Before importing either runtime, the Angular host resolves real package entry
and package-root paths for `@angular/core` and `@angular/compiler` from
`runtimeResolutionBase`, reads metadata, and validates:

- the deliberately supported Angular range;
- the core/compiler compatibility required by that release (exact equality for
  the Angular 20 reference line);
- that compiler resolution from the selected core context and project context
  identifies the same real package; and
- that runtime file URLs contain no query/fragment identity modifiers.

Only then may it atomically reserve the pair and import the exact compiler URL.
An ambient facade that was not installed through that reservation is rejected.
If import may have mutated global state and then throws, the process is poisoned
and exits. Concurrent bootstrap requests are idempotent only for the identical
reservation; conflicts reject before import.

The config loader must parse the fully inherited tsconfig and reject exact,
scoped wildcard, or catch-all path mappings that can match any exported
`@angular/core` or `@angular/compiler` specifier. Non-Angular aliases continue
to work. This rejection is necessary because Jiti 2.7 applies `tsconfigPaths`
before its `alias` option; injecting a trusted alias cannot override a hostile or
accidental Angular path mapping. The worker also clears Jiti-related environment
overrides, enables the module cache inside the disposable worker, and configures
core/compiler as native modules so a failed native import cannot silently fall
back to Jiti transformation. A retained test must prove the chosen scoped-native
rule also covers the Angular packages reached by the representative graph.

These defenses still do not prove the complete transitive graph. Node 22.13's
asynchronous module hooks do not cover every `createRequire()` path Jiti uses,
and Jiti resolves some specifiers before Node sees them. V1 therefore requires a
peer-correct graph and excludes custom loaders, `--preserve-symlinks`, absolute
alternate Angular imports, bundled/private Angular copies, and configs that
create their own loaders. A retained fixture with a transitive private copy must
demonstrate this limitation. Whole-graph URL auditing remains a later spike that
may require raising the minimum Node version; the first release must not call
anchor validation "singleton enforcement."

The Angular/Formly peer shape remains an install-matrix gate. Since a
dependency-light root may have Angular only in project packages, package-level
framework peers likely need to be optional while runtime preflight is strict.
An optional peer suppresses an install error; it does not make a project runtime
visible.

### Portable provenance

Portable generation provenance should include canonical, non-secret identities,
for example:

```ts
interface RuntimeHostProvenance {
  readonly schemaVersion: string;
  readonly adapter: {
    readonly id: '@formly-contract/angular-jit';
    readonly version: string;
    readonly mode: 'jit';
  };
  readonly framework: {
    readonly name: 'angular';
    readonly coreVersion: string;
    readonly compilerVersion: string;
    readonly formlyVersion: string;
  };
  readonly dependencySnapshot: {
    readonly kind: 'pnpm-lock';
    readonly workspaceRelativePath: string;
    readonly sha256: string;
  };
}
```

The workspace index/toolchain provenance also records exact
workspace/compiler/schema versions, worker protocol version, Jiti version and
canonical loader options, exact Node version plus platform/architecture, and the
versioned execution profile. Relevant host and lock digests enter each project
configuration hash; the root hash incorporates project hashes. Snapshot package
metadata/lockfiles before workers and recheck before publication so a mid-run
change aborts rather than committing mixed evidence.

Absolute package paths, adapter module URLs, PIDs, timings, temporary paths,
completion order, raw environment, and sandbox executable paths never enter
portable output. The lock digest is deliberately conservative declared-lock
provenance, not installed-byte attestation. Manual node_modules tampering and
runtime content attestation remain out of scope.

### Isolation profiles

A fresh child process contains the Angular facade, Jiti/Node module caches,
crashes, timeouts, and failed-import contamination. It is not by itself a
network or hostile-code sandbox. On the supported Node 22 line, the stable
Permission Model restricts filesystem/child/worker/addon/WASI capabilities but
does not restrict networking and is documented as a trusted-code seat belt.

Define two honest execution profiles:

- `trusted-local-v1`: direct `process.execPath` with argument arrays, a scrubbed
  allowlisted environment, schema-validated IPC inputs, no final-output write
  authority, and Node permission guardrails where compatible. It records
  `network: not-enforced` and never claims offline isolation.
- `isolated-ci-v1`: the same worker under a configured external
  container/runner/network namespace. It fails closed with
  `WORKER_ISOLATION_UNAVAILABLE` if the provider cannot attest the requested
  policy. Only this profile may record network denial.

Do not pass `NODE_OPTIONS`, `NODE_PATH`, home-directory variables, or credential
environment values. Synthetic context and approved non-secret inputs travel by
validated IPC and enter relevant hashes. A trusted config with workspace read
access can still read files such as `.env`; call this environment scrubbing, not
total environment isolation.

### Monorepo behavior

Current Nx supports both package-manager workspace linking and TypeScript path
aliases. It no longer treats "integrated" and "package-based" as rigid repository
classes; projects can combine Nx features and configuration styles. Formly
Contract should therefore model two resolution planes instead of trying to
classify the entire repository:

```text
runtime packages (@angular/*)  -> package-manager/Node dependency graph
source aliases (@work/forms)   -> project/root tsconfig when configured
```

For a single-version Nx workspace with one root manifest, project-config
resolution normally finds the root compiler through the package-manager graph.
This is the low-friction path, but it is still verified rather than assumed.

For a package-based monorepo with per-project manifests, resolve from the
descriptor's project/runtime base. The generic default is the project config
directory; an exact root override handles centralized configs, and Nx supplies
its authoritative project root later. The effective tsconfig follows project
override, root default, then absent. A compiler installed only in one sibling
application must not be silently discovered for another sibling.

Keep the root discovery config dependency-light. Angular-heavy imports should
remain in project configs or source modules so the runner can apply the correct
project context after discovery.

A future Nx executor can use Nx's resolved project graph and project roots to
select the Angular preset and resolution base automatically. It must spawn or
delegate to the short-lived Angular worker; it must not retain compiler-facade
state inside the Nx daemon or batch projects with different runtime identities.
Dependency or lockfile changes naturally take effect in a new worker. This is a
delight layer over the generic workspace contract; Nx is not a prerequisite for
the base workspace package.

If one repository contains multiple Angular versions or physically distinct
copies of the same version, the per-project worker boundary already keeps them
in separate child processes. A first implementation should conservatively
reject a second **observed or anchor-resolved** core/compiler URL inside one
worker even when public versions match. It cannot claim it observes every
transitive Jiti resolution, so a private/bundled Angular copy violates the v1
peer-correct precondition. Grouping projects by an identical runtime may be
considered later as a measured optimization, not as the initial correctness
boundary.

### Parent aggregation and publication

Workers have no authority to write final artifacts. Each worker loads once,
returns inventory, waits for the parent to reject global duplicates, then
compiles only after approval. The parent cancels and awaits every child on any
failure, validates and re-hashes every IPC result, and sorts by canonical
config/project/source/form keys rather than completion order.

Keep the current content-addressed-artifact plus manifest-last publication
model. Hold a single-writer generation lock from discovery through index commit,
write immutable artifacts through temp-plus-rename, and atomically replace the
workspace index last as the visibility commit marker. This is atomic reader
visibility, not a cross-file transaction or power-loss durability guarantee. A
late filesystem failure can leave unreferenced artifacts while the prior index
remains authoritative; cleanup plus an idempotent rerun is the documented
recovery. A worker failure occurs before publication and therefore leaves no
output change.

### Diagnostic-only bridge

For diagnosis, an Angular workspace can temporarily put this before any
browser-barrel imports in the relevant config module:

```ts
import '@angular/compiler';
```

This is a verified way to confirm the missing-facade diagnosis when that
config's dependency context contains the matching compiler. It is not a
supported deterministic generation mode: the compiler choice bypasses runtime
preflight and provenance, and import order becomes an unrecorded input. Do not
remove shims or publish contracts based only on this bridge. A process-level
Node `--import` has the same provenance and project-awareness problems.

## Options considered

| Option | Result | Reason |
| --- | --- | --- |
| Unconditional native import in `workspace` | Reject | Wrong resolution base today; crosses package boundary; version risk |
| Bundle a compiler with `workspace` | Reject | Can diverge from consumer Angular; makes generic discovery Angular-runtime dependent |
| Opportunistically auto-preload whenever a compiler is visible | Defer | Technically works, but adds implicit global state and hides the runtime boundary |
| First import in each config | Diagnostic only | Confirms the failure class, but bypasses preflight/provenance and is order-dependent |
| Publishable workspace host plus Angular-owned wrapper/worker | Adopt | Serializable composition, correct dependency direction, project-relative resolution |
| Embed the Angular linker in Jiti | Future research | A supported AOT treatment, but requires a Babel dependency transform, caching, and source maps |
| Claim whole-graph singleton from anchor preflight | Reject | Jiti/Node 22 resolution paths are not completely observable; require peer-correct graph |
| Node module hook as the v1 proof | Defer | Node 22.13 async hooks miss createRequire paths and Jiti can transform after native failure |
| Node-safe contracts entry points only | Keep as baseline/fallback | Lowest side-effect surface and still required for non-JIT barrel failures |
| Per-project short-lived worker | Adopt for supported generation | Contains global facade/cache state and carries non-serializable project execution |

## Failure and diagnostic contract

The implementation should distinguish at least these stable cases:

- `ANGULAR_COMPILER_NOT_FOUND`: Angular JIT was requested but the compiler is
  not resolvable from the selected config/project;
- `ANGULAR_COMPILER_IMPORT_FAILED`: the compiler resolved but failed during
  import, and the worker must be discarded;
- `ANGULAR_VERSION_MISMATCH`: compiler/core versions are incompatible,
  unsupported, or cannot be verified before import;
- `ANGULAR_RUNTIME_CONFLICT`: an ambient, different-version, or different-URL
  Angular runtime is already reserved or observed in the process;
- `ANGULAR_RUNTIME_GRAPH_UNSUPPORTED`: the project violates a checkable v1
  peer-correct-graph precondition;
- `RUNTIME_PACKAGE_ALIAS_FORBIDDEN`: the inherited tsconfig can map a reserved
  Angular runtime specifier;
- `RUNTIME_HOST_UNAVAILABLE` or `WORKER_PROTOCOL_INVALID`: the selected trusted
  host cannot be instantiated through the versioned IPC contract;
- `WORKER_ISOLATION_UNAVAILABLE`: an isolated profile was requested but its
  external provider cannot enforce it;
- `WORKSPACE_CHANGED_DURING_GENERATION`: package metadata or the selected
  lockfile changed between preflight and publication;
- `GENERATION_IN_PROGRESS`: another writer already holds the output-generation
  lock; and
- the existing `CONFIG_LOAD_FAILED`: bootstrap succeeded but config loading
  failed for an unrelated alias, package, browser-global, or application effect.

Diagnostics should identify a workspace-relative config path and resolution
scope without dumping home directories or absolute dependency graphs in normal
CLI output. Debug output can retain redacted resolved URLs and the original
error as a cause. Do not convert every `CONFIG_LOAD_FAILED` into an Angular
compiler suggestion after bootstrap has already succeeded.

## Implementation slices

### Slice 0: Contract promotion and retained evidence

- Keep the no-network behavior harness and exact fixture inputs in the
  repository; add the retained Jiti resolution-order/native-fallback spike.
- Promote the accepted boundaries into the architecture overview and detailed
  implementation plan before code depends on them.
- Version the path-free runtime/toolchain provenance DTO and workspace index.
- Decide the Angular/Formly peer metadata with a strict pnpm install matrix.

### Slice 1: Publishable host protocol and project descriptors

- Make `@formly-contract/workspace` publishable with runtime-host and CLI
  composition subpaths plus packed-worker coverage.
- Add validated IPC DTOs, parent-selected file-module descriptors, worker result
  schemas, stable diagnostics, and no absolute paths in normal output.
- Add exact per-project loader overrides for `projectRoot`,
  `runtimeResolutionBase`, and `tsconfigPath`; define and test precedence.
- Snapshot canonical toolchain/lock provenance and add the single-writer
  generation lock.

### Slice 2: Defer project evaluation into workers

- Split root discovery before the current project-load loop; stage one must not
  import any project config.
- Add one fresh process per project with inventory/approve/compile phases. Keep
  every live config, factory, registry, and Angular object in that process.
- Use a scrubbed environment, no shell, validated IPC, no final-output write
  authority, timeouts, and `trusted-local-v1` provenance.
- Aggregate only after all inventories/results validate; sort independently of
  completion order, reject global duplicates before factories, recheck the
  dependency snapshot, then publish index-last.

### Slice 3: Angular JIT wrapper and guarded preload

- Scaffold `@formly-contract/angular` with a mandatory compatible workspace peer
  and a dependency-light `./jit` wrapper/binary; do not add Angular dependencies
  to schema/compiler/workspace.
- Add alias-free realpath/package-metadata preflight, core-context compiler
  agreement, exact version validation, atomic reservation, native core/compiler
  loading, reserved-tsconfig-path rejection, and failure poisoning.
- State and test the peer-correct graph contract. Keep a private-copy fixture as
  an explicit unsupported case instead of claiming whole-graph enforcement.
- Prove packed, non-hoisted CLI and programmatic consumers with compiler visible
  only from a project dependency context.

### Slice 4: Isolated CI and Nx delight layers

- Define an external sandbox-provider contract for `isolated-ci-v1`; fail closed
  when network denial is requested but unavailable.
- Let a future Nx executor supply authoritative project roots/tsconfigs and call
  the Angular wrapper without retaining compiler state in the daemon.
- Preserve one workspace-wide parent and one index-last publication. The first
  Nx integration exposes one aggregate target on a configured coordinator
  project; its worker children remain per project, but Nx does not publish one
  independent result per project.
- Treat per-project Nx cache shards as a separate future protocol problem: they
  cannot precede factories without either a two-run inventory barrier or a
  persistent coordinator, and they must not weaken global duplicate validation.
- Evaluate whether the Babel Linker/AOT path can replace JIT for selected graphs.

### Slice 5: Workplace shim audit

- Catalog each existing contracts shim or dedicated tsconfig and the failure it
  currently avoids.
- Rerun the workplace graph through the productized worker.
- Remove shims one at a time only when the generated contract and targeted
  regression prove they are redundant.

## Required regression matrix

- stage-one discovery expands and validates project paths without evaluating a
  project module;
- packed and workspace-linked consumers, including pnpm `hoist: false`;
- integrated Nx root dependencies, per-project manifests, a dependency-light
  root, centralized configs, and two projects with different tsconfigs;
- exact project override > root default > absent path precedence;
- traversal, symlink escape, invalid protocol, non-file host URL, malformed IPC,
  timeout, and host-version mismatch fail before publication;
- plain non-Angular config with no compiler remains loadable;
- importing `@formly-contract/angular/jit` with no root Angular install remains
  loadable and selects the packed private worker by parent-resolved URL;
- compiler absent plus Angular partial import produces targeted guidance;
- compiler present plus a real partially compiled barrel succeeds;
- present-but-broken compiler failure is not swallowed;
- compiler/core exact-version mismatch is rejected before compiler import;
- project-context and core-context compiler paths must identify the same real
  package; same-target symlinks pass and distinct physical copies reject;
- an ambient compiler facade is rejected or isolated;
- concurrent bootstrap requests reserve one runtime atomically;
- a failed compiler import poisons/discards its worker;
- exact, `@angular/*`, catch-all, and exported-subpath tsconfig mappings cannot
  redirect core/compiler; non-Angular exact/wildcard aliases still work;
- retain a pinned test proving Jiti tsconfig paths precede Jiti aliases;
- native core/compiler rejection cannot fall through to Jiti transformation;
- existing tsconfig aliases still resolve after bootstrap;
- repeated bootstrap requests for one compiler URL are idempotent inside a
  worker;
- two projects with different Angular versions are process-isolated and install
  no facade in the parent or Nx daemon;
- a transitive private-copy fixture remains rejected/unsupported and prevents a
  whole-graph singleton claim;
- ESM, CommonJS, and TypeScript configs have equivalent runtime bootstrap;
- a partially evaluated config cannot be explicitly retried, and any Jiti
  native/transform fallback behavior is captured by a side-effect counter;
- inventory from two projects with the same form/source identity rejects before
  any factory invocation and leaves the prior index unchanged;
- reversed worker completion yields byte-identical output and deterministic
  diagnostic selection;
- a late worker failure cancels/awaits peers and leaves the prior index unchanged;
- lock/tool version changes alter project/index hashes; a mid-run lock change
  aborts publication;
- trusted-local denies configured writes/child/worker access, scrubs a sentinel
  secret, and never claims network denial;
- isolated-CI proves socket/fetch denial or fails closed when its provider is
  unavailable;
- a fault during artifact promotion leaves the prior index authoritative,
  permits only unreferenced orphans, and an idempotent rerun heals them;
- concurrent generation returns `GENERATION_IN_PROGRESS` rather than allowing a
  stale last finisher to replace the index;
- a browser-global/top-level-side-effect fixture still fails after JIT, proving
  the feature does not claim universal barrel safety; and
- the strict pnpm peer/install matrix matches the documented supported Angular
  range and optional-JIT behavior.

## Sources

- [Angular 20.3.29 missing-facade behavior](https://github.com/angular/angular/blob/1bd415ee651d25cf805eac674846dd6b8e41efb2/packages/core/src/compiler/compiler_facade.ts#L23-L48)
- [Angular 20.3.29 partial-declaration runtime](https://github.com/angular/angular/blob/1bd415ee651d25cf805eac674846dd6b8e41efb2/packages/core/src/render3/jit/partial.ts#L26-L117)
- [Angular compiler entry-point initialization](https://github.com/angular/angular/blob/1bd415ee651d25cf805eac674846dd6b8e41efb2/packages/compiler/src/compiler.ts#L254-L258)
- [Angular compiler facade publication](https://github.com/angular/angular/blob/1bd415ee651d25cf805eac674846dd6b8e41efb2/packages/compiler/src/jit_compiler_facade.ts#L1051-L1054)
- [Angular compiler package side-effect declaration](https://github.com/angular/angular/blob/1bd415ee651d25cf805eac674846dd6b8e41efb2/packages/compiler/package.json#L21-L23)
- [Angular Linker guidance](https://angular.dev/tools/libraries/creating-libraries#consuming-partial-ivy-code-outside-the-angular-cli)
- [Angular Package Format partial compilation](https://angular.dev/tools/libraries/angular-package-format#partial-compilation)
- [Angular compiler modes](https://angular.dev/reference/configs/angular-compiler-options#compilationmode)
- [Angular JIT import guidance](https://angular.dev/api/platform-browser-dynamic/platformBrowserDynamic)
- [Angular CLI 20.3.29 workspace dependency template](https://github.com/angular/angular-cli/blob/fd1fa2c3d79d6a4c533f270a9d3f790eac740abf/packages/schematics/angular/workspace/files/package.json.template#L23-L36)
- [Angular core 20.3.29 compiler peer](https://github.com/angular/angular/blob/1bd415ee651d25cf805eac674846dd6b8e41efb2/packages/core/package.json#L21-L32)
- [Node 22.13 ESM resolution](https://nodejs.org/download/release/v22.13.0/docs/api/esm.html#importmetaresolvespecifier)
- [Node 22.13 process preload](https://nodejs.org/download/release/v22.13.0/docs/api/cli.html#--importmodule)
- [Node 22.13 customization hooks](https://nodejs.org/download/release/v22.13.0/docs/api/module.html#customization-hooks)
- [Node 22.13 Permission Model limits](https://nodejs.org/download/release/v22.13.0/docs/api/permissions.html)
- [Node 22.13 child-process spawning](https://nodejs.org/download/release/v22.13.0/docs/api/child_process.html#child_processspawncommand-args-options)
- [pnpm 10 dependency layout](https://pnpm.io/10.x/symlinked-node-modules-structure)
- [pnpm 10 peer resolution](https://pnpm.io/10.x/how-peers-are-resolved)
- [pnpm 10 optional peer behavior](https://pnpm.io/10.x/package_json#peerdependenciesmetaoptional)
- [TypeScript paths and monorepo packages](https://www.typescriptlang.org/docs/handbook/modules/reference.html#paths-should-not-point-to-monorepo-packages-or-node_modules-packages)
- [Jiti 2.7 programmatic API](https://github.com/unjs/jiti/blob/v2.7.0/README.md#programmatic)
- [Jiti 2.7 resolver ordering](https://github.com/unjs/jiti/blob/v2.7.0/src/resolve.ts)
- [Jiti 2.7 native/fallback evaluation](https://github.com/unjs/jiti/blob/v2.7.0/src/eval.ts)
- [Nx TypeScript project linking](https://nx.dev/docs/kb/typescript-project-linking)
- [Nx project configuration](https://nx.dev/docs/reference/project-configuration)
- [Nx repository-style guidance](https://nx.dev/docs/reference/deprecated/integrated-vs-package-based)
