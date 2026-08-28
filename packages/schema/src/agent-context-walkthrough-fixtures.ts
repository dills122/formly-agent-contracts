import { createHash } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import {
  AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
  createAgentContextArtifactSet,
  parseAgentContextArtifactSet,
  type AgentContextArtifactReference,
  type AgentContextArtifactSet,
  type AgentContextWorkspaceIndexReference,
  type Sha256Digest,
} from "./agent-context-artifacts.js";
import {
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  createAgentContextExecutionAuthority,
  parseAgentContextExecutionAuthority,
  type AgentContextExecutionAuthority,
  type AgentContextExecutionBasis,
} from "./agent-context-execution-authority.js";
import {
  AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
  AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
  createAgentContextJourneyCatalog,
  createAgentContextSourceUsageCatalog,
  parseAgentContextJourneyCatalog,
  parseAgentContextSourceUsageCatalog,
  validateAgentContextUsageJourneyReferences,
  type AgentContextFormReference,
  type AgentContextJourneyCatalog,
  type AgentContextSourceUsageCatalog,
  type AgentContextUsageReference,
} from "./agent-context-usage.js";
import { canonicalStringify, createFormContract } from "./canonical-json.js";
import {
  FORM_CONTRACT_SCHEMA_ID,
  FORM_CONTRACT_SCHEMA_VERSION,
  type ContractEvidence,
  type ContractInteractionProfile,
  type ContractLocator,
  type ContractNode,
  type FormContract,
} from "./contract.js";
import { CROSS_FIELD_EFFECT_SCHEMA_VERSION } from "./cross-field-effect.js";
import type {
  FieldTypeProfileDriver,
  FieldTypeProfileInteraction,
  FieldTypeProfilePart,
} from "./field-type-interaction.js";
import { FIELD_TYPE_PROFILE_SCHEMA_VERSION } from "./field-type-profile.js";
import { parseFormContract } from "./validation.js";

type DeclaredUsageReference = Extract<
  AgentContextUsageReference,
  { readonly kind: "declared" }
>;

export interface SyntheticRh05WalkthroughFixture {
  readonly kind: "synthetic";
  readonly id: string;
  readonly researchBasis: "RH-05 walkthrough 1" | "RH-05 walkthrough 2";
  readonly polarity: "positive" | "negative";
  readonly usage: DeclaredUsageReference;
  readonly journey: {
    readonly id: string;
    readonly version: number;
  };
  readonly stepId: string;
  readonly focusNodeIds: readonly string[];
  readonly expectedNodeIds: readonly string[];
  readonly declaredContract: FormContract;
  readonly resolvedContract: FormContract;
  readonly executionAuthority: AgentContextExecutionAuthority;
}

export interface SyntheticRh05AgentContextFixtureSet {
  readonly kind: "synthetic";
  readonly id: "synthetic.rh05.agent-context-fixture-set";
  readonly researchBasis: "RH-05";
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly artifactSet: AgentContextArtifactSet;
  readonly sourceUsageCatalog: AgentContextSourceUsageCatalog;
  readonly journeyCatalog: AgentContextJourneyCatalog;
  readonly walkthroughs: {
    readonly positive: SyntheticRh05WalkthroughFixture;
    readonly negative: SyntheticRh05WalkthroughFixture;
  };
}

interface ProfileInput {
  readonly id: string;
  readonly semanticType: string;
  readonly parts: readonly FieldTypeProfilePart[];
  readonly interaction: FieldTypeProfileInteraction;
  readonly driver: FieldTypeProfileDriver;
  readonly targetProperties?: ContractInteractionProfile["effectCapabilities"]["targetProperties"];
  readonly readiness?: ContractInteractionProfile["effectCapabilities"]["readiness"];
}

interface NodeInput {
  readonly id: string;
  readonly modelPath: readonly string[];
  readonly formlyType: string;
  readonly semanticType: string;
  readonly evidence: ContractEvidence;
  readonly label: string;
  readonly constraints?: ContractNode["constraints"];
  readonly options?: ContractNode["options"];
  readonly optionSource?: ContractNode["optionSource"];
  readonly valueDomain?: ContractNode["valueDomain"];
  readonly interactionProfile?: ContractInteractionProfile;
  readonly dynamicRules?: ContractNode["dynamicRules"];
  readonly state?: ContractNode["state"];
  readonly locators: readonly ContractLocator[];
}

const SYNTHETIC_ID_PREFIX = "synthetic.rh05.";
const SYNTHETIC_EVIDENCE_PREFIX = "synthetic:rh05:";
const MAX_DATA_GRAPH_DEPTH = 128;
const MAX_DATA_GRAPH_NODES = 100_000;
const POSITIVE_FORM_ID = "synthetic.rh05.operations.purchase-order";
const POSITIVE_PROJECT_ID = "synthetic.rh05.order-app";
const POSITIVE_USAGE_ID =
  "synthetic.rh05.test-app.catalog.operations.purchase-order";
const POSITIVE_JOURNEY_ID = "synthetic.rh05.operations.purchase-order";
const POSITIVE_STEP_ID = "synthetic.rh05.operations.purchase-order.step-one";
const NEGATIVE_FORM_ID = "synthetic.rh05.claims.intake";
const NEGATIVE_PROJECT_ID = "synthetic.rh05.claims-app";
const NEGATIVE_USAGE_ID = "synthetic.rh05.test-app.page.claims-intake-step-one";
const NEGATIVE_JOURNEY_ID = "synthetic.rh05.claims.intake";
const NEGATIVE_STEP_ID = "synthetic.rh05.claims.intake.step-one";

const POSITIVE_NODES = {
  supplier: `${POSITIVE_FORM_ID}::path:s_supplier`,
  currency: `${POSITIVE_FORM_ID}::path:s_currency`,
  total: `${POSITIVE_FORM_ID}::path:s_total`,
} as const;

const NEGATIVE_NODES = {
  product: `${NEGATIVE_FORM_ID}::path:s_claimDetails.s_product`,
  caseType: `${NEGATIVE_FORM_ID}::path:s_claimDetails.s_caseType`,
  otherDetails: `${NEGATIVE_FORM_ID}::path:s_claimDetails.s_otherDetails`,
} as const;

function syntheticDigest(id: string): Sha256Digest {
  return `sha256:${createHash("sha256")
    .update(canonicalStringify({ kind: "synthetic", id }))
    .digest("hex")}`;
}

function applicationDriver(
  id: string,
  capabilities: FieldTypeProfileDriver["capabilities"]
): FieldTypeProfileDriver {
  return {
    kind: "application",
    id,
    version: 1,
    capabilities,
  };
}

function profile(input: ProfileInput): ContractInteractionProfile {
  return {
    profile: { id: input.id, version: 1 },
    semanticType: input.semanticType,
    valueShape: "scalar",
    evidence: "declared",
    parts: input.parts,
    interaction: input.interaction,
    driver: input.driver,
    effectCapabilities: {
      targetProperties: input.targetProperties ?? [],
      readiness: input.readiness ?? [],
    },
    preconditions: [],
    unknowns: [],
    provenance: [`${SYNTHETIC_EVIDENCE_PREFIX}field-profile`],
  };
}

function part(
  name: string,
  role: string,
  cardinality: "one" | "many" = "one"
): FieldTypeProfilePart {
  return { name, role, cardinality, evidence: "declared" };
}

function fillProfile(
  id: string,
  semanticType: string,
  driverId: string
): ContractInteractionProfile {
  return profile({
    id,
    semanticType,
    parts: [part("control", "textbox")],
    interaction: {
      kind: "fill",
      operation: "fill",
      controlPart: "control",
    },
    driver: applicationDriver(driverId, ["fill"]),
  });
}

function selectProfile(
  id: string,
  semanticType: string,
  driverId: string
): ContractInteractionProfile {
  return profile({
    id,
    semanticType,
    parts: [part("control", "combobox"), part("option", "option", "many")],
    interaction: {
      kind: "choice",
      operation: "select-option",
      optionPart: "option",
    },
    driver: applicationDriver(driverId, ["select-option"]),
    targetProperties: ["options"],
  });
}

function overlayProfile(): ContractInteractionProfile {
  const readinessId = "synthetic.rh05.claims.case-type.profile-options-ready";
  return profile({
    id: "synthetic.rh05.profile.dependent-select",
    semanticType: "single-choice",
    parts: [
      part("trigger", "button"),
      part("popup", "listbox"),
      part("option", "option", "many"),
    ],
    interaction: {
      kind: "choice",
      operation: "select-from-overlay",
      triggerPart: "trigger",
      popupPart: "popup",
      optionPart: "option",
    },
    driver: applicationDriver("synthetic.rh05.driver.dependent-select", [
      "select-from-overlay",
    ]),
    targetProperties: ["options"],
    readiness: [
      {
        id: readinessId,
        targetProperty: "options",
        evidence: "declared",
      },
    ],
  });
}

function testIdLocator(
  target: string,
  value: string,
  evidence: ContractEvidence
): ContractLocator {
  return {
    target,
    strategy: "testId",
    attribute: "data-testid",
    value,
    evidence,
    confidence: "exact",
  };
}

