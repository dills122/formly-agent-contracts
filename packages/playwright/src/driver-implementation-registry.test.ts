import { describe, expect, it } from 'vitest';

import {
  AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
  createAgentContextDriverRegistryManifest,
  type AgentContextDriverCapability,
  type AgentContextDriverRegistration,
  type AgentContextDriverRegistryManifest,
} from '@formly-contract/schema';

import {
  bindAgentContextDriverImplementationRegistry,
  createAgentContextDriverImplementationRegistry,
  type AgentContextApplicationDriverImplementationSource,
  type AgentContextDriverImplementation,
  type AgentContextDriverImplementationBindingIssue,
  type AgentContextDriverImplementationSource,
  type AgentContextGenericDriverImplementationSource,
} from './driver-implementation-registry.js';

const fillV1: AgentContextDriverImplementation = () => 'fill-v1';
const fillV2: AgentContextDriverImplementation = () => 'fill-v2';
const applicationFill: AgentContextDriverImplementation = () =>
  'application-fill';

function genericSource(
  sourceId: string,
  drivers: AgentContextGenericDriverImplementationSource['drivers'],
): AgentContextGenericDriverImplementationSource {
  return { sourceId, kind: 'generic', drivers };
}

function applicationSource(
  sourceId: string,
  drivers: AgentContextApplicationDriverImplementationSource['drivers'],
): AgentContextApplicationDriverImplementationSource {
  return { sourceId, kind: 'application', drivers };
}

function registration(
  kind: 'generic' | 'application',
  id: string,
  version: number,
  capabilities: readonly [
    AgentContextDriverCapability,
    ...AgentContextDriverCapability[],
  ],
): AgentContextDriverRegistration {
  return { kind, id, version, capabilities };
}

function manifest(
  registrations: readonly AgentContextDriverRegistration[],
): AgentContextDriverRegistryManifest {
  return createAgentContextDriverRegistryManifest({
    schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
    registrations,
  });
}

function incompatibleIssues(
  result: ReturnType<typeof bindAgentContextDriverImplementationRegistry>,
): readonly AgentContextDriverImplementationBindingIssue[] {
  expect(result.status).toBe('incompatible');
  if (result.status !== 'incompatible') {
    throw new Error('Expected an incompatible implementation binding.');
  }
  expect('resolver' in result).toBe(false);
  return result.issues;
}

