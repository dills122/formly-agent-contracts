import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  REQUIRED_CHECK_IDS,
  auditRetainedReport,
  buildGateReport,
  canonicalJson,
  decideGate,
  deriveGateChecks,
  requireNonEmptyStrings,
  requireUniqueIds,
} from './lib.mjs';

function checks(status = 'pass') {
  return REQUIRED_CHECK_IDS.map((id) => ({
    id,
    status,
    reasons: [],
  }));
}

describe('LIN-0 decision semantics', () => {
  it('returns go only for a complete sanitized representative workplace slice', () => {
    expect(
      decideGate({
        slice: {
          kind: 'representative-workplace',
          sanitized: true,
        },
        checks: checks(),
      }),
    ).toEqual({
      status: 'go',
      failedChecks: [],
      missingChecks: [],
      reasons: [],
    });
  });

  it('keeps a public anchor inconclusive even when every rehearsal check passes', () => {
    expect(
      decideGate({
        slice: { kind: 'public-anchor', sanitized: true },
        checks: checks(),
      }),
    ).toEqual({
      status: 'inconclusive',
      failedChecks: [],
      missingChecks: [],
      reasons: ['REPRESENTATIVE_WORKPLACE_SLICE_REQUIRED'],
    });
  });

  it('keeps missing evidence inconclusive and reports it in code-unit order', () => {
    const incomplete = checks();
    incomplete.find((check) => check.id === 'scale-budgets').status = 'missing';
    incomplete.find((check) => check.id === 'lazy-feature-topology').status =
      'missing';

    expect(
      decideGate({
        slice: {
          kind: 'representative-workplace',
          sanitized: true,
        },
        checks: incomplete.reverse(),
      }),
    ).toEqual({
      status: 'inconclusive',
      failedChecks: [],
      missingChecks: ['lazy-feature-topology', 'scale-budgets'],
      reasons: ['REQUIRED_EVIDENCE_MISSING'],
    });
  });

  it('returns no-go for an observed stop condition on a representative slice', () => {
    const failed = checks();
    failed.find((check) => check.id === 'symbol-conventions').status = 'fail';
    failed.find((check) => check.id === 'symbol-conventions').reasons = [
      'WRONG_UNIQUE_SYMBOL_MATCH',
    ];

    expect(
      decideGate({
        slice: {
          kind: 'representative-workplace',
          sanitized: true,
        },
        checks: failed,
      }),
    ).toEqual({
      status: 'no-go',
      failedChecks: ['symbol-conventions'],
      missingChecks: [],
      reasons: ['WRONG_UNIQUE_SYMBOL_MATCH'],
    });
  });

  it('does not turn failed synthetic evidence into a workplace no-go', () => {
    const failed = checks();
    failed.find((check) => check.id === 'symbol-conventions').status = 'fail';
    failed.find((check) => check.id === 'symbol-conventions').reasons = [
      'WRONG_UNIQUE_SYMBOL_MATCH',
    ];

    expect(
      decideGate({
        slice: { kind: 'public-anchor', sanitized: true },
        checks: failed,
      }),
    ).toEqual({
      status: 'inconclusive',
      failedChecks: ['symbol-conventions'],
      missingChecks: [],
      reasons: [
        'REPRESENTATIVE_WORKPLACE_SLICE_REQUIRED',
        'WRONG_UNIQUE_SYMBOL_MATCH',
      ],
    });
  });
});

describe('LIN-0 retained output', () => {
  it('serializes object keys and set-like arrays deterministically', () => {
    const left = {
      checks: [
        { id: 'z', reasons: ['z', 'a'] },
        { id: 'a', reasons: ['b', 'a'] },
      ],
      slice: { id: 'anchor', kind: 'public-anchor' },
    };
    const right = {
      slice: { kind: 'public-anchor', id: 'anchor' },
      checks: [
        { reasons: ['a', 'b'], id: 'a' },
        { reasons: ['a', 'z'], id: 'z' },
      ],
    };

    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(canonicalJson(left).endsWith('\n')).toBe(true);
  });

  it('rejects absolute paths and source-shaped retained fields', () => {
    expect(
      auditRetainedReport({
        decision: { status: 'inconclusive' },
        evidence: { sourceText: 'createPrivateForm(secret)' },
        hostPath: '/Users/example/work/customer/src/form.ts',
      }),
    ).toEqual([
      'DISALLOWED_RETAINED_FIELD:evidence.sourceText',
      'DISALLOWED_RETAINED_FIELD:hostPath',
      'ABSOLUTE_PATH_RETAINED:hostPath',
    ]);
  });

  it('rejects duplicate evidence identities and empty bundle probes', () => {
    expect(() =>
      requireUniqueIds([{ id: 'same' }, { id: 'same' }], 'sample'),
    ).toThrow('Duplicate sample id');
    expect(() => requireNonEmptyStrings([], 'bundle literals')).toThrow(
      'must contain non-empty strings',
    );
  });
});