function controlNode(input: NodeInput): ContractNode {
  return {
    id: input.id,
    kind: "control",
    modelPath: input.modelPath,
    formlyType: input.formlyType,
    semanticType: input.semanticType,
    evidence: input.evidence,
    presentation: { label: input.label },
    wrappers: [],
    constraints: input.constraints ?? [],
    options: input.options ?? [],
    ...(input.optionSource === undefined
      ? {}
      : { optionSource: input.optionSource }),
    ...(input.valueDomain === undefined
      ? {}
      : { valueDomain: input.valueDomain }),
    ...(input.interactionProfile === undefined
      ? {}
      : { interactionProfile: input.interactionProfile }),
    conditions: [],
    dynamicRules: input.dynamicRules ?? [],
    ...(input.state === undefined ? {} : { state: input.state }),
    locators: input.locators,
    children: [],
  };
}

function positiveContract(evidence: "declared" | "resolved"): FormContract {
  const resolved = evidence === "resolved";
  const supplierControl = "synthetic.rh05.purchase-order.supplier.control";
  const currencyControl = "synthetic.rh05.purchase-order.currency.control";
  const totalControl = "synthetic.rh05.purchase-order.total.control";
  const totalValidation = "synthetic.rh05.purchase-order.total.validation.min";
  const totalCommittedValue =
    "synthetic.rh05.purchase-order.total.committed-value";

  return createFormContract({
    schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
    formId: POSITIVE_FORM_ID,
    fieldTypeProfileRegistry: {
      schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
      id: "synthetic.rh05.field-type-profiles",
      version: 1,
      contentHash: syntheticDigest("field-type-profile-registry"),
    },
    nodes: [
      controlNode({
        id: POSITIVE_NODES.supplier,
        modelPath: ["supplier"],
        formlyType: "synthetic-supplier-select",
        semanticType: "single-choice",
        evidence,
        label: "Synthetic supplier",
        constraints: [{ kind: "required" }],
        options: resolved
          ? [
              { label: "Synthetic Supplier A", value: "synthetic-supplier-a" },
              { label: "Synthetic Supplier B", value: "synthetic-supplier-b" },
            ]
          : [],
        optionSource: {
          kind: "async",
          property: "props.options",
          evidence,
        },
        valueDomain: resolved
          ? {
              kind: "enumerated",
              source: "resolved-options",
              completeness: "scenario",
              evidence,
              values: ["synthetic-supplier-a", "synthetic-supplier-b"],
            }
          : { kind: "dynamic", source: "async", evidence },
        ...(resolved
          ? {
              interactionProfile: selectProfile(
                "synthetic.rh05.profile.supplier-select",
                "single-choice",
                "synthetic.rh05.driver.supplier-select"
              ),
              state: { disabled: false },
            }
          : {}),
        locators: [
          testIdLocator(
            supplierControl,
            "synthetic-purchase-order-supplier",
            evidence
          ),
        ],
      }),
      controlNode({
        id: POSITIVE_NODES.currency,
        modelPath: ["currency"],
        formlyType: "synthetic-select",
        semanticType: "single-choice",
        evidence,
        label: "Synthetic currency",
        constraints: [{ kind: "required" }],
        options: [
          { label: "Canadian Dollar", value: "CAD" },
          { label: "US Dollar", value: "USD" },
        ],
        optionSource: { kind: "static", evidence },
        valueDomain: {
          kind: "enumerated",
          source: "static-options",
          completeness: "complete",
          evidence,
          values: ["CAD", "USD"],
        },
        interactionProfile: selectProfile(
          "synthetic.rh05.profile.currency-select",
          "single-choice",
          "synthetic.rh05.driver.currency-select"
        ),
        locators: [
          testIdLocator(
            currencyControl,
            "synthetic-purchase-order-currency",
            evidence
          ),
        ],
      }),
      controlNode({
        id: POSITIVE_NODES.total,
        modelPath: ["total"],
        formlyType: "synthetic-currency",
        semanticType: "decimal-currency",
        evidence,
        label: "Synthetic total",
        constraints: [{ kind: "required" }, { kind: "min", value: 0 }],
        interactionProfile: fillProfile(
          "synthetic.rh05.profile.currency-input",
          "decimal-currency",
          "synthetic.rh05.driver.currency-input"
        ),
        locators: [
          testIdLocator(
            totalControl,
            "synthetic-purchase-order-total",
            evidence
          ),
          testIdLocator(
            totalValidation,
            "synthetic-purchase-order-total-min-error",
            evidence
          ),
          testIdLocator(
            totalCommittedValue,
            "synthetic-purchase-order-total-committed-value",
            evidence
          ),
        ],
      }),
    ],
    diagnostics: [],
  });
}

function negativeEffects() {
  return [
    {
      identity: {
        id: "synthetic.rh05.claims.case-type-controls-other-details",
        version: 1,
      },
      trigger: {
        nodeId: NEGATIVE_NODES.caseType,
        event: "selectionChanged" as const,
      },
      target: {
        nodeId: NEGATIVE_NODES.otherDetails,
        property: "visibility" as const,
      },
      kind: "controls-state" as const,
      timing: { mode: "sync" as const },
      ordering: "source-before-target" as const,
      evidence: "declared" as const,
      opacity: "transparent" as const,
    },
    {
      identity: {
        id: "synthetic.rh05.claims.product-filters-case-type",
        version: 1,
      },
      trigger: {
        nodeId: NEGATIVE_NODES.product,
        event: "selectionChanged" as const,
      },
      target: {
        nodeId: NEGATIVE_NODES.caseType,
        property: "options" as const,
      },
      kind: "filters" as const,
      timing: { mode: "sync" as const },
      ordering: "source-before-target" as const,
      evidence: "declared" as const,
      opacity: "transparent" as const,
    },
  ];
}

function negativeContract(evidence: "declared" | "resolved"): FormContract {
  const resolved = evidence === "resolved";
  const productControl = "synthetic.rh05.claims.product.control";
  const caseTypeTrigger = "synthetic.rh05.claims.case-type.trigger";
  const caseTypePopup = "synthetic.rh05.claims.case-type.popup";
  const caseTypeOption = "synthetic.rh05.claims.case-type.option";
  const otherControl = "synthetic.rh05.claims.other-details.control";
  const otherWrapper = "synthetic.rh05.claims.other-details.wrapper";
  const otherValidation =
    "synthetic.rh05.claims.other-details.validation.required";

  return createFormContract({
    schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
    formId: NEGATIVE_FORM_ID,
    fieldTypeProfileRegistry: {
      schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
      id: "synthetic.rh05.field-type-profiles",
      version: 1,
      contentHash: syntheticDigest("field-type-profile-registry"),
    },
    crossFieldEffectRegistry: {
      schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
      id: "synthetic.rh05.cross-field-effects",
      version: 1,
      contentHash: syntheticDigest("cross-field-effect-registry"),
    },
    declaredEffects: negativeEffects(),
    effectAnalysis: {
      completeness: "incomplete",
      reasons: ["opaque-dynamic-rule"],
    },
    nodes: [
      controlNode({
        id: NEGATIVE_NODES.product,
        modelPath: ["claimDetails", "product"],
        formlyType: "synthetic-select",
        semanticType: "single-choice",
        evidence,
        label: "Synthetic product",
        constraints: [{ kind: "required" }],
        options: [
          { label: "Auto", value: "auto" },
          { label: "Home", value: "home" },
        ],
        optionSource: { kind: "static", evidence },
        valueDomain: {
          kind: "enumerated",
          source: "static-options",
          completeness: "complete",
          evidence,
          values: ["auto", "home"],
        },
        interactionProfile: selectProfile(
          "synthetic.rh05.profile.product-select",
          "single-choice",
          "synthetic.rh05.driver.product-select"
        ),
        locators: [
          testIdLocator(productControl, "synthetic-claims-product", evidence),
        ],
      }),
      controlNode({
        id: NEGATIVE_NODES.caseType,
        modelPath: ["claimDetails", "caseType"],
        formlyType: "synthetic-dependent-select",
        semanticType: "single-choice",
        evidence,
        label: "Synthetic case type",
        constraints: [{ kind: "required" }],
        options: resolved
          ? [
              { label: "Collision", value: "collision" },
              { label: "Other", value: "other" },
            ]
          : [],
        optionSource: {
          kind: "dynamic",
          property: "props.options",
          source: "function",
          evidence,
        },
        valueDomain: resolved
          ? {
              kind: "enumerated",
              source: "resolved-options",
              completeness: "scenario",
              evidence,
              values: ["collision", "other"],
            }
          : { kind: "dynamic", source: "function", evidence },
        ...(resolved
          ? {
              interactionProfile: overlayProfile(),
              state: { disabled: false },
            }
          : {}),
        dynamicRules: [
          {
            id: `${NEGATIVE_NODES.caseType}::rule:expressions:props.options`,
            property: "props.options",
            source: "function",
            evidence,
            ...(resolved ? { resolvedValue: ["collision", "other"] } : {}),
          },
        ],
        locators: [
          testIdLocator(
            caseTypeTrigger,
            "synthetic-claims-case-type-trigger",
            evidence
          ),
          testIdLocator(
            caseTypePopup,
            "synthetic-claims-case-type-popup",
            evidence
          ),
          testIdLocator(
            caseTypeOption,
            "synthetic-claims-case-type-option",
            evidence
          ),
        ],
      }),
      controlNode({
        id: NEGATIVE_NODES.otherDetails,
        modelPath: ["claimDetails", "otherDetails"],
        formlyType: "synthetic-textarea",
        semanticType: "multiline-text",
        evidence,
        label: "Synthetic other case details",
        constraints: [{ kind: "required" }],
        interactionProfile: fillProfile(
          "synthetic.rh05.profile.other-details",
          "multiline-text",
          "synthetic.rh05.driver.other-details"
        ),
        dynamicRules: [
          {
            id: `${NEGATIVE_NODES.otherDetails}::rule:hideExpression:hide`,
            property: "hide",
            source: "function",
            evidence,
            ...(resolved ? { resolvedValue: false } : {}),
          },
        ],
        ...(resolved ? { state: { hidden: false } } : {}),
        locators: [
          testIdLocator(
            otherControl,
            "synthetic-claims-other-details",
            evidence
          ),
          testIdLocator(
            otherWrapper,
            "synthetic-claims-other-details-wrapper",
            evidence
          ),
          testIdLocator(
            otherValidation,
            "synthetic-claims-other-details-required-error",
            evidence
          ),
        ],
      }),
    ],
    diagnostics: [],
  });
}

