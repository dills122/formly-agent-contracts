import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  factoryInputAuthoringDiagnostics: [] as {
    code:
      | "APPLICATION_PROGRAM_AMBIGUOUS"
      | "APPLICATION_PROGRAM_UNAVAILABLE"
      | "FORM_DEFINITION_DUPLICATE"
      | "FORM_ROOT_UNAVAILABLE";
    projectId: string;
    formId: string;
  }[],
  scaffold: undefined as
    | undefined
    | {
        suggestedPath: string;
        code: string;
        review: {
          formId: string;
          coverage: "complete-supported-grammar" | "incomplete";
          generated: { helper: "capturedCallback"; key: string }[];
          explicit: { key: string; requirement: "binding" | "value" }[];
          unsupported: string[];
          diagnostics: {
            code: "FACTORY_INPUT_USE_AMBIGUOUS";
            propertyKey?: string;
          }[];
        };
      },
  targets: [] as unknown[],
}));

vi.mock("./discover-projects.js", () => ({
  discoverWorkspaceProjects: vi.fn(() =>
    Promise.resolve({
      root: { config: { sourceUsage: {} } },
      projects: [
        {
          projectId: "claims",
          configPath: "libs/claims/formly-contracts.project.ts",
        },
      ],
    })
  ),
}));

vi.mock("./run-workspace.js", () => ({
  prepareSourceUsagePrograms: vi.fn(() => Promise.resolve([])),
}));

vi.mock("./source-usage.js", () => ({
  indexWorkspaceSourceUsages: vi.fn(
    (input: { onFactoryInputAuthoringTarget?: (target: unknown) => void }) => {
      for (const target of state.targets) {
        input.onFactoryInputAuthoringTarget?.(target);
      }
      return {
        catalog: {},
        diagnostics: [],
        factoryInputAuthoringDiagnostics:
          state.factoryInputAuthoringDiagnostics,
      };
    }
  ),
}));

vi.mock("./factory-input-scaffold.js", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("./factory-input-scaffold.js")
  >();
  return {
    ...actual,
    generateFactoryInputScaffold: vi.fn(() => {
      if (state.scaffold === undefined) {
        throw new Error("Unexpected scaffold generation.");
      }
      return state.scaffold;
    }),
  };
});

import { inspectWorkspaceFactoryInputs } from "./factory-input-authoring.js";

function target(formId = "claims.intake"): unknown {
  return {
    projectId: "claims",
    sourceId: "claims/forms",
    formId,
    definitionFilePath: "libs/claims/intake.contract.ts",
    factorySymbol: "createClaimIntakeForm",
    descriptor: {},
    factoryDeclaration: {},
  };
}

beforeEach(() => {
  state.factoryInputAuthoringDiagnostics = [];
  state.scaffold = undefined;
  state.targets = [];
});

describe("inspectWorkspaceFactoryInputs", () => {
  it.each([
    ["FORM_DEFINITION_DUPLICATE", "FACTORY_INPUT_AUTHORING_FORM_DUPLICATE"],
    ["FORM_ROOT_UNAVAILABLE", "FACTORY_INPUT_AUTHORING_FORM_UNSUPPORTED"],
    [
      "APPLICATION_PROGRAM_UNAVAILABLE",
      "FACTORY_INPUT_AUTHORING_PROGRAM_UNAVAILABLE",
    ],
    ["APPLICATION_PROGRAM_AMBIGUOUS", "FACTORY_INPUT_AUTHORING_FORM_AMBIGUOUS"],
  ] as const)(
    "propagates %s as the privacy-safe public diagnostic %s",
    async (sourceCode, publicCode) => {
      state.factoryInputAuthoringDiagnostics = [
        { code: sourceCode, projectId: "claims", formId: "claims.intake" },
      ];

      const result = await inspectWorkspaceFactoryInputs({
        workspaceRoot: process.cwd(),
        rootConfigPath: "formly-contracts.config.ts",
        formIds: ["claims.intake"],
      });

      expect(result).toEqual({
        drafts: [],
        diagnostics: [{ code: publicCode, formId: "claims.intake" }],
      });
    }
  );

  it("does not treat an unfiltered empty target set as success", async () => {
    const result = await inspectWorkspaceFactoryInputs({
      workspaceRoot: process.cwd(),
      rootConfigPath: "formly-contracts.config.ts",
    });

    expect(result).toEqual({
      drafts: [],
      diagnostics: [{ code: "FACTORY_INPUT_AUTHORING_NO_TARGETS" }],
    });
  });

  it("does not treat an explicitly empty form selection as success", async () => {
    state.targets = [target()];

    const result = await inspectWorkspaceFactoryInputs({
      workspaceRoot: process.cwd(),
      rootConfigPath: "formly-contracts.config.ts",
      formIds: [],
    });

    expect(result).toEqual({
      drafts: [],
      diagnostics: [{ code: "FACTORY_INPUT_AUTHORING_NO_TARGETS" }],
    });
  });

  it("reports mutually exclusive property counts plus global coverage", async () => {
    state.targets = [target()];
    state.scaffold = {
      suggestedPath: "libs/claims/intake.factory-input.generated.ts",
      code: "export {};\n",
      review: {
        formId: "claims.intake",
        coverage: "incomplete",
        generated: [{ helper: "capturedCallback", key: "accepted" }],
        explicit: [
          { key: "ambiguous", requirement: "binding" },
          { key: "mode", requirement: "value" },
        ],
        unsupported: ["ambiguousUnsafe", "unsafe"],
        diagnostics: [
          {
            code: "FACTORY_INPUT_USE_AMBIGUOUS",
            propertyKey: "ambiguous",
          },
          {
            code: "FACTORY_INPUT_USE_AMBIGUOUS",
            propertyKey: "ambiguousUnsafe",
          },
          { code: "FACTORY_INPUT_USE_AMBIGUOUS" },
        ],
      },
    };

    const result = await inspectWorkspaceFactoryInputs({
      workspaceRoot: process.cwd(),
      rootConfigPath: "formly-contracts.config.ts",
      formIds: ["claims.intake"],
    });

    expect(result.drafts[0]?.metrics).toEqual({
      generated: 1,
      explicit: 1,
      ambiguous: 1,
      unsupported: 2,
      coverage: "incomplete",
      unattributedAmbiguity: true,
    });
  });
});
