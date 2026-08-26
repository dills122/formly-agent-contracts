import { describe, expect, it } from "vitest";

import {
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECTS,
  canonicalizeFieldTypeProfileRegistry,
  computeFieldTypeProfileRegistryHash,
  parseContractValueDomain,
  parseFieldTypeProfileRegistry,
  type FieldTypeProfileRegistry,
} from "./field-type-profile.js";

const registry: FieldTypeProfileRegistry = {
  schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  id: "fixture.field-profiles",
  version: 1,
  profiles: [
    {
      identity: { id: "fixture.text", version: 1 },
      semanticType: "text",
      valueShape: "scalar",
      evidence: "declared",
      parts: [
        {
          name: "control",
          role: "textbox",
          cardinality: "one",
          evidence: "declared",
        },
      ],
      interaction: {
        kind: "fill",
        operation: "fill",
        controlPart: "control",
      },
      valueDomain: { kind: "not-applicable", evidence: "declared" },
      driver: {
        kind: "generic",
        id: "generic.fill",
        version: 1,
        capabilities: ["fill"],
      },
      unknowns: [],
    },
    {
      identity: { id: "fixture.radio-choice", version: 1 },
      semanticType: "single-choice",
      valueShape: "scalar",
      evidence: "declared",
      parts: [
        {
          name: "group",
          role: "radiogroup",
          cardinality: "one",
          evidence: "declared",
        },
        {
          name: "option",
          role: "radio",
          cardinality: "many",
          evidence: "declared",
        },
      ],
      interaction: {
        kind: "choice",
        operation: "check",
        optionPart: "option",
      },
      valueDomain: {
        kind: "projected",
        source: "adapter",
        completeness: "complete",
        collectionPath: "props.options",
        labelPath: "label",
        valuePath: "value",
        disabledPath: "disabled",
        evidence: "declared",
      },
      driver: {
        kind: "generic",
        id: "generic.choice",
        version: 1,
        capabilities: ["check"],
      },
      unknowns: [],
    },
    {
      identity: { id: "fixture.overlay-choice", version: 2 },
      semanticType: "single-choice",
      valueShape: "object",
      evidence: "declared",
      parts: [
        {
          name: "trigger",
          role: "button",
          cardinality: "one",
          evidence: "declared",
        },
        {
          name: "popup",
          role: "listbox",
          cardinality: "one",
          evidence: "declared",
        },
        {
          name: "option",
          role: "option",
          cardinality: "many",
          evidence: "declared",
        },
      ],
      interaction: {
        kind: "choice",
        operation: "select-from-overlay",
        triggerPart: "trigger",
        popupPart: "popup",
        optionPart: "option",
      },
      valueDomain: {
        kind: "projected",
        source: "adapter",
        completeness: "scenario",
        collectionPath: "props.availableRecords",
        labelPath: "displayName",
        valuePath: "modelValue",
        evidence: "declared",
      },
      driver: {
        kind: "application",
        id: "fixture.portal-choice",
        version: 2,
        capabilities: ["select-from-overlay"],
      },
      unknowns: [
        {
          aspect: "runtime-states",
          reason: "The remote provider controls which pages are available.",
          evidence: "declared",
        },
      ],
    },
    {
      identity: { id: "fixture.autocomplete", version: 1 },
      semanticType: "single-choice",
      valueShape: "object",
      evidence: "declared",
      parts: [
        {
          name: "query",
          role: "combobox",
          cardinality: "one",
          evidence: "declared",
        },
        {
          name: "popup",
          role: "listbox",
          cardinality: "one",
          evidence: "declared",
        },
        {
          name: "option",
          role: "option",
          cardinality: "many",
          evidence: "declared",
        },
      ],
      interaction: {
        kind: "autocomplete",
        operation: "type-and-pick",
        queryPart: "query",
        popupPart: "popup",
        optionPart: "option",
      },
      valueDomain: {
        kind: "projected",
        source: "adapter",
        completeness: "scenario",
        collectionPath: "props.results",
        labelPath: "label",
        valuePath: "record",
        evidence: "declared",
      },
      driver: {
        kind: "generic",
        id: "generic.autocomplete",
        version: 1,
        capabilities: ["type-and-pick"],
      },
      unknowns: [],
    },
    {
      identity: { id: "fixture.row-selection", version: 1 },
      semanticType: "multi-choice",
      valueShape: "array",
      evidence: "declared",
      parts: [
        {
          name: "row",
          role: "row",
          cardinality: "many",
          evidence: "declared",
        },
        {
          name: "selection",
          role: "checkbox",
          cardinality: "many",
          evidence: "declared",
        },
      ],
      interaction: {
        kind: "row-selection",
        operation: "select-row",
        rowPart: "row",
        selectionPart: "selection",
      },
      valueDomain: {
        kind: "projected",
        source: "adapter",
        completeness: "complete",
        collectionPath: "props.rows",
        labelPath: "label",
        valuePath: "id",
        evidence: "declared",
      },
      driver: {
        kind: "generic",
        id: "generic.row-selection",
        version: 1,
        capabilities: ["select-row"],
      },
      unknowns: [],
    },
    {
      identity: { id: "fixture.repeater", version: 1 },
      semanticType: "repeater",
      valueShape: "array",
      evidence: "declared",
      parts: [
        {
          name: "add",
          role: "button",
          cardinality: "one",
          evidence: "declared",
        },
        {
          name: "item",
          role: "group",
          cardinality: "many",
          evidence: "declared",
        },
        {
          name: "expand",
          role: "button",
          cardinality: "many",
          evidence: "declared",
        },
      ],
      interaction: {
        kind: "repeater",
        operation: "expand-item",
        addPart: "add",
        itemPart: "item",
        expandPart: "expand",
      },
      valueDomain: { kind: "not-applicable", evidence: "declared" },
      driver: {
        kind: "generic",
        id: "generic.repeater",
        version: 1,
        capabilities: ["expand-item"],
      },
      unknowns: [],
    },
  ],
  registrations: [
    {
      formlyType: "input",
      defaultProfile: { id: "fixture.text", version: 1 },
      variants: [],
    },
    {
      formlyType: "cool-radio-btn-grp",
      defaultProfile: { id: "fixture.radio-choice", version: 1 },
      variants: [
        {
          name: "overlay",
          profile: { id: "fixture.overlay-choice", version: 2 },
        },
      ],
    },
    {
      formlyType: "custom-autocomplete",
      defaultProfile: { id: "fixture.autocomplete", version: 1 },
      variants: [],
    },
    {
      formlyType: "table-select",
      defaultProfile: { id: "fixture.row-selection", version: 1 },
      variants: [],
    },
    {
      formlyType: "repeat-section",
      defaultProfile: { id: "fixture.repeater", version: 1 },
      variants: [],
    },
  ],
  wrappers: [
    {
      identity: { id: "fixture.expansion-wrapper", version: 1 },
      wrapperName: "expansion-panel",
      evidence: "declared",
      parts: [
        {
          name: "wrapper-expand",
          role: "button",
          cardinality: "one",
          evidence: "declared",
        },
      ],
      preconditions: [
        {
          kind: "activate",
          part: "wrapper-expand",
          operation: "click",
          evidence: "declared",
        },
      ],
      unknowns: [],
    },
  ],
};