function formReference(
  projectId: string,
  contract: FormContract
): AgentContextFormReference {
  return {
    projectId,
    formId: contract.formId,
    contractHash: contract.contentHash as Sha256Digest,
  };
}

function usageReference(usageId: string): DeclaredUsageReference {
  return { kind: "declared", usageId, version: 1 };
}

function createUsageCatalog(
  workspaceIndex: AgentContextWorkspaceIndexReference,
  positiveDeclared: FormContract,
  negativeDeclared: FormContract
): AgentContextSourceUsageCatalog {
  const positiveUsage = usageReference(POSITIVE_USAGE_ID);
  const negativeUsage = usageReference(NEGATIVE_USAGE_ID);
  return createAgentContextSourceUsageCatalog({
    schemaVersion: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    workspaceIndex,
    coverage: {
      status: "incomplete",
      scope: {
        projectIds: [POSITIVE_PROJECT_ID, NEGATIVE_PROJECT_ID],
        includedPurposes: ["test"],
        excludedPurposes: [],
      },
      reasons: ["synthetic-fixture-only"],
      evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}coverage`],
    },
    usages: [
      {
        identity: positiveUsage,
        projectId: POSITIVE_PROJECT_ID,
        invocation: {
          location: {
            kind: "opaque",
            fileId: "synthetic.rh05.virtual-source.purchase-order",
          },
          symbol: {
            id: "synthetic.rh05.create-purchase-order-fields",
            kind: "callable-const",
          },
          syntaxKind: "call",
          syntaxToken: {
            kind: "ast-call-shape",
            version: 1,
            calleeForm: "identifier",
            argumentCount: 0,
            typeArgumentCount: 0,
            optionalCall: false,
          },
          sourceFileHash: syntheticDigest("positive-virtual-source"),
        },
        resolution: {
          status: "exact",
          candidate: {
            root: {
              projectId: POSITIVE_PROJECT_ID,
              rootAnchorId: "synthetic.rh05.root.purchase-order",
            },
            form: formReference(POSITIVE_PROJECT_ID, positiveDeclared),
            evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}positive-resolution`],
          },
        },
        contexts: [
          {
            kind: "catalog",
            id: "synthetic.rh05.test-app.form-catalog",
            evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}positive-catalog`],
          },
        ],
        evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}positive-usage`],
      },
      {
        identity: negativeUsage,
        projectId: NEGATIVE_PROJECT_ID,
        invocation: {
          location: {
            kind: "opaque",
            fileId: "synthetic.rh05.virtual-source.claims-intake",
          },
          symbol: {
            id: "synthetic.rh05.create-claim-details-fields",
            kind: "callable-const",
          },
          syntaxKind: "call",
          syntaxToken: {
            kind: "ast-call-shape",
            version: 1,
            calleeForm: "identifier",
            argumentCount: 0,
            typeArgumentCount: 0,
            optionalCall: false,
          },
          sourceFileHash: syntheticDigest("negative-virtual-source"),
        },
        resolution: {
          status: "exact",
          candidate: {
            root: {
              projectId: NEGATIVE_PROJECT_ID,
              rootAnchorId: "synthetic.rh05.root.claims-intake",
            },
            form: formReference(NEGATIVE_PROJECT_ID, negativeDeclared),
            evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}negative-resolution`],
          },
        },
        contexts: [
          {
            kind: "component",
            id: "synthetic.rh05.claims-intake-page",
            evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}negative-component`],
          },
          {
            kind: "route",
            id: "synthetic.rh05.claims-intake-route",
            evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}negative-route`],
          },
        ],
        evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}negative-usage`],
      },
    ],
  });
}