describe('LIN-0 public anchor rehearsal', () => {
  it('reproduces exact direct fixture calls without claiming workplace coverage', async () => {
    const report = await buildGateReport(
      new URL('./anchor.input.json', import.meta.url),
    );

    expect(report.decision.status).toBe('inconclusive');
    expect(report.decision.reasons).toContain(
      'REPRESENTATIVE_WORKPLACE_SLICE_REQUIRED',
    );
    expect(report.measurements.programs).toEqual([
      expect.objectContaining({
        configuredRootFileCount: 46,
        diagnosticCount: 0,
        id: 'anchor-angular-program',
        leaf: false,
        projectReferenceCount: 0,
      }),
    ]);
    expect(report.measurements.symbolProbes).toHaveLength(4);
    expect(
      report.measurements.symbolProbes.every(
        (probe) => probe.outcome === 'exact',
      ),
    ).toBe(true);
    expect(
      Object.fromEntries(report.checks.map((check) => [check.id, check.status])),
    ).toEqual({
      'bundle-source-isolation': 'missing',
      'cross-program-ordering-overlap': 'missing',
      'declaration-source-redirects': 'missing',
      'lazy-feature-topology': 'missing',
      'leaf-tsconfig-selection': 'missing',
      'privacy-disclosure': 'pass',
      'project-references': 'missing',
      'scale-budgets': 'missing',
      'symbol-conventions': 'missing',
    });
    expect(auditRetainedReport(report)).toEqual([]);
  }, 30_000);

  it('observes path aliases, barrels, renamed imports, namespaces, classes, and callable consts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lin-0-probe-'));
    try {
      await mkdir(join(root, 'src'));
      await writeFile(
        join(root, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            noEmit: true,
            paths: { '@forms/*': ['src/*'] },
            strict: true,
            target: 'ES2022',
          },
          include: ['src/**/*.ts'],
        }),
      );
      await writeFile(
        join(root, 'src/forms.ts'),
        [
          'export function Direct() { return []; }',
          'export const Callable = () => [];',
          'export class FormClass {}',
        ].join('\n'),
      );
      await writeFile(
        join(root, 'src/index.ts'),
        "export { Direct as AliasDirect } from './forms.js';\n",
      );
      await writeFile(
        join(root, 'src/usage.ts'),
        [
          "import { AliasDirect as LocalDirect } from '@forms/index';",
          "import * as Forms from '@forms/forms';",
          'LocalDirect();',
          'Forms.Callable();',
          'new Forms.FormClass();',
        ].join('\n'),
      );
      await writeFile(
        join(root, 'src/router.ts'),
        'export function provideRouter(routes) { return routes; }\n',
      );
      await writeFile(
        join(root, 'src/routes.ts'),
        [
          "import { provideRouter } from './router.js';",
          "const unrelated = { loadChildren: () => import('./forms.js') };",
          'void unrelated;',
          'provideRouter([',
          "  { path: 'lazy', loadChildren: () => import('./forms.js') },",
          ']);',
        ].join('\n'),
      );

      const baseProbe = {
        observationId: 'observation',
        programId: 'program',
        expected: { resolution: 'exact' },
      };
      const input = {
        schemaVersion: '1.0.0',
        slice: {
          id: 'test-anchor',
          kind: 'public-anchor',
          root: '.',
          sanitized: true,
          snapshotId: 'synthetic-test-only',
        },
        programSelection: { inventoryComplete: false },
        programs: [
          {
            id: 'program',
            leaf: false,
            projectId: 'test-project',
            purpose: 'anchor',
            tsconfig: 'tsconfig.json',
          },
        ],
        symbolProbes: [
          {
            ...baseProbe,
            id: 'renamed-barrel',
            observationId: 'renamed-barrel',
            invocation: {
              callee: 'LocalDirect',
              file: 'src/usage.ts',
              kind: 'call',
              occurrence: 1,
            },
            expected: {
              conventions: ['aliased-import', 'barrel', 'path-alias'],
              declaration: {
                file: 'src/forms.ts',
                kind: 'function',
                name: 'Direct',
              },
              resolution: 'exact',
            },
          },
          {
            ...baseProbe,
            id: 'namespace-callable',
            observationId: 'namespace-callable',
            invocation: {
              callee: 'Forms.Callable',
              file: 'src/usage.ts',
              kind: 'call',
              occurrence: 1,
            },
            expected: {
              conventions: ['namespace-import', 'path-alias'],
              declaration: {
                file: 'src/forms.ts',
                kind: 'callable-const',
                name: 'Callable',
              },
              resolution: 'exact',
            },
          },
          {
            ...baseProbe,
            id: 'namespace-class',
            observationId: 'namespace-class',
            invocation: {
              callee: 'Forms.FormClass',
              file: 'src/usage.ts',
              kind: 'construct',
              occurrence: 1,
            },
            expected: {
              conventions: ['namespace-import', 'path-alias'],
              declaration: {
                file: 'src/forms.ts',
                kind: 'class',
                name: 'FormClass',
              },
              resolution: 'exact',
            },
          },
        ],
        crossProgramJoins: [],
        overlapCases: [],
        routeScan: {
          complete: true,
          programIds: ['program'],
          registrations: [
            {
              id: 'registered-router-call',
              programId: 'program',
              file: 'src/routes.ts',
              callee: 'provideRouter',
              occurrence: 1,
              expectedDeclaration: {
                file: 'src/router.ts',
                name: 'provideRouter',
              },
            },
          ],
        },
        conventionInventory: {
          complete: true,
          counts: {
            directExportCallableConst: 1,
            directExportClass: 1,
            directExportFunction: 1,
            exportListOnly: 0,
            inlineOrWrapper: 0,
            other: 0,
          },
          enumeratedRootCount: 3,
        },
        privacy: {
          disclosureMode: 'module-only',
          retainCallArguments: false,
          retainEnvironment: false,
          retainObservedUrls: false,
          retainRouteTemplates: false,
          retainSourceText: false,
        },
      };
      await writeFile(join(root, 'input.json'), JSON.stringify(input));

      const report = await buildGateReport(join(root, 'input.json'));
      expect(report.measurements.symbolProbes).toEqual([
        expect.objectContaining({
          id: 'namespace-callable',
          declarationKind: 'callable-const',
          conventions: ['namespace-import', 'path-alias'],
          outcome: 'exact',
        }),
        expect.objectContaining({
          id: 'namespace-class',
          declarationKind: 'class',
          conventions: ['namespace-import', 'path-alias'],
          outcome: 'exact',
        }),
        expect.objectContaining({
          id: 'renamed-barrel',
          declarationKind: 'function',
          conventions: ['aliased-import', 'barrel', 'path-alias'],
          outcome: 'exact',
        }),
      ]);
      expect(report.measurements.lazyRoutes).toEqual(
        expect.objectContaining({
          literalLazyRouteCount: 1,
          registrationExactCount: 1,
          registrationMismatchCount: 0,
          registrationUnresolvedCount: 0,
        }),
      );
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }, 30_000);

  it('observes project-reference source redirects, declaration outputs, deduplication, and conflicts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lin-0-programs-'));
    try {
      await mkdir(join(root, 'lib/src'), { recursive: true });
      await mkdir(join(root, 'lib/dist'), { recursive: true });
      await writeFile(
        join(root, 'lib/src/forms.ts'),
        'export function Target() { return []; }\n',
      );
      await writeFile(
        join(root, 'lib/src/index.ts'),
        "export { Target } from './forms.js';\n",
      );
      await writeFile(
        join(root, 'lib/dist/index.d.ts'),
        'export declare function Target(): never[];\n',
      );
      await writeFile(
        join(root, 'alternative.ts'),
        "export function Target() { return ['alternative']; }\n",
      );
      await writeFile(
        join(root, 'usage.ts'),
        "import { Target } from '@lib';\nTarget();\n",
      );
      await writeFile(
        join(root, 'lib/tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            composite: true,
            declaration: true,
            module: 'ESNext',
            moduleResolution: 'Bundler',
            outDir: '../dist',
            rootDir: 'src',
            target: 'ES2022',
          },
          include: ['src/**/*.ts'],
        }),
      );

      const consumerConfig = (mapping, references = undefined) => ({
        compilerOptions: {
          baseUrl: '.',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          noEmit: true,
          paths: { '@lib': [mapping] },
          target: 'ES2022',
        },
        files: ['usage.ts'],
        ...(references === undefined ? {} : { references }),
      });
      await writeFile(
        join(root, 'tsconfig.source-a.json'),
        JSON.stringify(
          consumerConfig('lib/src/index.ts', [{ path: './lib/tsconfig.json' }]),
        ),
      );
      await writeFile(
        join(root, 'tsconfig.source-b.json'),
        JSON.stringify(consumerConfig('lib/src/index.ts')),
      );
      await writeFile(
        join(root, 'tsconfig.declaration.json'),
        JSON.stringify(consumerConfig('lib/dist/index.d.ts')),
      );
      await writeFile(
        join(root, 'tsconfig.conflict.json'),
        JSON.stringify(consumerConfig('alternative.ts')),
      );

      const program = (id, tsconfig) => ({
        id,
        projectId: id,
        purpose: 'application',
        leaf: true,
        tsconfig,
      });
      const probe = (id, programId, declarationFile) => ({
        id,
        observationId: 'shared-callsite',
        programId,
        invocation: {
          callee: 'Target',
          file: 'usage.ts',
          kind: 'call',
          occurrence: 1,
        },
        expected: {
          conventions: ['path-alias'],
          portableAnchorId: 'target-anchor',
          declaration: {
            file: declarationFile,
            kind: 'function',
            name: 'Target',
          },
          resolution: 'exact',
        },
      });
      const input = {
        schemaVersion: '1.0.0',
        slice: {
          id: 'program-test-anchor',
          kind: 'public-anchor',
          root: '.',
          sanitized: true,
          snapshotId: 'synthetic-test-only',
        },
        programSelection: { inventoryComplete: true },
        programs: [
          {
            ...program('source-a', 'tsconfig.source-a.json'),
            useSourceOfProjectReferenceRedirect: true,
          },
          program('source-disabled', 'tsconfig.source-a.json'),
          program('source-b', 'tsconfig.source-b.json'),
          program('declaration', 'tsconfig.declaration.json'),
          program('conflict', 'tsconfig.conflict.json'),
        ],
        symbolProbes: [
          probe('source-a-probe', 'source-a', 'lib/src/forms.ts'),
          probe(
            'source-disabled-probe',
            'source-disabled',
            'lib/src/forms.ts',
          ),
          probe('source-b-probe', 'source-b', 'lib/src/forms.ts'),
          probe(
            'declaration-probe',
            'declaration',
            'lib/dist/index.d.ts',
          ),
          probe('conflict-probe', 'conflict', 'alternative.ts'),
        ],
        crossProgramJoins: [
          {
            id: 'portable-join',
            probeIds: ['source-a-probe', 'declaration-probe'],
            requiredMechanisms: ['source-redirect', 'declaration-output'],
          },
        ],
        overlapCases: [
          {
            id: 'conflicting-resolution',
            probeIds: ['source-a-probe', 'conflict-probe'],
            expected: 'conflict',
          },
          {
            id: 'identical-resolution',
            probeIds: ['source-a-probe', 'source-b-probe'],
            expected: 'deduplicated',
          },
        ],
        routeScan: { complete: true, programIds: ['source-a'] },
        conventionInventory: {
          complete: false,
          counts: {
            directExportCallableConst: 0,
            directExportClass: 0,
            directExportFunction: 1,
            exportListOnly: 0,
            inlineOrWrapper: 0,
            other: 0,
          },
          enumeratedRootCount: 1,
        },
        privacy: {
          disclosureMode: 'module-only',
          retainCallArguments: false,
          retainEnvironment: false,
          retainObservedUrls: false,
          retainRouteTemplates: false,
          retainSourceText: false,
        },
      };
      await writeFile(join(root, 'input.json'), JSON.stringify(input));

      const report = await buildGateReport(join(root, 'input.json'));
      expect(
        Object.fromEntries(
          report.measurements.symbolProbes.map((probe_) => [
            probe_.id,
            probe_.resolutionMechanism,
          ]),
        ),
      ).toEqual({
        'conflict-probe': 'source',
        'declaration-probe': 'declaration-output',
        'source-a-probe': 'source-redirect',
        'source-b-probe': 'source',
        'source-disabled-probe': undefined,
      });
      expect(report.measurements.crossProgramJoins).toEqual([
        expect.objectContaining({ id: 'portable-join', outcome: 'exact' }),
      ]);
      expect(report.measurements.overlapCases).toEqual([
        expect.objectContaining({
          id: 'conflicting-resolution',
          observed: 'conflict',
          outcome: 'exact',
        }),
        expect.objectContaining({
          id: 'identical-resolution',
          observed: 'deduplicated',
          outcome: 'exact',
        }),
      ]);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }, 30_000);
});