describe("parseFieldTypeProfileRegistry", () => {
  it("accepts the complete interaction, registration, and wrapper matrix", () => {
    expect(parseFieldTypeProfileRegistry(registry)).toEqual(registry);
  });

  it("accepts every non-projected value-domain branch explicitly", () => {
    expect(
      parseContractValueDomain({
        kind: "enumerated",
        source: "static-options",
        completeness: "complete",
        evidence: "declared",
        values: [false, true],
      })
    ).toEqual({
      kind: "enumerated",
      source: "static-options",
      completeness: "complete",
      evidence: "declared",
      values: [false, true],
    });
    expect(
      parseContractValueDomain({
        kind: "dynamic",
        source: "async",
        evidence: "declared",
      })
    ).toEqual({ kind: "dynamic", source: "async", evidence: "declared" });
    expect(
      parseContractValueDomain({
        kind: "unknown",
        evidence: "declared",
      })
    ).toEqual({ kind: "unknown", evidence: "declared" });
  });

  it("accepts projected, runtime-enumerable, dynamic, unknown, and not-applicable profile domains", () => {
    const domains = [
      registry.profiles[1]!.valueDomain,
      {
        kind: "runtime-enumerable",
        completeness: "scenario",
        optionPart: "option",
        evidence: "observed",
      },
      { kind: "dynamic", source: "async", evidence: "declared" },
      {
        kind: "unknown",
        reason: "The provider is opaque.",
        evidence: "declared",
      },
      registry.profiles[0]!.valueDomain,
    ] as const;

    for (const valueDomain of domains) {
      const candidate: FieldTypeProfileRegistry = {
        ...registry,
        profiles: registry.profiles.map((profile, index) =>
          index === 1
            ? {
                ...profile,
                valueDomain,
                driver: {
                  kind: "application",
                  id: "fixture.domain-driver",
                  version: 1,
                  capabilities: ["check"],
                },
              }
            : profile
        ),
      };

      expect(parseFieldTypeProfileRegistry(candidate)).toEqual(candidate);
    }
  });

  it("rejects unknown keys at every strict DTO boundary", () => {
    const invalid = structuredClone(registry) as unknown as {
      profiles: { parts: Record<string, unknown>[] }[];
    };
    invalid.profiles[0]!.parts[0]!.selector = "#invented";

    expect(() => parseFieldTypeProfileRegistry(invalid)).toThrow(
      "registry.profiles[0].parts[0] contains unknown property selector"
    );
  });

  it("rejects unknown keys on interaction, domain, driver, registration, variant, wrapper, precondition, and contract-domain unions", () => {
    const mutations: readonly [
      (candidate: Record<string, unknown>) => void,
      string
    ][] = [
      [
        (candidate) => {
          const profiles = candidate.profiles as Record<string, unknown>[];
          (profiles[0]!.interaction as Record<string, unknown>).selector = "x";
        },
        "registry.profiles[0].interaction contains unknown property selector",
      ],
      [
        (candidate) => {
          const profiles = candidate.profiles as Record<string, unknown>[];
          (profiles[0]!.valueDomain as Record<string, unknown>).strategy = "x";
        },
        "registry.profiles[0].valueDomain contains unknown property strategy",
      ],
      [
        (candidate) => {
          const profiles = candidate.profiles as Record<string, unknown>[];
          (profiles[0]!.driver as Record<string, unknown>).module = "x";
        },
        "registry.profiles[0].driver contains unknown property module",
      ],
      [
        (candidate) => {
          const registrations = candidate.registrations as Record<
            string,
            unknown
          >[];
          registrations[0]!.override = true;
        },
        "registry.registrations[0] contains unknown property override",
      ],
      [
        (candidate) => {
          const registrations = candidate.registrations as Record<
            string,
            unknown
          >[];
          const variants = registrations[1]!.variants as Record<
            string,
            unknown
          >[];
          variants[0]!.when = "runtime";
        },
        "registry.registrations[1].variants[0] contains unknown property when",
      ],
      [
        (candidate) => {
          const wrappers = candidate.wrappers as Record<string, unknown>[];
          wrappers[0]!.priority = 1;
        },
        "registry.wrappers[0] contains unknown property priority",
      ],
      [
        (candidate) => {
          const wrappers = candidate.wrappers as Record<string, unknown>[];
          const preconditions = wrappers[0]!.preconditions as Record<
            string,
            unknown
          >[];
          preconditions[0]!.timeout = 100;
        },
        "registry.wrappers[0].preconditions[0] contains unknown property timeout",
      ],
    ];

    for (const [mutate, message] of mutations) {
      const candidate = structuredClone(registry) as unknown as Record<
        string,
        unknown
      >;
      mutate(candidate);
      expect(() => parseFieldTypeProfileRegistry(candidate)).toThrow(message);
    }

    expect(() =>
      parseContractValueDomain({
        kind: "dynamic",
        source: "function",
        evidence: "declared",
        callback: () => undefined,
      })
    ).toThrow("valueDomain.callback must be a JSON value");
  });

  it("accepts plain and null-prototype records but rejects non-canonical object shapes without invoking getters", () => {
    const nullPrototype = Object.assign(
      Object.create(null) as Record<string, unknown>,
      registry
    );
    expect(parseFieldTypeProfileRegistry(nullPrototype)).toBe(nullPrototype);

    const nonPlain = Object.assign(new (class Registry {})(), registry);
    expect(() => parseFieldTypeProfileRegistry(nonPlain)).toThrow(
      "registry must be a plain or null-prototype object"
    );

    const symbolKeyed = structuredClone(registry) as unknown as Record<
      string | symbol,
      unknown
    >;
    symbolKeyed[Symbol("executable")] = "hidden";
    expect(() => parseFieldTypeProfileRegistry(symbolKeyed)).toThrow(
      "registry must not contain symbol-keyed properties"
    );

    let getterCalls = 0;
    const accessor = structuredClone(registry) as unknown as {
      profiles: { driver: Record<string, unknown> }[];
    };
    Object.defineProperty(accessor.profiles[0]!.driver, "execute", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return () => undefined;
      },
    });
    expect(() => parseFieldTypeProfileRegistry(accessor)).toThrow(
      "registry.profiles[0].driver.execute must not be an accessor property"
    );
    expect(getterCalls).toBe(0);

    const sparse = {
      ...registry,
      profiles: new Array(1),
    };
    expect(() => parseFieldTypeProfileRegistry(sparse)).toThrow(
      "registry.profiles[0] must not be a sparse array element"
    );
  });

  it("rejects every non-JSON primitive at its exact profile path", () => {
    const invalidValues: readonly [unknown, string][] = [
      [undefined, "must be a JSON value"],
      [() => undefined, "must be a JSON value"],
      [Symbol("hidden"), "must be a JSON value"],
      [1n, "must be a JSON value"],
    ];

    for (const [invalidValue, message] of invalidValues) {
      const candidate = structuredClone(registry) as unknown as {
        profiles: { valueDomain: Record<string, unknown> }[];
      };
      candidate.profiles[1]!.valueDomain.disabledPath = invalidValue;
      expect(() => parseFieldTypeProfileRegistry(candidate)).toThrow(
        `registry.profiles[1].valueDomain.disabledPath ${message}`
      );
    }

    const nonFinite = { ...registry, version: Number.POSITIVE_INFINITY };
    expect(() => parseFieldTypeProfileRegistry(nonFinite)).toThrow(
      "registry.version must be a finite JSON number"
    );
  });

  it("rejects malformed registry, profile, driver, and version identities", () => {
    const malformedRegistry = { ...registry, id: "Not Namespaced" };
    const malformedProfile = structuredClone(registry) as unknown as {
      profiles: { identity: { id: string; version: number } }[];
    };
    malformedProfile.profiles[0]!.identity.id = "unscoped";
    const malformedDriver = structuredClone(registry) as unknown as {
      profiles: { driver: { id: string } }[];
    };
    malformedDriver.profiles[2]!.driver.id = "Application Driver";
    const malformedVersion = { ...registry, version: 0 };

    expect(() => parseFieldTypeProfileRegistry(malformedRegistry)).toThrow(
      "registry.id must be a stable namespaced identifier"
    );
    expect(() => parseFieldTypeProfileRegistry(malformedProfile)).toThrow(
      "registry.profiles[0].identity.id must be a stable namespaced identifier"
    );
    expect(() => parseFieldTypeProfileRegistry(malformedDriver)).toThrow(
      "registry.profiles[2].driver.id must be a stable namespaced identifier"
    );
    expect(() => parseFieldTypeProfileRegistry(malformedVersion)).toThrow(
      "registry.version must be a positive safe integer"
    );
  });

  it("rejects unsupported schema and non-positive profile, driver, and wrapper versions", () => {
    const schema = { ...registry, schemaVersion: "0.5.0" };
    const profile = structuredClone(registry) as unknown as {
      profiles: { identity: { version: number } }[];
    };
    profile.profiles[0]!.identity.version = 0;
    const driver = structuredClone(registry) as unknown as {
      profiles: { driver: { version: number } }[];
    };
    driver.profiles[0]!.driver.version = -1;
    const wrapper = structuredClone(registry) as unknown as {
      wrappers: { identity: { version: number } }[];
    };
    wrapper.wrappers[0]!.identity.version = 0;

    expect(() => parseFieldTypeProfileRegistry(schema)).toThrow(
      "registry.schemaVersion is unsupported"
    );
    expect(() => parseFieldTypeProfileRegistry(profile)).toThrow(
      "registry.profiles[0].identity.version must be a positive safe integer"
    );
    expect(() => parseFieldTypeProfileRegistry(driver)).toThrow(
      "registry.profiles[0].driver.version must be a positive safe integer"
    );
    expect(() => parseFieldTypeProfileRegistry(wrapper)).toThrow(
      "registry.wrappers[0].identity.version must be a positive safe integer"
    );
  });

  it("does not let resolved or observed evidence authorize actionable registry surfaces", () => {
    const mutations: readonly [
      (candidate: Record<string, unknown>) => void,
      string
    ][] = [
      [
        (candidate) => {
          const profiles = candidate.profiles as Record<string, unknown>[];
          profiles[0]!.evidence = "observed";
        },
        'registry.profiles[0].evidence must be "declared"',
      ],
      [
        (candidate) => {
          const profiles = candidate.profiles as Record<string, unknown>[];
          const parts = profiles[0]!.parts as Record<string, unknown>[];
          parts[0]!.evidence = "observed";
        },
        'registry.profiles[0].parts[0].evidence must be "declared"',
      ],
      [
        (candidate) => {
          const profiles = candidate.profiles as Record<string, unknown>[];
          const domain = profiles[1]!.valueDomain as Record<string, unknown>;
          domain.evidence = "resolved";
        },
        'registry.profiles[1].valueDomain.evidence must be "declared"',
      ],
      [
        (candidate) => {
          const wrappers = candidate.wrappers as Record<string, unknown>[];
          wrappers[0]!.evidence = "observed";
        },
        'registry.wrappers[0].evidence must be "declared"',
      ],
      [
        (candidate) => {
          const wrappers = candidate.wrappers as Record<string, unknown>[];
          const preconditions = wrappers[0]!.preconditions as Record<
            string,
            unknown
          >[];
          preconditions[0]!.evidence = "resolved";
        },
        'registry.wrappers[0].preconditions[0].evidence must be "declared"',
      ],
    ];

    for (const [mutate, message] of mutations) {
      const candidate = structuredClone(registry) as unknown as Record<
        string,
        unknown
      >;
      mutate(candidate);
      expect(() => parseFieldTypeProfileRegistry(candidate)).toThrow(message);
    }
  });

  it("rejects duplicate profiles, parts, registrations, variants, wrappers, and capabilities", () => {
    const duplicateProfile = {
      ...registry,
      profiles: [...registry.profiles, registry.profiles[0]!],
    };
    const duplicatePart = structuredClone(registry) as unknown as {
      profiles: { parts: unknown[] }[];
    };
    duplicatePart.profiles[0]!.parts.push(duplicatePart.profiles[0]!.parts[0]);
    const duplicateRegistration = {
      ...registry,
      registrations: [...registry.registrations, registry.registrations[0]!],
    };
    const duplicateVariant = structuredClone(registry) as unknown as {
      registrations: { variants: unknown[] }[];
    };
    duplicateVariant.registrations[1]!.variants.push(
      duplicateVariant.registrations[1]!.variants[0]
    );
    const duplicateWrapper = {
      ...registry,
      wrappers: [
        ...registry.wrappers,
        {
          ...registry.wrappers[0]!,
          identity: { id: "fixture.other-expansion-wrapper", version: 1 },
        },
      ],
    };
    const duplicateCapability = structuredClone(registry) as unknown as {
      profiles: { driver: { capabilities: string[] } }[];
    };
    duplicateCapability.profiles[0]!.driver.capabilities.push("fill");

    expect(() => parseFieldTypeProfileRegistry(duplicateProfile)).toThrow(
      'duplicates profile identity "fixture.text@1"'
    );
    expect(() => parseFieldTypeProfileRegistry(duplicatePart)).toThrow(
      'duplicates part name "control"'
    );
    expect(() => parseFieldTypeProfileRegistry(duplicateRegistration)).toThrow(
      'duplicates Formly type "input"'
    );
    expect(() => parseFieldTypeProfileRegistry(duplicateVariant)).toThrow(
      'duplicates variant name "overlay"'
    );
    expect(() => parseFieldTypeProfileRegistry(duplicateWrapper)).toThrow(
      'duplicates wrapper name "expansion-panel"'
    );
    expect(() => parseFieldTypeProfileRegistry(duplicateCapability)).toThrow(
      'duplicates capability "fill"'
    );
  });

  it("rejects missing profile and part references", () => {
    const missingProfile = structuredClone(registry) as unknown as {
      registrations: { defaultProfile: { id: string } }[];
    };
    missingProfile.registrations[0]!.defaultProfile.id = "fixture.missing";
    const missingPart = structuredClone(registry) as unknown as {
      profiles: { interaction: { controlPart: string } }[];
    };
    missingPart.profiles[0]!.interaction.controlPart = "missing";
    const missingWrapperPart = structuredClone(registry) as unknown as {
      wrappers: { preconditions: { part: string }[] }[];
    };
    missingWrapperPart.wrappers[0]!.preconditions[0]!.part = "missing";

    expect(() => parseFieldTypeProfileRegistry(missingProfile)).toThrow(
      'references missing profile "fixture.missing@1"'
    );
    expect(() => parseFieldTypeProfileRegistry(missingPart)).toThrow(
      'references missing part "missing"'
    );
    expect(() => parseFieldTypeProfileRegistry(missingWrapperPart)).toThrow(
      'references missing part "missing"'
    );
  });

  it("rejects missing variant profiles and every interaction family's named part references", () => {
    const missingVariant = structuredClone(registry) as unknown as {
      registrations: { variants: { profile: { id: string } }[] }[];
    };
    missingVariant.registrations[1]!.variants[0]!.profile.id =
      "fixture.missing";
    expect(() => parseFieldTypeProfileRegistry(missingVariant)).toThrow(
      'references missing profile "fixture.missing@2"'
    );

    const partMutations: readonly [number, string][] = [
      [0, "controlPart"],
      [1, "optionPart"],
      [3, "queryPart"],
      [4, "rowPart"],
      [5, "itemPart"],
    ];
    for (const [profileIndex, property] of partMutations) {
      const candidate = structuredClone(registry) as unknown as {
        profiles: { interaction: Record<string, unknown> }[];
      };
      candidate.profiles[profileIndex]!.interaction[property] = "missing";
      expect(() => parseFieldTypeProfileRegistry(candidate)).toThrow(
        'references missing part "missing"'
      );
    }
  });

  it("rejects invalid or semantically incomplete value projections", () => {
    const invalidPath = structuredClone(registry) as unknown as {
      profiles: { valueDomain: { collectionPath: string } }[];
    };
    invalidPath.profiles[1]!.valueDomain.collectionPath = "options[0]";
    const noProjection = structuredClone(registry) as unknown as {
      profiles: { valueDomain: Record<string, unknown> }[];
    };
    noProjection.profiles[1]!.valueDomain = {
      kind: "runtime-enumerable",
      completeness: "scenario",
      optionPart: "option",
      evidence: "observed",
    };

    expect(() => parseFieldTypeProfileRegistry(invalidPath)).toThrow(
      "collectionPath must be a dot-delimited property path rooted at props"
    );
    expect(() => parseFieldTypeProfileRegistry(noProjection)).toThrow(
      "generic choice requires a projected label-to-model-value mapping"
    );
  });

  it("rejects contradictory generic-driver identities and capabilities", () => {
    const wrongDriver = structuredClone(registry) as unknown as {
      profiles: { driver: { id: string } }[];
    };
    wrongDriver.profiles[3]!.driver.id = "generic.choice";
    const unsupportedCapability = structuredClone(registry) as unknown as {
      profiles: { driver: { capabilities: string[] } }[];
    };
    unsupportedCapability.profiles[0]!.driver.capabilities = [
      "fill",
      "select-row",
    ];
    const missingCapability = structuredClone(registry) as unknown as {
      profiles: { driver: { capabilities: string[] } }[];
    };
    missingCapability.profiles[1]!.driver.capabilities = ["select-option"];

    expect(() => parseFieldTypeProfileRegistry(wrongDriver)).toThrow(
      "interaction autocomplete requires generic.autocomplete"
    );
    expect(() => parseFieldTypeProfileRegistry(unsupportedCapability)).toThrow(
      'generic.fill does not support capability "select-row"'
    );
    expect(() => parseFieldTypeProfileRegistry(missingCapability)).toThrow(
      'driver capabilities must include interaction operation "check"'
    );
  });

  it("rejects unsupported generic versions, incompatible semantic parts, and capabilities whose parts are absent", () => {
    const unsupportedVersion = structuredClone(registry) as unknown as {
      profiles: { driver: { version: number } }[];
    };
    unsupportedVersion.profiles[0]!.driver.version = 2;
    const incompatibleRole = structuredClone(registry) as unknown as {
      profiles: { parts: { role: string }[] }[];
    };
    incompatibleRole.profiles[0]!.parts[0]!.role = "button";
    const incompatibleCardinality = structuredClone(registry) as unknown as {
      profiles: { parts: { cardinality: string }[] }[];
    };
    incompatibleCardinality.profiles[1]!.parts[1]!.cardinality = "one";
    const missingOverlayParts = structuredClone(registry) as unknown as {
      profiles: { driver: { capabilities: string[] } }[];
    };
    missingOverlayParts.profiles[1]!.driver.capabilities = [
      "check",
      "select-from-overlay",
    ];
    const missingExpandPart = structuredClone(registry) as unknown as {
      profiles: {
        interaction: Record<string, unknown>;
        driver: { capabilities: string[] };
      }[];
    };
    delete missingExpandPart.profiles[5]!.interaction.expandPart;
    missingExpandPart.profiles[5]!.interaction.operation = "add-item";
    missingExpandPart.profiles[5]!.driver.capabilities = [
      "add-item",
      "expand-item",
    ];

    expect(() => parseFieldTypeProfileRegistry(unsupportedVersion)).toThrow(
      "generic driver generic.fill only supports version 1"
    );
    expect(() => parseFieldTypeProfileRegistry(incompatibleRole)).toThrow(
      'generic.fill requires part "control" to have role textbox, searchbox, or spinbutton'
    );
    expect(() =>
      parseFieldTypeProfileRegistry(incompatibleCardinality)
    ).toThrow('generic.choice requires part "option" to have cardinality many');
    expect(() => parseFieldTypeProfileRegistry(missingOverlayParts)).toThrow(
      'capability "select-from-overlay" requires triggerPart and popupPart'
    );
    expect(() => parseFieldTypeProfileRegistry(missingExpandPart)).toThrow(
      'capability "expand-item" requires expandPart'
    );
  });

  it("blocks generic execution for codec, locator-scope, and sequence unknowns but not runtime-state variability", () => {
    for (const aspect of [
      "model-codec",
      "locator-scope",
      "interaction-sequence",
    ] as const) {
      const blocked: FieldTypeProfileRegistry = {
        ...registry,
        profiles: registry.profiles.map((profile, index) =>
          index === 0
            ? {
                ...profile,
                unknowns: [
                  {
                    aspect,
                    reason: `${aspect} remains unresolved.`,
                    evidence: "declared",
                  },
                ],
              }
            : profile
        ),
      };
      expect(() => parseFieldTypeProfileRegistry(blocked)).toThrow(
        `generic driver generic.fill is blocked by unknown aspect "${aspect}"`
      );
    }

    const runtimeVariable: FieldTypeProfileRegistry = {
      ...registry,
      profiles: registry.profiles.map((profile, index) =>
        index === 0
          ? {
              ...profile,
              unknowns: [
                {
                  aspect: "runtime-states",
                  reason: "Availability changes between valid scenarios.",
                  evidence: "declared",
                },
              ],
            }
          : profile
      ),
    };
    expect(parseFieldTypeProfileRegistry(runtimeVariable)).toBe(
      runtimeVariable
    );

    const applicationOwnedCodec: FieldTypeProfileRegistry = {
      ...registry,
      profiles: registry.profiles.map((profile, index) =>
        index === 2
          ? {
              ...profile,
              unknowns: [
                {
                  aspect: "model-codec",
                  reason: "The allowlisted application driver owns the codec.",
                  evidence: "declared",
                },
              ],
            }
          : profile
      ),
    };
    expect(parseFieldTypeProfileRegistry(applicationOwnedCodec)).toBe(
      applicationOwnedCodec
    );
  });

  it("exposes a frozen blocking-unknown policy that cannot weaken validation", () => {
    expect(Object.isFrozen(GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECTS)).toBe(true);
    expect(() =>
      (GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECTS as unknown as string[]).splice(0)
    ).toThrow();
    expect(GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECTS).toContain("model-codec");

    const blocked: FieldTypeProfileRegistry = {
      ...registry,
      profiles: registry.profiles.map((profile, index) =>
        index === 0
          ? {
              ...profile,
              unknowns: [
                {
                  aspect: "model-codec",
                  reason: "The model codec remains unresolved.",
                  evidence: "declared",
                },
              ],
            }
          : profile
      ),
    };
    expect(() => parseFieldTypeProfileRegistry(blocked)).toThrow(
      'generic driver generic.fill is blocked by unknown aspect "model-codec"'
    );
  });

  it("reserves the generic driver namespace for generic bindings", () => {
    const invalid: FieldTypeProfileRegistry = {
      ...registry,
      profiles: registry.profiles.map((profile, index) =>
        index === 2
          ? {
              ...profile,
              driver: {
                kind: "application",
                id: "generic.application-override",
                version: 1,
                capabilities: [profile.interaction.operation],
              },
            }
          : profile
      ),
    };

    expect(() => parseFieldTypeProfileRegistry(invalid)).toThrow(
      'application driver IDs must not use the reserved "generic." prefix'
    );
  });

  it("rejects duplicate and non-JSON-safe enumerated contract values", () => {
    expect(() =>
      parseContractValueDomain({
        kind: "enumerated",
        source: "adapter",
        completeness: "complete",
        evidence: "declared",
        values: [{ code: "same" }, { code: "same" }],
      })
    ).toThrow("valueDomain.values[1] duplicates canonical value");
    expect(() =>
      parseContractValueDomain({
        kind: "enumerated",
        source: "adapter",
        completeness: "complete",
        evidence: "declared",
        values: [Number.NaN],
      })
    ).toThrow("valueDomain.values[0] must be a finite JSON number");
  });
});