function createJourneyCatalog(
  workspaceIndex: AgentContextWorkspaceIndexReference,
  positiveDeclared: FormContract,
  negativeDeclared: FormContract
): AgentContextJourneyCatalog {
  const positiveUsage = usageReference(POSITIVE_USAGE_ID);
  const negativeUsage = usageReference(NEGATIVE_USAGE_ID);
  return createAgentContextJourneyCatalog({
    schemaVersion: AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
    workspaceIndex,
    journeys: [
      {
        id: POSITIVE_JOURNEY_ID,
        version: 1,
        entry: {
          id: "synthetic.rh05.operations.purchase-order.open",
          usage: positiveUsage,
          landingStepId: POSITIVE_STEP_ID,
          evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}positive-entry`],
        },
        steps: [
          {
            id: POSITIVE_STEP_ID,
            ordinal: 1,
            label: "Synthetic order entry step one",
            forms: [formReference(POSITIVE_PROJECT_ID, positiveDeclared)],
            usages: [positiveUsage],
            actionIds: [],
          },
        ],
        actions: [],
        outcomes: [],
        transitions: [],
        evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}positive-journey`],
      },
      {
        id: NEGATIVE_JOURNEY_ID,
        version: 1,
        entry: {
          id: "synthetic.rh05.claims.intake.open",
          usage: negativeUsage,
          landingStepId: NEGATIVE_STEP_ID,
          evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}negative-entry`],
        },
        steps: [
          {
            id: NEGATIVE_STEP_ID,
            ordinal: 1,
            label: "Synthetic claim intake step one",
            forms: [formReference(NEGATIVE_PROJECT_ID, negativeDeclared)],
            usages: [negativeUsage],
            actionIds: [],
          },
        ],
        actions: [],
        outcomes: [],
        transitions: [],
        evidenceRefs: [`${SYNTHETIC_EVIDENCE_PREFIX}negative-journey`],
      },
    ],
  });
}

function positiveAuthority(
  declared: FormContract,
  resolved: FormContract
): AgentContextExecutionAuthority {
  const basis: AgentContextExecutionBasis = {
    formId: declared.formId,
    contractHash: declared.contentHash as Sha256Digest,
  };
  const supplierInteraction = "synthetic.rh05.purchase-order.supplier.select";
  const currencyInteraction = "synthetic.rh05.purchase-order.currency.select";
  const totalInteraction = "synthetic.rh05.purchase-order.total.fill";
  const supplierDriver = {
    kind: "application",
    id: "synthetic.rh05.driver.supplier-select",
    version: 1,
  } as const;
  const currencyDriver = {
    kind: "application",
    id: "synthetic.rh05.driver.currency-select",
    version: 1,
  } as const;
  const totalDriver = {
    kind: "application",
    id: "synthetic.rh05.driver.currency-input",
    version: 1,
  } as const;
  const blurId = "synthetic.rh05.purchase-order.total.blur";

  return createAgentContextExecutionAuthority({
    schemaVersion: AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
    basis,
    scenario: {
      id: "synthetic.rh05.suppliers-ready",
      version: 1,
      artifactHash: resolved.contentHash as Sha256Digest,
      basis,
    },
    physicalOperations: [
      {
        id: blurId,
        nodeId: POSITIVE_NODES.total,
        mechanic: "blur",
        partRef: "control",
        locatorTargetRef: "synthetic.rh05.purchase-order.total.control",
      },
    ],
    readiness: [
      {
        id: "synthetic.rh05.purchase-order.supplier.options-ready",
        nodeId: POSITIVE_NODES.supplier,
        owner: { kind: "interaction", interactionId: supplierInteraction },
        operation: "wait-readiness",
        driver: supplierDriver,
        partRef: "control",
        locatorTargetRef: "synthetic.rh05.purchase-order.supplier.control",
      },
    ],
    interactions: [
      {
        id: supplierInteraction,
        nodeId: POSITIVE_NODES.supplier,
        stepId: POSITIVE_STEP_ID,
        profile: {
          id: "synthetic.rh05.profile.supplier-select",
          version: 1,
        },
        driver: supplierDriver,
        operation: "select-option",
        targets: [
          {
            purpose: "control",
            partRef: "control",
            locatorTargetRef: "synthetic.rh05.purchase-order.supplier.control",
          },
        ],
        readinessIds: ["synthetic.rh05.purchase-order.supplier.options-ready"],
      },
      {
        id: currencyInteraction,
        nodeId: POSITIVE_NODES.currency,
        stepId: POSITIVE_STEP_ID,
        profile: {
          id: "synthetic.rh05.profile.currency-select",
          version: 1,
        },
        driver: currencyDriver,
        operation: "select-option",
        targets: [
          {
            purpose: "control",
            partRef: "control",
            locatorTargetRef: "synthetic.rh05.purchase-order.currency.control",
          },
        ],
        readinessIds: [],
      },
      {
        id: totalInteraction,
        nodeId: POSITIVE_NODES.total,
        stepId: POSITIVE_STEP_ID,
        profile: {
          id: "synthetic.rh05.profile.currency-input",
          version: 1,
        },
        driver: totalDriver,
        operation: "fill",
        targets: [
          {
            purpose: "control",
            partRef: "control",
            locatorTargetRef: "synthetic.rh05.purchase-order.total.control",
          },
        ],
        readinessIds: [],
      },
    ],
    commits: [
      {
        id: "synthetic.rh05.purchase-order.supplier.commit",
        nodeId: POSITIVE_NODES.supplier,
        interactionId: supplierInteraction,
        operation: "commit-value",
        kind: "node-local",
        mode: "immediate",
        execution: "included-in-set",
      },
      {
        id: "synthetic.rh05.purchase-order.currency.commit",
        nodeId: POSITIVE_NODES.currency,
        interactionId: currencyInteraction,
        operation: "commit-value",
        kind: "node-local",
        mode: "immediate",
        execution: "included-in-set",
      },
      {
        id: "synthetic.rh05.purchase-order.total.commit-on-blur",
        nodeId: POSITIVE_NODES.total,
        interactionId: totalInteraction,
        operation: "commit-value",
        kind: "node-local",
        mode: "blur",
        execution: "explicit-intent",
        physicalOperationId: blurId,
      },
    ],
    validationSurfaces: [
      {
        id: "synthetic.rh05.purchase-order.total.min",
        nodeId: POSITIVE_NODES.total,
        constraintId: "min",
        activation: {
          kind: "node-local",
          id: "synthetic.rh05.purchase-order.total.min.on-blur",
          operation: "activate-validation",
          physicalOperationId: blurId,
        },
        assertion: {
          id: "synthetic.rh05.purchase-order.total.min.assertion",
          operation: "assert-validation",
          partRef: "validation-message",
          locatorTargetRef:
            "synthetic.rh05.purchase-order.total.validation.min",
        },
      },
    ],
    valueAssertions: [
      {
        id: "synthetic.rh05.purchase-order.total.committed-value",
        nodeId: POSITIVE_NODES.total,
        operation: "assert-value",
        kind: "committed-model-value",
        partRef: "model-value",
        locatorTargetRef: "synthetic.rh05.purchase-order.total.committed-value",
      },
    ],
    stateAssertions: [],
    usage: {
      id: POSITIVE_USAGE_ID,
      version: 1,
      basis,
      entry: {
        id: "synthetic.rh05.operations.purchase-order.open",
        operation: "open-usage",
        landingStepId: POSITIVE_STEP_ID,
        driver: {
          kind: "application",
          id: "synthetic.rh05.driver.catalog-entry",
          version: 1,
        },
      },
      steps: [
        {
          id: POSITIVE_STEP_ID,
          ordinal: 1,
          nodeIds: Object.values(POSITIVE_NODES),
          actionIds: [],
        },
      ],
      actions: [],
      outcomes: [],
      transitions: [],
    },
    repeaterCaptures: [],
  });
}

function negativeAuthority(
  declared: FormContract,
  resolved: FormContract
): AgentContextExecutionAuthority {
  const basis: AgentContextExecutionBasis = {
    formId: declared.formId,
    contractHash: declared.contentHash as Sha256Digest,
  };
  const productInteraction = "synthetic.rh05.claims.product.select";
  const caseTypeInteraction = "synthetic.rh05.claims.case-type.select";
  const otherInteraction = "synthetic.rh05.claims.other-details.fill";
  const productDriver = {
    kind: "application",
    id: "synthetic.rh05.driver.product-select",
    version: 1,
  } as const;
  const caseTypeDriver = {
    kind: "application",
    id: "synthetic.rh05.driver.dependent-select",
    version: 1,
  } as const;
  const otherDriver = {
    kind: "application",
    id: "synthetic.rh05.driver.other-details",
    version: 1,
  } as const;
  const blurId = "synthetic.rh05.claims.other-details.blur";

  return createAgentContextExecutionAuthority({
    schemaVersion: AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
    basis,
    scenario: {
      id: "synthetic.rh05.auto-other",
      version: 1,
      artifactHash: resolved.contentHash as Sha256Digest,
      basis,
    },
    physicalOperations: [
      {
        id: blurId,
        nodeId: NEGATIVE_NODES.otherDetails,
        mechanic: "blur",
        partRef: "control",
        locatorTargetRef: "synthetic.rh05.claims.other-details.control",
      },
    ],
    readiness: [
      {
        id: "synthetic.rh05.claims.case-type.options-ready",
        nodeId: NEGATIVE_NODES.caseType,
        owner: { kind: "interaction", interactionId: caseTypeInteraction },
        operation: "wait-readiness",
        driver: caseTypeDriver,
        partRef: "popup",
        locatorTargetRef: "synthetic.rh05.claims.case-type.popup",
      },
    ],
    interactions: [
      {
        id: productInteraction,
        nodeId: NEGATIVE_NODES.product,
        stepId: NEGATIVE_STEP_ID,
        profile: {
          id: "synthetic.rh05.profile.product-select",
          version: 1,
        },
        driver: productDriver,
        operation: "select-option",
        targets: [
          {
            purpose: "control",
            partRef: "control",
            locatorTargetRef: "synthetic.rh05.claims.product.control",
          },
        ],
        readinessIds: [],
      },
      {
        id: caseTypeInteraction,
        nodeId: NEGATIVE_NODES.caseType,
        stepId: NEGATIVE_STEP_ID,
        profile: {
          id: "synthetic.rh05.profile.dependent-select",
          version: 1,
        },
        driver: caseTypeDriver,
        operation: "select-from-overlay",
        targets: [
          {
            purpose: "trigger",
            partRef: "trigger",
            locatorTargetRef: "synthetic.rh05.claims.case-type.trigger",
          },
          {
            purpose: "popup",
            partRef: "popup",
            locatorTargetRef: "synthetic.rh05.claims.case-type.popup",
          },
          {
            purpose: "option",
            partRef: "option",
            locatorTargetRef: "synthetic.rh05.claims.case-type.option",
          },
        ],
        readinessIds: ["synthetic.rh05.claims.case-type.options-ready"],
      },
      {
        id: otherInteraction,
        nodeId: NEGATIVE_NODES.otherDetails,
        stepId: NEGATIVE_STEP_ID,
        profile: {
          id: "synthetic.rh05.profile.other-details",
          version: 1,
        },
        driver: otherDriver,
        operation: "fill",
        targets: [
          {
            purpose: "control",
            partRef: "control",
            locatorTargetRef: "synthetic.rh05.claims.other-details.control",
          },
        ],
        readinessIds: [],
      },
    ],
    commits: [
      {
        id: "synthetic.rh05.claims.product.commit",
        nodeId: NEGATIVE_NODES.product,
        interactionId: productInteraction,
        operation: "commit-value",
        kind: "node-local",
        mode: "immediate",
        execution: "included-in-set",
      },
      {
        id: "synthetic.rh05.claims.case-type.commit",
        nodeId: NEGATIVE_NODES.caseType,
        interactionId: caseTypeInteraction,
        operation: "commit-value",
        kind: "node-local",
        mode: "immediate",
        execution: "included-in-set",
      },
      {
        id: "synthetic.rh05.claims.other-details.commit",
        nodeId: NEGATIVE_NODES.otherDetails,
        interactionId: otherInteraction,
        operation: "commit-value",
        kind: "node-local",
        mode: "immediate",
        execution: "included-in-set",
      },
    ],
    validationSurfaces: [
      {
        id: "synthetic.rh05.claims.other-details.required",
        nodeId: NEGATIVE_NODES.otherDetails,
        constraintId: "required",
        activation: {
          kind: "node-local",
          id: "synthetic.rh05.claims.other-details.required.on-blur",
          operation: "activate-validation",
          physicalOperationId: blurId,
        },
        assertion: {
          id: "synthetic.rh05.claims.other-details.required.assertion",
          operation: "assert-validation",
          partRef: "validation-message",
          locatorTargetRef:
            "synthetic.rh05.claims.other-details.validation.required",
        },
      },
    ],
    valueAssertions: [],
    stateAssertions: [
      {
        id: "synthetic.rh05.claims.other-details.visible",
        version: 1,
        nodeId: NEGATIVE_NODES.otherDetails,
        operation: "assert-state",
        states: ["visible"],
        driver: {
          kind: "application",
          id: "synthetic.rh05.driver.other-details-state",
          version: 1,
        },
        partRef: "wrapper",
        locatorTargetRef: "synthetic.rh05.claims.other-details.wrapper",
      },
    ],
    usage: {
      id: NEGATIVE_USAGE_ID,
      version: 1,
      basis,
      entry: {
        id: "synthetic.rh05.claims.intake.open",
        operation: "open-usage",
        landingStepId: NEGATIVE_STEP_ID,
        driver: {
          kind: "application",
          id: "synthetic.rh05.driver.claims-page-entry",
          version: 1,
        },
      },
      steps: [
        {
          id: NEGATIVE_STEP_ID,
          ordinal: 1,
          nodeIds: Object.values(NEGATIVE_NODES),
          actionIds: [],
        },
      ],
      actions: [],
      outcomes: [],
      transitions: [],
    },
    repeaterCaptures: [],
  });
}

function artifactReference(
  schemaId: string,
  schemaVersion: string,
  contentHash: string
): AgentContextArtifactReference {
  return {
    schemaId,
    schemaVersion,
    contentHash: contentHash as Sha256Digest,
  };
}

function createArtifactSet(
  workspaceIndex: AgentContextWorkspaceIndexReference,
  sourceUsageCatalog: AgentContextSourceUsageCatalog,
  journeyCatalog: AgentContextJourneyCatalog,
  positive: SyntheticRh05WalkthroughFixture,
  negative: SyntheticRh05WalkthroughFixture
): AgentContextArtifactSet {
  return createAgentContextArtifactSet({
    schemaVersion: AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
    repositoryRevision: "synthetic.ctx-0d.rh05.v1",
    workspaceIndex,
    artifacts: [
      artifactReference(
        AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
        AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
        sourceUsageCatalog.contentHash
      ),
      artifactReference(
        AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
        AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
        journeyCatalog.contentHash
      ),
      ...[positive, negative].flatMap((walkthrough) => [
        artifactReference(
          FORM_CONTRACT_SCHEMA_ID,
          FORM_CONTRACT_SCHEMA_VERSION,
          walkthrough.declaredContract.contentHash
        ),
        artifactReference(
          FORM_CONTRACT_SCHEMA_ID,
          FORM_CONTRACT_SCHEMA_VERSION,
          walkthrough.resolvedContract.contentHash
        ),
        artifactReference(
          AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
          AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
          walkthrough.executionAuthority.contentHash
        ),
      ]),
    ],
  });
}

function walkthrough(
  input: Omit<SyntheticRh05WalkthroughFixture, "kind">
): SyntheticRh05WalkthroughFixture {
  return { kind: "synthetic", ...input };
}

export function createSyntheticRh05AgentContextFixtureSet(): SyntheticRh05AgentContextFixtureSet {
  const workspaceIndex: AgentContextWorkspaceIndexReference = {
    schemaVersion: "0.2.0",
    contentHash: syntheticDigest("workspace-index"),
  };
  const positiveDeclared = positiveContract("declared");
  const positiveResolved = positiveContract("resolved");
  const negativeDeclared = negativeContract("declared");
  const negativeResolved = negativeContract("resolved");
  const positive = walkthrough({
    id: "synthetic.rh05.purchase-order-step-one-positive",
    researchBasis: "RH-05 walkthrough 1",
    polarity: "positive",
    usage: usageReference(POSITIVE_USAGE_ID),
    journey: { id: POSITIVE_JOURNEY_ID, version: 1 },
    stepId: POSITIVE_STEP_ID,
    focusNodeIds: Object.values(POSITIVE_NODES),
    expectedNodeIds: Object.values(POSITIVE_NODES),
    declaredContract: positiveDeclared,
    resolvedContract: positiveResolved,
    executionAuthority: positiveAuthority(positiveDeclared, positiveResolved),
  });
  const negative = walkthrough({
    id: "synthetic.rh05.claim-other-details-required-negative",
    researchBasis: "RH-05 walkthrough 2",
    polarity: "negative",
    usage: usageReference(NEGATIVE_USAGE_ID),
    journey: { id: NEGATIVE_JOURNEY_ID, version: 1 },
    stepId: NEGATIVE_STEP_ID,
    focusNodeIds: [NEGATIVE_NODES.otherDetails],
    expectedNodeIds: Object.values(NEGATIVE_NODES),
    declaredContract: negativeDeclared,
    resolvedContract: negativeResolved,
    executionAuthority: negativeAuthority(negativeDeclared, negativeResolved),
  });
  const sourceUsageCatalog = createUsageCatalog(
    workspaceIndex,
    positiveDeclared,
    negativeDeclared
  );
  const journeyCatalog = createJourneyCatalog(
    workspaceIndex,
    positiveDeclared,
    negativeDeclared
  );
  const fixture: SyntheticRh05AgentContextFixtureSet = {
    kind: "synthetic",
    id: "synthetic.rh05.agent-context-fixture-set",
    researchBasis: "RH-05",
    workspaceIndex,
    artifactSet: createArtifactSet(
      workspaceIndex,
      sourceUsageCatalog,
      journeyCatalog,
      positive,
      negative
    ),
    sourceUsageCatalog,
    journeyCatalog,
    walkthroughs: { positive, negative },
  };
  validateSyntheticRh05AgentContextFixtureSet(fixture);
  return fixture;
}

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

type DataGraphPreflightFrame =
  | {
      readonly kind: "visit";
      readonly input: unknown;
      readonly path: string;
      readonly depth: number;
    }
  | {
      readonly kind: "leave";
      readonly input: object;
    };

function preflightDataGraph(input: unknown, path: string): void {
  const frames: DataGraphPreflightFrame[] = [
    { kind: "visit", input, path, depth: 0 },
  ];
  const ancestors = new Set<object>();
  let scheduledNodeCount = 1;

  while (frames.length > 0) {
    const frame = frames.pop()!;
    if (frame.kind === "leave") {
      ancestors.delete(frame.input);
      continue;
    }

    const inputType = typeof frame.input;
    if (
      ((inputType === "object" && frame.input !== null) ||
        inputType === "function") &&
      nodeUtilTypes.isProxy(frame.input)
    ) {
      fail(frame.path, "must not be a proxy.");
    }
    if (inputType !== "object" || frame.input === null) {
      continue;
    }

    const objectInput = frame.input as object;
    if (ancestors.has(objectInput)) {
      fail(frame.path, "must not contain cyclic data.");
    }
    ancestors.add(objectInput);
    frames.push({ kind: "leave", input: objectInput });

    const isArray = Array.isArray(objectInput);
    const childFrames: DataGraphPreflightFrame[] = [];
    for (const key of Reflect.ownKeys(objectInput)) {
      if (typeof key === "symbol") {
        fail(frame.path, "must not contain symbol keys.");
      }
      if (isArray && key === "length") {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(objectInput, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        continue;
      }

      const childPath = isArray
        ? `${frame.path}[${key}]`
        : `${frame.path}.${key}`;
      const childDepth = frame.depth + 1;
      if (childDepth > MAX_DATA_GRAPH_DEPTH) {
        fail(
          childPath,
          `must not exceed the maximum data graph depth of ${MAX_DATA_GRAPH_DEPTH}.`
        );
      }
      scheduledNodeCount += 1;
      if (scheduledNodeCount > MAX_DATA_GRAPH_NODES) {
        fail(
          childPath,
          `must not exceed the maximum data graph node count of ${MAX_DATA_GRAPH_NODES}.`
        );
      }
      childFrames.push({
        kind: "visit",
        input: descriptor.value,
        path: childPath,
        depth: childDepth,
      });
    }

    for (let index = childFrames.length - 1; index >= 0; index -= 1) {
      frames.push(childFrames[index]!);
    }
  }
}

function detachedOrdinaryData(
  input: unknown,
  path: string,
  ancestors = new WeakSet<object>()
): unknown {
  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "boolean"
  ) {
    return input;
  }
  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      fail(path, "must contain only finite JSON numbers.");
    }
    return input;
  }
  if (typeof input !== "object") {
    fail(path, "must contain only ordinary JSON data.");
  }
  if (nodeUtilTypes.isProxy(input)) {
    fail(path, "must not be a proxy.");
  }
  if (ancestors.has(input)) {
    fail(path, "must not contain cyclic data.");
  }

  const isArray = Array.isArray(input);
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (
    (isArray && prototype !== Array.prototype) ||
    (!isArray && prototype !== Object.prototype)
  ) {
    fail(path, `must be an ordinary ${isArray ? "array" : "object"}.`);
  }

  ancestors.add(input);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key === "symbol")) {
      fail(path, "must not contain symbol keys.");
    }

    if (isArray) {
      const lengthDescriptor = descriptors.length;
      if (
        lengthDescriptor === undefined ||
        !("value" in lengthDescriptor) ||
        typeof lengthDescriptor.value !== "number"
      ) {
        fail(`${path}.length`, "must be an ordinary array length.");
      }
      const length = lengthDescriptor.value;
      const indexKeys = keys.filter(
        (key): key is string => typeof key === "string" && key !== "length"
      );
      for (const key of indexKeys) {
        if (!/^(0|[1-9]\d*)$/u.test(key) || Number(key) >= length) {
          fail(`${path}.${key}`, "is an extra array property.");
        }
      }
      if (indexKeys.length !== length) {
        fail(path, "must not be a sparse array.");
      }

      const output: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (descriptor === undefined) {
          fail(path, "must not be a sparse array.");
        }
        if (!("value" in descriptor)) {
          fail(`${path}[${index}]`, "must not be an accessor property.");
        }
        if (!descriptor.enumerable) {
          fail(`${path}[${index}]`, "must be an enumerable data property.");
        }
        output.push(
          detachedOrdinaryData(descriptor.value, `${path}[${index}]`, ancestors)
        );
      }
      return output;
    }

    const output = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      if (typeof key !== "string") {
        fail(path, "must not contain symbol keys.");
      }
      const descriptor = descriptors[key];
      if (descriptor === undefined || !("value" in descriptor)) {
        fail(`${path}.${key}`, "must not be an accessor property.");
      }
      if (!descriptor.enumerable) {
        fail(`${path}.${key}`, "must be an enumerable data property.");
      }
      output[key] = detachedOrdinaryData(
        descriptor.value,
        `${path}.${key}`,
        ancestors
      );
    }
    return output;
  } finally {
    ancestors.delete(input);
  }
}

function detachedValidatedOrdinaryData(input: unknown, path: string): unknown {
  preflightDataGraph(input, path);
  const detached = detachedOrdinaryData(input, path);
  let roundTripDetached: unknown;
  try {
    const roundTrip = structuredClone(input);
    preflightDataGraph(roundTrip, path);
    roundTripDetached = detachedOrdinaryData(roundTrip, path);
  } catch {
    fail(
      path,
      "must round-trip through structured clone as ordinary JSON data."
    );
  }
  if (canonicalStringify(roundTripDetached) !== canonicalStringify(detached)) {
    fail(
      path,
      "must round-trip through structured clone as identical ordinary JSON data."
    );
  }
  return detached;
}

function fixtureRecord(input: unknown, path: string): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    fail(path, "must be an ordinary object record.");
  }
  return input as Record<string, unknown>;
}

function assertExactFixtureKeys(
  input: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string
): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      fail(`${path}.${key}`, "is an unexpected key.");
    }
  }
  for (const key of allowedKeys) {
    if (!Object.hasOwn(input, key)) {
      fail(`${path}.${key}`, "is required.");
    }
  }
}

function assertStringArray(input: unknown, path: string): void {
  if (!Array.isArray(input)) {
    fail(path, "must be an array of strings.");
  }
  for (const [index, value] of input.entries()) {
    if (typeof value !== "string") {
      fail(`${path}[${index}]`, "must be a string.");
    }
  }
}

const FIXTURE_KEYS = [
  "kind",
  "id",
  "researchBasis",
  "workspaceIndex",
  "artifactSet",
  "sourceUsageCatalog",
  "journeyCatalog",
  "walkthroughs",
] as const;

const WALKTHROUGH_KEYS = [
  "kind",
  "id",
  "researchBasis",
  "polarity",
  "usage",
  "journey",
  "stepId",
  "focusNodeIds",
  "expectedNodeIds",
  "declaredContract",
  "resolvedContract",
  "executionAuthority",
] as const;

function assertWalkthroughBoundary(
  input: unknown,
  name: "positive" | "negative",
  expectedResearchBasis: SyntheticRh05WalkthroughFixture["researchBasis"]
): void {
  const path = `fixture.walkthroughs.${name}`;
  const record = fixtureRecord(input, path);
  assertExactFixtureKeys(record, WALKTHROUGH_KEYS, path);
  if (record.kind !== "synthetic") {
    fail(`${path}.kind`, "must be synthetic.");
  }
  if (record.polarity !== name) {
    fail(`${path}.polarity`, `must be ${name}.`);
  }
  if (record.researchBasis !== expectedResearchBasis) {
    fail(`${path}.researchBasis`, `must be ${expectedResearchBasis}.`);
  }
  if (typeof record.id !== "string") {
    fail(`${path}.id`, "must be a string.");
  }
  if (typeof record.stepId !== "string") {
    fail(`${path}.stepId`, "must be a string.");
  }
  assertStringArray(record.focusNodeIds, `${path}.focusNodeIds`);
  assertStringArray(record.expectedNodeIds, `${path}.expectedNodeIds`);

  const usage = fixtureRecord(record.usage, `${path}.usage`);
  assertExactFixtureKeys(
    usage,
    ["kind", "usageId", "version"],
    `${path}.usage`
  );
  if (
    usage.kind !== "declared" ||
    typeof usage.usageId !== "string" ||
    !Number.isInteger(usage.version)
  ) {
    fail(`${path}.usage`, "must be a declared usage reference.");
  }

  const journey = fixtureRecord(record.journey, `${path}.journey`);
  assertExactFixtureKeys(journey, ["id", "version"], `${path}.journey`);
  if (typeof journey.id !== "string" || !Number.isInteger(journey.version)) {
    fail(`${path}.journey`, "must be a journey identity.");
  }
}

function parseSyntheticRh05FixtureBoundary(
  input: unknown
): SyntheticRh05AgentContextFixtureSet {
  const detached = fixtureRecord(
    detachedValidatedOrdinaryData(input, "fixture"),
    "fixture"
  );
  assertExactFixtureKeys(detached, FIXTURE_KEYS, "fixture");
  if (detached.kind !== "synthetic") {
    fail("fixture.kind", "must be synthetic.");
  }
  if (detached.id !== "synthetic.rh05.agent-context-fixture-set") {
    fail("fixture.id", "must be the synthetic RH-05 fixture-set identity.");
  }
  if (detached.researchBasis !== "RH-05") {
    fail("fixture.researchBasis", "must be RH-05.");
  }

  const walkthroughs = fixtureRecord(
    detached.walkthroughs,
    "fixture.walkthroughs"
  );
  assertExactFixtureKeys(
    walkthroughs,
    ["positive", "negative"],
    "fixture.walkthroughs"
  );
  assertWalkthroughBoundary(
    walkthroughs.positive,
    "positive",
    "RH-05 walkthrough 1"
  );
  assertWalkthroughBoundary(
    walkthroughs.negative,
    "negative",
    "RH-05 walkthrough 2"
  );

  return detached as unknown as SyntheticRh05AgentContextFixtureSet;
}

function assertEqual(left: unknown, right: unknown, path: string): void {
  if (canonicalStringify(left) !== canonicalStringify(right)) {
    fail(path, "does not match the referenced fixture record.");
  }
}

function usageReferenceKey(reference: AgentContextUsageReference): string {
  return reference.kind === "declared"
    ? `declared\0${reference.usageId}\0${reference.version}`
    : `callsite\0${reference.projectId}\0${reference.callsiteKey}`;
}

function journeyReferenceKey(reference: {
  readonly id: string;
  readonly version: number;
}): string {
  return `${reference.id}\0${reference.version}`;
}

function collectNodeIds(nodes: readonly ContractNode[]): Set<string> {
  const ids = new Set<string>();
  const visit = (node: ContractNode): void => {
    ids.add(node.id);
    node.children.forEach(visit);
    if (node.arrayTemplate !== undefined) {
      visit(node.arrayTemplate);
    }
  };
  nodes.forEach(visit);
  return ids;
}

function assertSameSet(
  actual: readonly string[],
  expected: readonly string[],
  path: string
): void {
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  assertEqual(sortedActual, sortedExpected, path);
}

function assertExactCatalogComposition(
  sourceUsageCatalog: AgentContextSourceUsageCatalog,
  journeyCatalog: AgentContextJourneyCatalog,
  walkthroughs: readonly SyntheticRh05WalkthroughFixture[]
): void {
  if (sourceUsageCatalog.usages.length !== walkthroughs.length) {
    fail(
      "sourceUsageCatalog.usages",
      `must contain exactly two walkthrough-selected usages; received ${sourceUsageCatalog.usages.length}.`
    );
  }
  assertSameSet(
    sourceUsageCatalog.usages.map((usage) => usageReferenceKey(usage.identity)),
    walkthroughs.map((walkthrough) => usageReferenceKey(walkthrough.usage)),
    "sourceUsageCatalog.usages"
  );

  if (journeyCatalog.journeys.length !== walkthroughs.length) {
    fail(
      "journeyCatalog.journeys",
      `must contain exactly two walkthrough-selected journeys; received ${journeyCatalog.journeys.length}.`
    );
  }
  assertSameSet(
    journeyCatalog.journeys.map(journeyReferenceKey),
    walkthroughs.map((walkthrough) => journeyReferenceKey(walkthrough.journey)),
    "journeyCatalog.journeys"
  );
}

function assertJourneyProjection(
  actual: unknown,
  expected: unknown,
  path: string
): void {
  if (canonicalStringify(actual) !== canonicalStringify(expected)) {
    fail(path, "must exactly project the selected journey records.");
  }
}

function assertFixtureInvariant(
  actual: unknown,
  expected: unknown,
  path: string,
  message: string
): void {
  if (canonicalStringify(actual) !== canonicalStringify(expected)) {
    fail(path, message);
  }
}

function findContractNode(
  contract: FormContract,
  nodeId: string
): ContractNode | undefined {
  const pending = [...contract.nodes];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.id === nodeId) {
      return node;
    }
    pending.push(...node.children);
    if (node.arrayTemplate !== undefined) {
      pending.push(node.arrayTemplate);
    }
  }
  return undefined;
}

function assertPositiveResolvedSupplierSemantics(
  resolved: FormContract,
  authority: AgentContextExecutionAuthority,
  path: string
): void {
  const supplier = findContractNode(resolved, POSITIVE_NODES.supplier);
  if (supplier === undefined) {
    fail(
      `${path}.resolvedContract.supplier`,
      "must preserve the documented supplier node."
    );
  }
  assertFixtureInvariant(
    supplier.valueDomain,
    {
      kind: "enumerated",
      source: "resolved-options",
      completeness: "scenario",
      evidence: "resolved",
      values: ["synthetic-supplier-a", "synthetic-supplier-b"],
    },
    `${path}.resolvedContract.supplier.valueDomain`,
    "must preserve the documented supplier scenario domain."
  );
  assertFixtureInvariant(
    supplier.interactionProfile,
    selectProfile(
      "synthetic.rh05.profile.supplier-select",
      "single-choice",
      "synthetic.rh05.driver.supplier-select"
    ),
    `${path}.resolvedContract.supplier.interactionProfile`,
    "must preserve the documented resolved supplier profile."
  );

  const supplierInteractionId = "synthetic.rh05.purchase-order.supplier.select";
  const supplierReadinessId =
    "synthetic.rh05.purchase-order.supplier.options-ready";
  const supplierDriver = {
    kind: "application",
    id: "synthetic.rh05.driver.supplier-select",
    version: 1,
  } as const;
  assertFixtureInvariant(
    authority.readiness,
    [
      {
        id: supplierReadinessId,
        nodeId: POSITIVE_NODES.supplier,
        owner: {
          kind: "interaction",
          interactionId: supplierInteractionId,
        },
        operation: "wait-readiness",
        driver: supplierDriver,
        partRef: "control",
        locatorTargetRef: "synthetic.rh05.purchase-order.supplier.control",
      },
    ],
    `${path}.executionAuthority.readiness`,
    "must preserve the documented supplier readiness."
  );
  const supplierInteraction = authority.interactions.find(
    (interaction) => interaction.id === supplierInteractionId
  );
  if (supplierInteraction === undefined) {
    fail(
      `${path}.executionAuthority.interactions`,
      "must preserve the documented supplier readiness owner."
    );
  }
  assertFixtureInvariant(
    {
      nodeId: supplierInteraction.nodeId,
      stepId: supplierInteraction.stepId,
      profile: supplierInteraction.profile,
      driver: supplierInteraction.driver,
      operation: supplierInteraction.operation,
      readinessIds: supplierInteraction.readinessIds,
    },
    {
      nodeId: POSITIVE_NODES.supplier,
      stepId: POSITIVE_STEP_ID,
      profile: {
        id: "synthetic.rh05.profile.supplier-select",
        version: 1,
      },
      driver: supplierDriver,
      operation: "select-option",
      readinessIds: [supplierReadinessId],
    },
    `${path}.executionAuthority.interactions.supplier`,
    "must preserve the documented supplier readiness binding."
  );
}

function assertWalkthroughBlurTopology(
  name: "positive" | "negative",
  authority: AgentContextExecutionAuthority,
  path: string
): void {
  const positive = name === "positive";
  const blurId = positive
    ? "synthetic.rh05.purchase-order.total.blur"
    : "synthetic.rh05.claims.other-details.blur";
  const nodeId = positive ? POSITIVE_NODES.total : NEGATIVE_NODES.otherDetails;
  const locatorTargetRef = positive
    ? "synthetic.rh05.purchase-order.total.control"
    : "synthetic.rh05.claims.other-details.control";
  assertFixtureInvariant(
    authority.physicalOperations,
    [
      {
        id: blurId,
        nodeId,
        mechanic: "blur",
        partRef: "control",
        locatorTargetRef,
      },
    ],
    `${path}.executionAuthority.physicalOperations`,
    positive
      ? "must preserve exactly one documented shared blur."
      : "must preserve exactly one documented validation-only blur."
  );

  const explicitBlurCommits = authority.commits.filter(
    (commit) =>
      commit.kind === "node-local" &&
      commit.execution === "explicit-intent" &&
      commit.physicalOperationId === blurId
  );
  const blurValidationSurfaces = authority.validationSurfaces.filter(
    (surface) =>
      surface.activation.kind === "node-local" &&
      surface.activation.physicalOperationId === blurId
  );
  if (
    explicitBlurCommits.length !== (positive ? 1 : 0) ||
    blurValidationSurfaces.length !== 1
  ) {
    fail(
      `${path}.executionAuthority.physicalOperations`,
      positive
        ? "must preserve the documented shared blur commit and validation ownership."
        : "must preserve the documented validation-only blur ownership."
    );
  }
}

const SYNTHETIC_ID_VALUE_KEYS = new Set([
  "id",
  "usageId",
  "projectId",
  "rootAnchorId",
  "formId",
  "fileId",
  "nodeId",
  "stepId",
  "landingStepId",
  "interactionId",
  "physicalOperationId",
  "repeaterCaptureId",
  "actionId",
  "outcomeId",
  "fromStepId",
  "toStepId",
  "locatorTargetRef",
  "assertionTargetRef",
  "target",
]);

const SYNTHETIC_ID_ARRAY_KEYS = new Set([
  "projectIds",
  "actionIds",
  "outcomeIds",
  "nodeIds",
  "readinessIds",
  "focusNodeIds",
  "expectedNodeIds",
]);

function assertSyntheticIdentity(
  value: unknown,
  path: string,
  property?: string
): void {
  if (typeof value === "string") {
    if (
      property !== undefined &&
      SYNTHETIC_ID_VALUE_KEYS.has(property) &&
      !value.startsWith(SYNTHETIC_ID_PREFIX)
    ) {
      fail(path, "must use the synthetic RH-05 identity namespace.");
    }
    return;
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      if (
        property !== undefined &&
        SYNTHETIC_ID_ARRAY_KEYS.has(property) &&
        (typeof item !== "string" || !item.startsWith(SYNTHETIC_ID_PREFIX))
      ) {
        fail(
          `${path}[${index}]`,
          "must use the synthetic RH-05 identity namespace."
        );
      }
      if (
        (property === "evidenceRefs" || property === "provenance") &&
        (typeof item !== "string" ||
          !item.startsWith(SYNTHETIC_EVIDENCE_PREFIX))
      ) {
        fail(`${path}[${index}]`, "must be explicitly synthetic evidence.");
      }
      assertSyntheticIdentity(item, `${path}[${index}]`);
    }
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    assertSyntheticIdentity(item, `${path}.${key}`, key);
  }
}

function expectedArtifactReferences(
  sourceUsageCatalog: AgentContextSourceUsageCatalog,
  journeyCatalog: AgentContextJourneyCatalog,
  walkthroughs: readonly SyntheticRh05WalkthroughFixture[]
): readonly AgentContextArtifactReference[] {
  return [
    artifactReference(
      AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
      AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
      sourceUsageCatalog.contentHash
    ),
    artifactReference(
      AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
      AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
      journeyCatalog.contentHash
    ),
    ...walkthroughs.flatMap((entry) => [
      artifactReference(
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
        entry.declaredContract.contentHash
      ),
      artifactReference(
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
        entry.resolvedContract.contentHash
      ),
      artifactReference(
        AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
        AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
        entry.executionAuthority.contentHash
      ),
    ]),
  ];
}

function validateWalkthrough(
  name: "positive" | "negative",
  walkthrough: SyntheticRh05WalkthroughFixture,
  sourceUsageCatalog: AgentContextSourceUsageCatalog,
  journeyCatalog: AgentContextJourneyCatalog,
  owners: {
    readonly declared: FormContract;
    readonly resolved: FormContract;
    readonly authority: AgentContextExecutionAuthority;
  }
): void {
  const path = `walkthroughs.${name}`;
  if (walkthrough.kind !== "synthetic") {
    fail(`${path}.kind`, "must be synthetic.");
  }
  if (walkthrough.polarity !== name) {
    fail(`${path}.polarity`, `must be ${name}.`);
  }
  const documentedFocus =
    name === "positive"
      ? Object.values(POSITIVE_NODES)
      : [NEGATIVE_NODES.otherDetails];
  assertFixtureInvariant(
    walkthrough.focusNodeIds,
    documentedFocus,
    `${path}.focusNodeIds`,
    name === "positive"
      ? "must equal the nonempty, unique documented positive focus."
      : "must contain exactly the other-details focus node."
  );
  const { declared, resolved, authority } = owners;
  if (declared.formId !== resolved.formId) {
    fail(`${path}.resolvedContract.formId`, "must equal the declared form ID.");
  }

  const usage = sourceUsageCatalog.usages.find(
    (candidate) =>
      usageReferenceKey(candidate.identity) ===
      usageReferenceKey(walkthrough.usage)
  );
  if (usage === undefined) {
    fail(`${path}.usage`, "does not resolve in the source-usage catalog.");
  }
  if (usage.resolution.status !== "exact") {
    fail(`${path}.usage`, "must resolve exactly.");
  }
  const expectedForm = usage.resolution.candidate.form;
  assertEqual(
    expectedForm,
    {
      projectId: usage.projectId,
      formId: declared.formId,
      contractHash: declared.contentHash,
    },
    `${path}.usage.resolution.form`
  );

  const journey = journeyCatalog.journeys.find(
    (candidate) =>
      candidate.id === walkthrough.journey.id &&
      candidate.version === walkthrough.journey.version
  );
  if (journey === undefined) {
    fail(`${path}.journey`, "does not resolve in the journey catalog.");
  }
  if (journey.steps.length !== 1) {
    fail(`${path}.journey.steps`, "must contain exactly one synthetic step.");
  }
  assertEqual(
    journey.entry.usage,
    walkthrough.usage,
    `${path}.journey.entry.usage`
  );
  if (journey.entry.landingStepId !== walkthrough.stepId) {
    fail(
      `${path}.journey.entry.landingStepId`,
      "must equal the selected step."
    );
  }
  const journeyStep = journey.steps.find(
    (candidate) => candidate.id === walkthrough.stepId
  );
  if (journeyStep === undefined) {
    fail(`${path}.stepId`, "does not resolve in the selected journey.");
  }
  if (
    journeyStep.forms.length !== 1 ||
    canonicalStringify(journeyStep.forms[0]) !==
      canonicalStringify(expectedForm)
  ) {
    fail(
      `${path}.journey.step.forms`,
      "must contain exactly the walkthrough-selected form."
    );
  }
  if (
    journeyStep.usages.length !== 1 ||
    usageReferenceKey(journeyStep.usages[0]!) !==
      usageReferenceKey(walkthrough.usage)
  ) {
    fail(
      `${path}.journey.step.usages`,
      "must contain exactly the walkthrough-selected usage."
    );
  }

  const basis = {
    formId: declared.formId,
    contractHash: declared.contentHash,
  };
  assertEqual(authority.basis, basis, `${path}.executionAuthority.basis`);
  assertEqual(
    authority.scenario.basis,
    basis,
    `${path}.executionAuthority.scenario.basis`
  );
  assertEqual(
    authority.usage.basis,
    basis,
    `${path}.executionAuthority.usage.basis`
  );
  if (authority.scenario.artifactHash !== resolved.contentHash) {
    fail(
      `${path}.executionAuthority.scenario.artifactHash`,
      "must equal the resolved Form Contract hash."
    );
  }
  assertWalkthroughBlurTopology(name, authority, path);
  if (name === "positive") {
    assertPositiveResolvedSupplierSemantics(resolved, authority, path);
  }
  assertEqual(
    {
      kind: "declared",
      usageId: authority.usage.id,
      version: authority.usage.version,
    },
    walkthrough.usage,
    `${path}.executionAuthority.usage`
  );
  if (authority.usage.entry.landingStepId !== walkthrough.stepId) {
    fail(
      `${path}.executionAuthority.usage.entry.landingStepId`,
      "must equal the selected step."
    );
  }
  if (authority.usage.entry.id !== journey.entry.id) {
    fail(
      `${path}.executionAuthority.usage.entry.id`,
      "must exactly project the selected journey entry."
    );
  }
  if (authority.usage.steps.length !== 1) {
    fail(`${path}.executionAuthority.usage.steps`, "must contain one step.");
  }
  const authorityStep = authority.usage.steps[0]!;
  if (authorityStep.id !== walkthrough.stepId) {
    fail(
      `${path}.executionAuthority.usage.steps[0].id`,
      "must equal the selected step."
    );
  }
  if (authorityStep.ordinal !== journeyStep.ordinal) {
    fail(
      `${path}.executionAuthority.usage.steps[0].ordinal`,
      "must exactly project the selected journey step ordinal."
    );
  }
  assertJourneyProjection(
    authorityStep.actionIds,
    journeyStep.actionIds,
    `${path}.executionAuthority.usage.steps[0].actionIds`
  );
  assertJourneyProjection(
    authority.usage.actions.map(({ id, kind, outcomeIds }) => ({
      id,
      kind,
      outcomeIds,
    })),
    journey.actions.map(({ id, kind, outcomeIds }) => ({
      id,
      kind,
      outcomeIds,
    })),
    `${path}.executionAuthority.usage.actions`
  );
  assertJourneyProjection(
    authority.usage.outcomes.map(({ id, kind }) => ({ id, kind })),
    journey.outcomes.map(({ id, kind }) => ({ id, kind })),
    `${path}.executionAuthority.usage.outcomes`
  );
  assertJourneyProjection(
    authority.usage.transitions.map(
      ({ id, version, fromStepId, actionId, outcomeId, toStepId }) => ({
        id,
        version,
        fromStepId,
        actionId,
        outcomeId,
        toStepId,
      })
    ),
    journey.transitions.map(
      ({ id, version, fromStepId, actionId, outcomeId, toStepId }) => ({
        id,
        version,
        fromStepId,
        actionId,
        outcomeId,
        toStepId,
      })
    ),
    `${path}.executionAuthority.usage.transitions`
  );
  assertSameSet(
    authorityStep.nodeIds,
    walkthrough.expectedNodeIds,
    `${path}.expectedNodeIds`
  );
  const resolvedNodeIds = collectNodeIds(resolved.nodes);
  for (const [index, nodeId] of walkthrough.expectedNodeIds.entries()) {
    if (!resolvedNodeIds.has(nodeId)) {
      fail(
        `${path}.expectedNodeIds[${index}]`,
        "must resolve in the resolved contract."
      );
    }
  }
  for (const [index, nodeId] of walkthrough.focusNodeIds.entries()) {
    if (!walkthrough.expectedNodeIds.includes(nodeId)) {
      fail(
        `${path}.focusNodeIds[${index}]`,
        "must belong to the walkthrough step."
      );
    }
  }
}

export function validateSyntheticRh05AgentContextFixtureSet(
  candidate: unknown
): void {
  const input = parseSyntheticRh05FixtureBoundary(candidate);

  const artifactSet = parseAgentContextArtifactSet(input.artifactSet);
  const sourceUsageCatalog = parseAgentContextSourceUsageCatalog(
    input.sourceUsageCatalog
  );
  const journeyCatalog = parseAgentContextJourneyCatalog(input.journeyCatalog);
  const parsedWalkthroughs = {
    positive: {
      declared: parseFormContract(input.walkthroughs.positive.declaredContract),
      resolved: parseFormContract(input.walkthroughs.positive.resolvedContract),
      authority: parseAgentContextExecutionAuthority(
        input.walkthroughs.positive.executionAuthority
      ),
    },
    negative: {
      declared: parseFormContract(input.walkthroughs.negative.declaredContract),
      resolved: parseFormContract(input.walkthroughs.negative.resolvedContract),
      authority: parseAgentContextExecutionAuthority(
        input.walkthroughs.negative.executionAuthority
      ),
    },
  } as const;
  const walkthroughs = [
    input.walkthroughs.positive,
    input.walkthroughs.negative,
  ] as const;
  assertEqual(
    input.workspaceIndex,
    artifactSet.workspaceIndex,
    "workspaceIndex"
  );
  assertEqual(
    sourceUsageCatalog.workspaceIndex,
    input.workspaceIndex,
    "sourceUsageCatalog.workspaceIndex"
  );
  assertEqual(
    journeyCatalog.workspaceIndex,
    input.workspaceIndex,
    "journeyCatalog.workspaceIndex"
  );
  assertExactCatalogComposition(
    sourceUsageCatalog,
    journeyCatalog,
    walkthroughs
  );
  validateAgentContextUsageJourneyReferences(
    sourceUsageCatalog,
    journeyCatalog
  );

  assertSyntheticIdentity(input, "fixture");
  if (artifactSet.repositoryRevision !== "synthetic.ctx-0d.rh05.v1") {
    fail("artifactSet.repositoryRevision", "must be explicitly synthetic.");
  }
  if (
    sourceUsageCatalog.coverage.status !== "incomplete" ||
    !sourceUsageCatalog.coverage.reasons.includes("synthetic-fixture-only")
  ) {
    fail(
      "sourceUsageCatalog.coverage",
      "must remain incomplete and explicitly synthetic."
    );
  }
  for (const [index, usage] of sourceUsageCatalog.usages.entries()) {
    if (usage.invocation.location.kind !== "opaque") {
      fail(
        `sourceUsageCatalog.usages[${index}].invocation.location`,
        "must use an opaque synthetic location."
      );
    }
  }

  validateWalkthrough(
    "positive",
    input.walkthroughs.positive,
    sourceUsageCatalog,
    journeyCatalog,
    parsedWalkthroughs.positive
  );
  validateWalkthrough(
    "negative",
    input.walkthroughs.negative,
    sourceUsageCatalog,
    journeyCatalog,
    parsedWalkthroughs.negative
  );

  const expectedReferences = expectedArtifactReferences(
    sourceUsageCatalog,
    journeyCatalog,
    walkthroughs
  );
  if (artifactSet.artifacts.length !== 8) {
    fail("artifactSet.artifacts", "must contain exactly eight references.");
  }
  assertEqual(
    [...artifactSet.artifacts]
      .map((reference) => canonicalStringify(reference))
      .sort(),
    [...expectedReferences]
      .map((reference) => canonicalStringify(reference))
      .sort(),
    "artifactSet.artifacts"
  );
}