describe('trusted-local driver implementation inventory', () => {
  it('generates one canonical data-only manifest independent of source, driver, and capability order', () => {
    let invocationCount = 0;
    const appDriver: AgentContextDriverImplementation = () => {
      invocationCount += 1;
      return undefined;
    };
    const sources: readonly AgentContextDriverImplementationSource[] = [
      genericSource('forms.generic', [
        {
          id: 'shared.choice',
          version: 2,
          capabilities: ['select-option', 'fill'],
          implementation: fillV2,
        },
        {
          id: 'shared.choice',
          version: 1,
          capabilities: ['fill'],
          implementation: fillV1,
        },
      ]),
      applicationSource('orders.application', [
        {
          id: 'orders.open',
          version: 1,
          capabilities: ['open-usage'],
          implementation: appDriver,
        },
      ]),
    ];

    const first = createAgentContextDriverImplementationRegistry(sources);
    const second = createAgentContextDriverImplementationRegistry([
      applicationSource('orders.application', [
        {
          id: 'orders.open',
          version: 1,
          capabilities: ['open-usage'],
          implementation: appDriver,
        },
      ]),
      genericSource('forms.generic', [
        {
          id: 'shared.choice',
          version: 1,
          capabilities: ['fill'],
          implementation: fillV1,
        },
        {
          id: 'shared.choice',
          version: 2,
          capabilities: ['fill', 'select-option'],
          implementation: fillV2,
        },
      ]),
    ]);

    expect(first.manifest).toEqual(second.manifest);
    expect(first.manifest.contentHash).toBe(second.manifest.contentHash);
    expect(first.manifest.registrations).toEqual([
      registration('application', 'orders.open', 1, ['open-usage']),
      registration('generic', 'shared.choice', 1, ['fill']),
      registration('generic', 'shared.choice', 2, [
        'fill',
        'select-option',
      ]),
    ]);
    expect(JSON.stringify(first.manifest)).not.toContain('sourceId');
    expect(JSON.stringify(first.manifest)).not.toContain('implementation');
    expect(invocationCount).toBe(0);
  });

  it('freezes the entire public registry and manifest view while exposing no implementation map', () => {
    const registry = createAgentContextDriverImplementationRegistry([
      genericSource('forms.generic', [
        {
          id: 'shared.fill',
          version: 1,
          capabilities: ['fill'],
          implementation: fillV1,
        },
      ]),
    ]);

    expect(Object.keys(registry)).toEqual(['manifest']);
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.manifest)).toBe(true);
    expect(Object.isFrozen(registry.manifest.registrations)).toBe(true);
    expect(Object.isFrozen(registry.manifest.registrations[0])).toBe(true);
    expect(
      Object.isFrozen(registry.manifest.registrations[0]?.capabilities),
    ).toBe(true);
  });

  it('allows empty sources and an empty inventory without installing defaults', () => {
    const registry = createAgentContextDriverImplementationRegistry([
      genericSource('forms.empty', []),
    ]);
    const binding = bindAgentContextDriverImplementationRegistry(
      registry,
      registry.manifest,
    );

    expect(registry.manifest.registrations).toEqual([]);
    expect(binding.status).toBe('compatible');
    if (binding.status === 'compatible') {
      expect(
        binding.resolver({
          driver: { kind: 'generic', id: 'missing.driver', version: 1 },
          requiredCapabilities: ['fill'],
        }),
      ).toEqual({
        status: 'refused',
        driver: { kind: 'generic', id: 'missing.driver', version: 1 },
        requiredCapabilities: ['fill'],
        issue: {
          code: 'DRIVER_IMPLEMENTATION_MISSING',
          driver: { kind: 'generic', id: 'missing.driver', version: 1 },
          requiredCapabilities: ['fill'],
        },
      });
    }
  });

  it('rejects duplicate source IDs and duplicate exact identities but permits other kinds and versions', () => {
    expect(() =>
      createAgentContextDriverImplementationRegistry([
        genericSource('duplicate.source', []),
        applicationSource('duplicate.source', []),
      ]),
    ).toThrow(/duplicates a source identity/u);

    expect(() =>
      createAgentContextDriverImplementationRegistry([
        genericSource('source.one', [
          {
            id: 'shared.driver',
            version: 1,
            capabilities: ['fill'],
            implementation: fillV1,
          },
        ]),
        genericSource('source.two', [
          {
            id: 'shared.driver',
            version: 1,
            capabilities: ['fill'],
            implementation: fillV2,
          },
        ]),
      ]),
    ).toThrow(/duplicates an exact driver implementation identity/u);

    const registry = createAgentContextDriverImplementationRegistry([
      genericSource('generic.source', [
        {
          id: 'shared.driver',
          version: 1,
          capabilities: ['fill'],
          implementation: fillV1,
        },
        {
          id: 'shared.driver',
          version: 2,
          capabilities: ['fill'],
          implementation: fillV2,
        },
      ]),
      applicationSource('application.source', [
        {
          id: 'shared.driver',
          version: 1,
          capabilities: ['fill'],
          implementation: applicationFill,
        },
      ]),
    ]);
    expect(registry.manifest.registrations).toHaveLength(3);
  });

  it('rejects reserved application IDs, duplicate capabilities, and unknown data fields', () => {
    expect(() =>
      createAgentContextDriverImplementationRegistry([
        applicationSource('orders.source', [
          {
            id: 'generic.reserved',
            version: 1,
            capabilities: ['fill'],
            implementation: applicationFill,
          },
        ]),
      ]),
    ).toThrow(/reserved "generic\." namespace/u);

    expect(() =>
      createAgentContextDriverImplementationRegistry([
        genericSource('forms.source', [
          {
            id: 'shared.fill',
            version: 1,
            capabilities: ['fill', 'fill'],
            implementation: fillV1,
          },
        ]),
      ]),
    ).toThrow(/duplicates capability/u);

    const sourceWithModulePath = {
      ...genericSource('forms.source', []),
      modulePath: './invented-driver.js',
    };
    expect(() =>
      createAgentContextDriverImplementationRegistry([
        sourceWithModulePath as AgentContextDriverImplementationSource,
      ]),
    ).toThrow(/modulePath.*not supported/u);
  });

  it('rejects non-callable implementations, classes, and callable proxies without invoking traps', () => {
    expect(() =>
      createAgentContextDriverImplementationRegistry([
        genericSource('forms.source', [
          {
            id: 'shared.fill',
            version: 1,
            capabilities: ['fill'],
            implementation: 'not-callable' as unknown as AgentContextDriverImplementation,
          },
        ]),
      ]),
    ).toThrow(/implementation.*directly callable/u);

    class DriverClass {}
    expect(() =>
      createAgentContextDriverImplementationRegistry([
        genericSource('forms.source', [
          {
            id: 'shared.fill',
            version: 1,
            capabilities: ['fill'],
            implementation: DriverClass as unknown as AgentContextDriverImplementation,
          },
        ]),
      ]),
    ).toThrow(/class constructor/u);

    const boundClass = DriverClass.bind(null);
    expect(() =>
      createAgentContextDriverImplementationRegistry([
        genericSource('forms.source', [
          {
            id: 'shared.fill',
            version: 1,
            capabilities: ['fill'],
            implementation:
              boundClass as unknown as AgentContextDriverImplementation,
          },
        ]),
      ]),
    ).toThrow(/bound function/u);

    let trapCount = 0;
    const proxiedImplementation = new Proxy(fillV1, {
      get() {
        trapCount += 1;
        throw new Error('callable proxy trap must not run');
      },
    });
    expect(() =>
      createAgentContextDriverImplementationRegistry([
        genericSource('forms.source', [
          {
            id: 'shared.fill',
            version: 1,
            capabilities: ['fill'],
            implementation: proxiedImplementation,
          },
        ]),
      ]),
    ).toThrow(/implementation.*proxy/u);
    expect(trapCount).toBe(0);
  });

  it('rejects proxy, accessor, sparse, and exotic source containers without invoking user accessors or traps', () => {
    let proxyTrapCount = 0;
    const proxy = new Proxy(
      [genericSource('forms.source', [])],
      {
        get() {
          proxyTrapCount += 1;
          throw new Error('proxy trap must not run');
        },
        ownKeys() {
          proxyTrapCount += 1;
          throw new Error('proxy trap must not run');
        },
      },
    );
    expect(() =>
      createAgentContextDriverImplementationRegistry(proxy),
    ).toThrow(/sources.*proxy/u);
    expect(proxyTrapCount).toBe(0);

    let getterCount = 0;
    const accessorSource = Object.defineProperty(
      {
        kind: 'generic',
        drivers: [],
      },
      'sourceId',
      {
        enumerable: true,
        get() {
          getterCount += 1;
          return 'forms.source';
        },
      },
    );
    expect(() =>
      createAgentContextDriverImplementationRegistry([
        accessorSource as unknown as AgentContextDriverImplementationSource,
      ]),
    ).toThrow(/sourceId.*data property/u);
    expect(getterCount).toBe(0);

    const sparseSources = new Array<AgentContextDriverImplementationSource>(1);
    expect(() =>
      createAgentContextDriverImplementationRegistry(sparseSources),
    ).toThrow(/must not be sparse/u);

    const exoticSource = Object.create({ inherited: true }) as Record<
      string,
      unknown
    >;
    exoticSource.sourceId = 'forms.source';
    exoticSource.kind = 'generic';
    exoticSource.drivers = [];
    expect(() =>
      createAgentContextDriverImplementationRegistry([
        exoticSource as unknown as AgentContextDriverImplementationSource,
      ]),
    ).toThrow(/plain object/u);
  });
});