function completeMeasuredPacket() {
  return {
    input: {
      programSelection: { inventoryComplete: true },
      privacy: {
        disclosureMode: 'module-only',
        retainCallArguments: false,
        retainEnvironment: false,
        retainObservedUrls: false,
        retainRouteTemplates: false,
        retainSourceText: false,
      },
    },
    measurements: {
      programs: [
        {
          id: 'app',
          leaf: true,
          diagnosticCount: 0,
          projectReferenceCount: 1,
          configuredRootFileCount: 100,
          semanticFileCount: 400,
          semanticInputBytes: 1_000_000,
        },
        {
          id: 'forms',
          leaf: true,
          diagnosticCount: 0,
          projectReferenceCount: 0,
          configuredRootFileCount: 75,
          semanticFileCount: 300,
          semanticInputBytes: 750_000,
        },
        {
          id: 'lazy',
          leaf: true,
          diagnosticCount: 0,
          projectReferenceCount: 0,
          configuredRootFileCount: 50,
          semanticFileCount: 200,
          semanticInputBytes: 500_000,
        },
      ],
      programTopology: {
        distinctLeafConfigCount: 3,
        distinctLeafProjectCount: 3,
      },
      symbolProbes: [
        {
          id: 'function',
          outcome: 'exact',
          conventions: ['path-alias', 'barrel'],
          declarationKind: 'function',
          resolutionMechanism: 'declaration-output',
          reasons: [],
        },
        {
          id: 'class',
          outcome: 'exact',
          conventions: ['namespace-import'],
          declarationKind: 'class',
          resolutionMechanism: 'source-redirect',
          reasons: [],
        },
        {
          id: 'callable-const',
          outcome: 'exact',
          conventions: ['aliased-import'],
          declarationKind: 'callable-const',
          resolutionMechanism: 'source',
          reasons: [],
        },
      ],
      crossProgramJoins: [
        {
          id: 'join',
          mechanisms: ['declaration-output', 'source-redirect'],
          outcome: 'exact',
        },
      ],
      overlapCases: [
        { id: 'conflict', observed: 'conflict', outcome: 'exact' },
        { id: 'dedupe', observed: 'deduplicated', outcome: 'exact' },
      ],
      lazyRoutes: {
        complete: true,
        literalLazyRouteCount: 2,
        dynamicLazyRouteCount: 1,
        registrationExactCount: 1,
        registrationMismatchCount: 0,
        registrationUnresolvedCount: 0,
        scannedFileCount: 225,
        scannedProgramCount: 3,
      },
      conventionInventory: {
        complete: true,
        counts: {
          directExportFunction: 1,
          directExportClass: 1,
          directExportCallableConst: 1,
          exportListOnly: 1,
          inlineOrWrapper: 1,
          other: 0,
        },
        enumeratedRootCount: 5,
        countedRootCount: 5,
      },
      bundle: {
        scannedByteCount: 100_000,
        scannedFileCount: 2,
        runtimeCycleCheckPassed: true,
        probes: [
          { id: 'root', kind: 'root-anchor', matchCount: 0 },
          { id: 'location', kind: 'source-location', matchCount: 0 },
          { id: 'usage', kind: 'usage-annotation', matchCount: 0 },
        ],
      },
      performance: {
        protocol: 'lin-0-program-probe-v1',
        budgetsApproved: true,
        budgets: {
          artifactBytes: 10_000,
          coldMs: 2_000,
          incrementalMs: 500,
          peakRssMiB: 1_024,
        },
        samples: [
          {
            id: 'sample-1',
            artifactBytes: 5_000,
            coldMs: 1_000,
            incrementalMs: 250,
            peakRssMiB: 512,
          },
          {
            id: 'sample-2',
            artifactBytes: 5_100,
            coldMs: 1_100,
            incrementalMs: 260,
            peakRssMiB: 520,
          },
          {
            id: 'sample-3',
            artifactBytes: 5_200,
            coldMs: 1_200,
            incrementalMs: 270,
            peakRssMiB: 528,
          },
        ],
        sampleCount: 3,
        maxima: {
          artifactBytes: 5_200,
          coldMs: 1_200,
          incrementalMs: 270,
          peakRssMiB: 528,
        },
      },
    },
  };
}