describe("field-type profile registry canonical identity", () => {
  it("is invariant to registry-set ordering and variant ordering", () => {
    const reordered: FieldTypeProfileRegistry = {
      ...registry,
      profiles: [...registry.profiles].reverse(),
      registrations: [...registry.registrations]
        .reverse()
        .map((registration) => ({
          ...registration,
          variants: [...registration.variants].reverse(),
        })),
      wrappers: [...registry.wrappers].reverse(),
    };

    expect(canonicalizeFieldTypeProfileRegistry(reordered)).toBe(
      canonicalizeFieldTypeProfileRegistry(registry)
    );
    expect(computeFieldTypeProfileRegistryHash(reordered)).toBe(
      computeFieldTypeProfileRegistryHash(registry)
    );
  });

  it("changes identity when a registry, profile, or driver version changes", () => {
    const registryVersion = { ...registry, version: 2 };
    const profileVersion: FieldTypeProfileRegistry = {
      ...registry,
      profiles: registry.profiles.map((profile, index) =>
        index === 0
          ? {
              ...profile,
              identity: { id: "fixture.text", version: 2 },
            }
          : profile
      ),
      registrations: registry.registrations.map((registration, index) =>
        index === 0
          ? {
              ...registration,
              defaultProfile: { id: "fixture.text", version: 2 },
            }
          : registration
      ),
    };
    const driverVersion: FieldTypeProfileRegistry = {
      ...registry,
      profiles: registry.profiles.map((profile, index) =>
        index === 2
          ? {
              ...profile,
              driver: { ...profile.driver, version: 3 },
            }
          : profile
      ),
    };

    const original = computeFieldTypeProfileRegistryHash(registry);
    expect(computeFieldTypeProfileRegistryHash(registryVersion)).not.toBe(
      original
    );
    expect(computeFieldTypeProfileRegistryHash(profileVersion)).not.toBe(
      original
    );
    expect(computeFieldTypeProfileRegistryHash(driverVersion)).not.toBe(
      original
    );
  });

  it("normalizes nested named sets but preserves ordered wrapper preconditions", () => {
    const expanded: FieldTypeProfileRegistry = {
      ...registry,
      profiles: registry.profiles.map((profile, index) =>
        index === 5
          ? {
              ...profile,
              driver: {
                ...profile.driver,
                capabilities: ["expand-item", "add-item"],
              },
              unknowns: [
                {
                  aspect: "semantic-role",
                  reason: "Unmodelled decorative roles may still exist.",
                  evidence: "declared",
                },
                {
                  aspect: "runtime-states",
                  reason: "Conditional disabled states are scenario-specific.",
                  evidence: "declared",
                },
              ],
            }
          : profile
      ),
      wrappers: registry.wrappers.map((wrapper) => ({
        ...wrapper,
        parts: [
          ...wrapper.parts,
          {
            name: "wrapper-confirm",
            role: "button",
            cardinality: "one",
            evidence: "declared",
          },
        ],
        preconditions: [
          ...wrapper.preconditions,
          {
            kind: "activate",
            part: "wrapper-confirm",
            operation: "click",
            evidence: "declared",
          },
        ],
      })),
    };
    const setReordered: FieldTypeProfileRegistry = {
      ...expanded,
      profiles: expanded.profiles.map((profile, index) =>
        index === 5
          ? {
              ...profile,
              parts: [...profile.parts].reverse(),
              driver: {
                ...profile.driver,
                capabilities: [...profile.driver.capabilities].reverse(),
              },
              unknowns: [...profile.unknowns].reverse(),
            }
          : profile
      ),
      wrappers: expanded.wrappers.map((wrapper) => ({
        ...wrapper,
        parts: [...wrapper.parts].reverse(),
      })),
    };
    const orderedReversed: FieldTypeProfileRegistry = {
      ...expanded,
      wrappers: expanded.wrappers.map((wrapper) => ({
        ...wrapper,
        preconditions: [...wrapper.preconditions].reverse(),
      })),
    };

    expect(computeFieldTypeProfileRegistryHash(setReordered)).toBe(
      computeFieldTypeProfileRegistryHash(expanded)
    );
    expect(computeFieldTypeProfileRegistryHash(orderedReversed)).not.toBe(
      computeFieldTypeProfileRegistryHash(expanded)
    );
  });
});