describe('exact whole-inventory manifest binding', () => {
  it('returns a resolver only when identity and capability inventories are exactly equal', () => {
    const registry = createAgentContextDriverImplementationRegistry([
      applicationSource('orders.source', [
        {
          id: 'app.alpha',
          version: 1,
          capabilities: ['open-usage', 'fill'],
          implementation: applicationFill,
        },
        {
          id: 'app.runtime-only',
          version: 1,
          capabilities: ['check'],
          implementation: applicationFill,
        },
      ]),
      genericSource('forms.source', [
        {
          id: 'generic.shared',
          version: 1,
          capabilities: ['fill'],
          implementation: fillV1,
        },
      ]),
    ]);
    const allowlist = manifest([
      registration('application', 'app.alpha', 1, [
        'fill',
        'select-option',
      ]),
      registration('application', 'app.allowed-only', 1, ['check']),
      registration('generic', 'generic.shared', 1, ['fill']),
    ]);

    const issues = incompatibleIssues(
      bindAgentContextDriverImplementationRegistry(registry, allowlist),
    );

    expect(issues).toEqual([
      {
        code: 'DRIVER_IMPLEMENTATION_MISSING',
        driver: { kind: 'application', id: 'app.allowed-only', version: 1 },
        requiredCapabilities: ['check'],
      },
      {
        code: 'DRIVER_IMPLEMENTATION_CAPABILITY_MISSING',
        driver: { kind: 'application', id: 'app.alpha', version: 1 },
        missingCapabilities: ['select-option'],
      },
      {
        code: 'DRIVER_IMPLEMENTATION_CAPABILITY_NOT_ALLOWLISTED',
        driver: { kind: 'application', id: 'app.alpha', version: 1 },
        notAllowlistedCapabilities: ['open-usage'],
      },
      {
        code: 'DRIVER_IMPLEMENTATION_NOT_ALLOWLISTED',
        driver: { kind: 'application', id: 'app.runtime-only', version: 1 },
        implementedCapabilities: ['check'],
      },
    ]);
  });

  it('binds both exact manifest hashes and rejects forged registries or stale manifests', () => {
    const registry = createAgentContextDriverImplementationRegistry([
      genericSource('forms.source', [
        {
          id: 'generic.fill',
          version: 1,
          capabilities: ['fill'],
          implementation: fillV1,
        },
      ]),
    ]);
    const bound = bindAgentContextDriverImplementationRegistry(
      registry,
      registry.manifest,
    );

    expect(bound.status).toBe('compatible');
    expect(bound.inventoryManifestContentHash).toBe(
      registry.manifest.contentHash,
    );
    expect(bound.allowlistManifestContentHash).toBe(
      registry.manifest.contentHash,
    );
    expect(bound.issues).toEqual([]);

    expect(() =>
      bindAgentContextDriverImplementationRegistry(
        { manifest: registry.manifest },
        registry.manifest,
      ),
    ).toThrow(/registry.*created by/u);

    expect(() =>
      bindAgentContextDriverImplementationRegistry(registry, {
        ...registry.manifest,
        registrations: [],
      }),
    ).toThrow(/contentHash.*does not match/u);
  });
});