describe('LIN-0 evidence matrix', () => {
  it('requires every fixed topology, convention, privacy, overlap, and scale gate', () => {
    const packet = completeMeasuredPacket();
    const derived = deriveGateChecks(packet.input, packet.measurements);

    expect(derived.map((check) => [check.id, check.status])).toEqual(
      REQUIRED_CHECK_IDS.map((id) => [id, 'pass']),
    );
  });

  it('turns measured budget overruns and bundle leaks into stop evidence', () => {
    const packet = completeMeasuredPacket();
    packet.measurements.performance.maxima.coldMs = 2_001;
    packet.measurements.bundle.probes[0].matchCount = 1;
    const derived = deriveGateChecks(packet.input, packet.measurements);

    expect(
      derived.find((check) => check.id === 'scale-budgets'),
    ).toEqual(
      expect.objectContaining({
        status: 'fail',
        reasons: ['PERFORMANCE_BUDGET_EXCEEDED'],
      }),
    );
    expect(
      derived.find((check) => check.id === 'bundle-source-isolation'),
    ).toEqual(
      expect.objectContaining({
        status: 'fail',
        reasons: [
          'AUTHORING_METADATA_OR_SOURCE_LOCATION_RETAINED_IN_BUNDLE',
        ],
      }),
    );
  });

  it('keeps unresolved probes and repeated leaf topology inconclusive', () => {
    const packet = completeMeasuredPacket();
    packet.measurements.symbolProbes.push({
      id: 'missing-probe',
      outcome: 'unresolved',
      reasons: ['SYMBOL_UNRESOLVED'],
    });
    packet.measurements.programTopology = {
      distinctLeafConfigCount: 1,
      distinctLeafProjectCount: 1,
    };
    const derived = deriveGateChecks(packet.input, packet.measurements);

    expect(derived.find((check) => check.id === 'symbol-conventions')).toEqual(
      expect.objectContaining({
        status: 'missing',
        reasons: ['REQUIRED_SYMBOL_PROBE_UNRESOLVED'],
      }),
    );
    expect(
      derived.find((check) => check.id === 'leaf-tsconfig-selection'),
    ).toEqual(
      expect.objectContaining({
        status: 'missing',
        reasons: expect.arrayContaining([
          'THREE_DISTINCT_LEAF_CONFIGS_REQUIRED',
          'THREE_DISTINCT_LEAF_PROJECTS_REQUIRED',
        ]),
      }),
    );
  });

  it('does not count unresolved cross-program joins as exact evidence', () => {
    const packet = completeMeasuredPacket();
    packet.measurements.crossProgramJoins[0].outcome = 'unresolved';

    const derived = deriveGateChecks(packet.input, packet.measurements);

    expect(
      derived.find((check) => check.id === 'declaration-source-redirects'),
    ).toEqual(
      expect.objectContaining({
        status: 'missing',
        evidence: expect.objectContaining({ exactJoinCount: 0 }),
      }),
    );
  });
});