describe('bound exact driver resolution', () => {
  it('returns original function identities for exact kind, ID, version, and required capabilities without invoking them', () => {
    let invocationCount = 0;
    const countedV1: AgentContextDriverImplementation = () => {
      invocationCount += 1;
      return 'v1';
    };
    const registry = createAgentContextDriverImplementationRegistry([
      genericSource('generic.source', [
        {
          id: 'shared.driver',
          version: 1,
          capabilities: ['select-option', 'fill'],
          implementation: countedV1,
        },
        {
          id: 'shared.driver',
          version: 2,
          capabilities: ['fill'],
          implementation: fillV2,
        },
      ]),
      applicationSource('application.source', [
        {
          id: 'shared.driver',
          version: 1,
          capabilities: ['fill'],
          implementation: applicationFill,
        },
      ]),
    ]);
    const binding = bindAgentContextDriverImplementationRegistry(
      registry,
      registry.manifest,
    );
    expect(binding.status).toBe('compatible');
    if (binding.status !== 'compatible') {
      throw new Error('Expected a compatible implementation binding.');
    }

    const v1 = binding.resolver({
      driver: { kind: 'generic', id: 'shared.driver', version: 1 },
      requiredCapabilities: ['select-option', 'fill'],
    });
    const v2 = binding.resolver({
      driver: { kind: 'generic', id: 'shared.driver', version: 2 },
      requiredCapabilities: ['fill'],
    });
    const application = binding.resolver({
      driver: { kind: 'application', id: 'shared.driver', version: 1 },
      requiredCapabilities: ['fill'],
    });

    expect(v1.status).toBe('resolved');
    expect(v1.requiredCapabilities).toEqual(['fill', 'select-option']);
    expect(v1.status === 'resolved' && v1.implementation).toBe(countedV1);
    expect(v2.status === 'resolved' && v2.implementation).toBe(fillV2);
    expect(application.status === 'resolved' && application.implementation).toBe(
      applicationFill,
    );
    expect(invocationCount).toBe(0);
  });

  it('returns canonical structured refusals and never falls back across exact identity', () => {
    const registry = createAgentContextDriverImplementationRegistry([
      genericSource('forms.source', [
        {
          id: 'shared.driver',
          version: 1,
          capabilities: ['fill'],
          implementation: fillV1,
        },
      ]),
    ]);
    const binding = bindAgentContextDriverImplementationRegistry(
      registry,
      registry.manifest,
    );
    if (binding.status !== 'compatible') {
      throw new Error('Expected a compatible implementation binding.');
    }

    expect(
      binding.resolver({
        driver: { kind: 'generic', id: 'shared.driver', version: 2 },
        requiredCapabilities: ['fill'],
      }),
    ).toEqual({
      status: 'refused',
      driver: { kind: 'generic', id: 'shared.driver', version: 2 },
      requiredCapabilities: ['fill'],
      issue: {
        code: 'DRIVER_IMPLEMENTATION_MISSING',
        driver: { kind: 'generic', id: 'shared.driver', version: 2 },
        requiredCapabilities: ['fill'],
      },
    });

    expect(
      binding.resolver({
        driver: { kind: 'application', id: 'shared.driver', version: 1 },
        requiredCapabilities: ['fill'],
      }),
    ).toMatchObject({
      status: 'refused',
      issue: { code: 'DRIVER_IMPLEMENTATION_MISSING' },
    });

    expect(
      binding.resolver({
        driver: {
          kind: 'generic' as const,
          id: 'shared.driver',
          version: 1,
        },
        requiredCapabilities: ['select-option', 'check'],
      }),
    ).toEqual({
      status: 'refused',
      driver: { kind: 'generic', id: 'shared.driver', version: 1 },
      requiredCapabilities: ['check', 'select-option'],
      issue: {
        code: 'DRIVER_IMPLEMENTATION_CAPABILITY_MISSING',
        driver: { kind: 'generic', id: 'shared.driver', version: 1 },
        missingCapabilities: ['check', 'select-option'],
      },
    });
  });

  it('rejects malformed resolution requests before lookup', () => {
    const registry = createAgentContextDriverImplementationRegistry([
      genericSource('forms.source', [
        {
          id: 'shared.driver',
          version: 1,
          capabilities: ['fill'],
          implementation: fillV1,
        },
      ]),
    ]);
    const binding = bindAgentContextDriverImplementationRegistry(
      registry,
      registry.manifest,
    );
    if (binding.status !== 'compatible') {
      throw new Error('Expected a compatible implementation binding.');
    }

    expect(() =>
      binding.resolver({
        driver: { kind: 'generic', id: 'shared.driver', version: 1 },
        requiredCapabilities: [],
      } as never),
    ).toThrow(/requiredCapabilities.*at least one/u);
    expect(() =>
      binding.resolver({
        driver: { kind: 'generic', id: 'shared.driver', version: 1 },
        requiredCapabilities: ['fill', 'fill'],
      }),
    ).toThrow(/duplicates capability/u);
    expect(() =>
      binding.resolver({
        driver: { kind: 'generic', id: 'shared.driver', version: 1 },
        requiredCapabilities: ['invented-capability' as AgentContextDriverCapability],
      }),
    ).toThrow(/requiredCapabilities\[0\].*must be one of/u);

    let trapCount = 0;
    const proxiedRequest = new Proxy(
      {
        driver: {
          kind: 'generic' as const,
          id: 'shared.driver',
          version: 1,
        },
        requiredCapabilities: ['fill'] as const,
      },
      {
        ownKeys() {
          trapCount += 1;
          throw new Error('resolution proxy trap must not run');
        },
      },
    );
    expect(() => binding.resolver(proxiedRequest)).toThrow(
      /driverResolutionRequest.*proxy/u,
    );
    expect(trapCount).toBe(0);

    expect(() =>
      binding.resolver({
        driver: {
          kind: 'generic',
          id: 'shared.driver',
          version: 1,
          modulePath: './invented.js',
        },
        requiredCapabilities: ['fill'],
      } as never),
    ).toThrow(/modulePath.*not supported/u);
  });
});
