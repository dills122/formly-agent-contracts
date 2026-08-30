import { realpath } from "node:fs/promises";
import { posix, resolve } from "node:path";

import type { Sha256Digest } from "@formly-contract/schema";

import {
  discoverWorkspaceProjects,
  type DiscoverWorkspaceProjectsOptions,
} from "./discover-projects.js";
import {
  FactoryInputScaffoldError,
  generateFactoryInputScaffold,
  type FactoryInputScaffoldResult,
} from "./factory-input-scaffold.js";
import { prepareSourceUsagePrograms } from "./run-workspace.js";
import {
  indexWorkspaceSourceUsages,
  type WorkspaceFactoryInputAuthoringTarget,
  type WorkspaceFactoryInputAuthoringTargetDiagnostic,
} from "./source-usage.js";
import { WORKSPACE_INDEX_SCHEMA_VERSION } from "./workspace-index.js";
import { compareCodeUnits } from "./workspace-paths.js";

const FORM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-]*$/u;
const MAX_FORM_ID_CHARACTERS = 120;
const EMPTY_WORKSPACE_HASH: Sha256Digest = `sha256:${"0".repeat(64)}`;

export type WorkspaceFactoryInputAuthoringDiagnosticCode =
  | "FACTORY_INPUT_AUTHORING_FORM_AMBIGUOUS"
  | "FACTORY_INPUT_AUTHORING_FORM_DUPLICATE"
  | "FACTORY_INPUT_AUTHORING_FORM_ID_INVALID"
  | "FACTORY_INPUT_AUTHORING_FORM_NOT_FOUND"
  | "FACTORY_INPUT_AUTHORING_FORM_UNSUPPORTED"
  | "FACTORY_INPUT_AUTHORING_NO_TARGETS"
  | "FACTORY_INPUT_AUTHORING_PROGRAM_UNAVAILABLE"
  | "FACTORY_INPUT_AUTHORING_SCAFFOLD_UNAVAILABLE"
  | "FACTORY_INPUT_AUTHORING_SOURCE_USAGE_DISABLED";

export interface WorkspaceFactoryInputAuthoringDiagnostic {
  readonly code: WorkspaceFactoryInputAuthoringDiagnosticCode;
  readonly formId?: string;
}

export interface WorkspaceFactoryInputAuthoringMetrics {
  readonly generated: number;
  readonly explicit: number;
  readonly ambiguous: number;
  readonly unsupported: number;
  readonly coverage: FactoryInputScaffoldResult["review"]["coverage"];
  readonly unattributedAmbiguity: boolean;
}

export interface WorkspaceFactoryInputAuthoringDraft
  extends FactoryInputScaffoldResult {
  readonly projectId: string;
  readonly sourceId: string;
  readonly formId: string;
  readonly factorySymbol: string;
  readonly metrics: WorkspaceFactoryInputAuthoringMetrics;
}

export interface InspectWorkspaceFactoryInputsOptions
  extends DiscoverWorkspaceProjectsOptions {
  readonly formIds?: readonly string[];
}

export interface InspectWorkspaceFactoryInputsResult {
  readonly drafts: readonly WorkspaceFactoryInputAuthoringDraft[];
  readonly diagnostics: readonly WorkspaceFactoryInputAuthoringDiagnostic[];
}

function normalizedFormIds(formIds: readonly string[] | undefined): {
  readonly formIds: readonly string[] | undefined;
  readonly diagnostics: readonly WorkspaceFactoryInputAuthoringDiagnostic[];
} {
  if (formIds === undefined) {
    return { formIds: undefined, diagnostics: [] };
  }
  if (formIds.length === 0) {
    return {
      formIds: undefined,
      diagnostics: [{ code: "FACTORY_INPUT_AUTHORING_NO_TARGETS" }],
    };
  }
  const diagnostics: WorkspaceFactoryInputAuthoringDiagnostic[] = [];
  const normalized: string[] = [];
  for (const formId of formIds) {
    if (
      formId.length > MAX_FORM_ID_CHARACTERS ||
      !FORM_ID_PATTERN.test(formId)
    ) {
      diagnostics.push({
        code: "FACTORY_INPUT_AUTHORING_FORM_ID_INVALID",
        formId,
      });
      continue;
    }
    if (!normalized.includes(formId)) normalized.push(formId);
  }
  if (diagnostics.length > 0) {
    return {
      formIds: undefined,
      diagnostics: diagnostics.sort((left, right) =>
        compareCodeUnits(left.formId ?? "", right.formId ?? "")
      ),
    };
  }
  return { formIds: normalized.sort(compareCodeUnits), diagnostics: [] };
}

function targetKey(
  target: Pick<
    WorkspaceFactoryInputAuthoringTarget,
    "projectId" | "sourceId" | "formId" | "factorySymbol"
  >
): string {
  return `${target.projectId}\0${target.sourceId}\0${target.formId}\0${target.factorySymbol}`;
}

function metrics(
  result: FactoryInputScaffoldResult
): WorkspaceFactoryInputAuthoringMetrics {
  const unsupported = new Set(result.review.unsupported);
  const ambiguous = new Set(
    result.review.diagnostics
      .filter(({ code }) => code === "FACTORY_INPUT_USE_AMBIGUOUS")
      .flatMap(({ propertyKey }) =>
        propertyKey === undefined ? [] : [propertyKey]
      )
      .filter((propertyKey) => !unsupported.has(propertyKey))
  );
  const unattributedAmbiguity = result.review.diagnostics.some(
    ({ code, propertyKey }) =>
      code === "FACTORY_INPUT_USE_AMBIGUOUS" && propertyKey === undefined
  );
  return {
    generated: result.review.generated.length,
    explicit: result.review.explicit.filter(({ key }) => !ambiguous.has(key))
      .length,
    ambiguous: ambiguous.size,
    unsupported: unsupported.size,
    coverage: result.review.coverage,
    unattributedAmbiguity,
  };
}

function targetDiagnostic(
  diagnostic: WorkspaceFactoryInputAuthoringTargetDiagnostic
): WorkspaceFactoryInputAuthoringDiagnostic {
  const code =
    diagnostic.code === "FORM_DEFINITION_DUPLICATE"
      ? "FACTORY_INPUT_AUTHORING_FORM_DUPLICATE"
      : diagnostic.code === "FORM_ROOT_UNAVAILABLE"
      ? "FACTORY_INPUT_AUTHORING_FORM_UNSUPPORTED"
      : diagnostic.code === "APPLICATION_PROGRAM_AMBIGUOUS"
      ? "FACTORY_INPUT_AUTHORING_FORM_AMBIGUOUS"
      : "FACTORY_INPUT_AUTHORING_PROGRAM_UNAVAILABLE";
  return { code, formId: diagnostic.formId };
}

function requestedTargets(
  targets: readonly WorkspaceFactoryInputAuthoringTarget[],
  targetDiagnostics: readonly WorkspaceFactoryInputAuthoringDiagnostic[],
  formIds: readonly string[] | undefined
): {
  readonly targets: readonly WorkspaceFactoryInputAuthoringTarget[];
  readonly diagnostics: readonly WorkspaceFactoryInputAuthoringDiagnostic[];
} {
  if (formIds === undefined) {
    if (targets.length === 0 && targetDiagnostics.length === 0) {
      return {
        targets,
        diagnostics: [{ code: "FACTORY_INPUT_AUTHORING_NO_TARGETS" }],
      };
    }
    return { targets, diagnostics: targetDiagnostics };
  }
  const selected: WorkspaceFactoryInputAuthoringTarget[] = [];
  const diagnostics: WorkspaceFactoryInputAuthoringDiagnostic[] = [];
  for (const formId of formIds) {
    const matches = targets.filter((target) => target.formId === formId);
    const refusals = targetDiagnostics.filter(
      (diagnostic) => diagnostic.formId === formId
    );
    if (refusals.length > 0) {
      diagnostics.push(...refusals);
    } else if (matches.length === 0) {
      diagnostics.push({
        code: "FACTORY_INPUT_AUTHORING_FORM_NOT_FOUND",
        formId,
      });
    } else if (matches.length > 1) {
      diagnostics.push({
        code: "FACTORY_INPUT_AUTHORING_FORM_AMBIGUOUS",
        formId,
      });
    } else {
      selected.push(matches[0]!);
    }
  }
  return { targets: selected, diagnostics };
}

export async function inspectWorkspaceFactoryInputs(
  options: InspectWorkspaceFactoryInputsOptions
): Promise<InspectWorkspaceFactoryInputsResult> {
  const selection = normalizedFormIds(options.formIds);
  if (selection.diagnostics.length > 0) {
    return { drafts: [], diagnostics: selection.diagnostics };
  }
  const workspaceRoot = await realpath(resolve(options.workspaceRoot));
  const discovered = await discoverWorkspaceProjects({
    workspaceRoot,
    rootConfigPath: options.rootConfigPath,
    ...(options.rootLoaderOptions === undefined
      ? {}
      : { rootLoaderOptions: options.rootLoaderOptions }),
  });
  if (discovered.root.config.sourceUsage === undefined) {
    return {
      drafts: [],
      diagnostics: [{ code: "FACTORY_INPUT_AUTHORING_SOURCE_USAGE_DISABLED" }],
    };
  }
  const programs = await prepareSourceUsagePrograms(workspaceRoot, discovered);
  if (programs === undefined) {
    return {
      drafts: [],
      diagnostics: [{ code: "FACTORY_INPUT_AUTHORING_SOURCE_USAGE_DISABLED" }],
    };
  }
  const targets: WorkspaceFactoryInputAuthoringTarget[] = [];
  const indexed = indexWorkspaceSourceUsages({
    workspaceRoot,
    workspaceIndex: {
      schemaVersion: WORKSPACE_INDEX_SCHEMA_VERSION,
      contentHash: EMPTY_WORKSPACE_HASH,
    },
    projects: discovered.projects.map((project) => ({
      projectId: project.projectId,
      projectRoot: posix.dirname(project.configPath),
      projectConfigPath: project.configPath,
    })),
    programs,
    indexedForms: [],
    onFactoryInputAuthoringTarget: (target) => void targets.push(target),
  });
  targets.sort((left, right) =>
    compareCodeUnits(targetKey(left), targetKey(right))
  );
  const targetDiagnostics =
    indexed.factoryInputAuthoringDiagnostics.map(targetDiagnostic);
  const requested = requestedTargets(
    targets,
    targetDiagnostics,
    selection.formIds
  );
  const diagnostics: WorkspaceFactoryInputAuthoringDiagnostic[] = [
    ...requested.diagnostics,
  ];
  const drafts: WorkspaceFactoryInputAuthoringDraft[] = [];
  for (const target of requested.targets) {
    try {
      const generated = generateFactoryInputScaffold({
        workspaceRoot,
        descriptor: target.descriptor,
        factoryDeclaration: target.factoryDeclaration,
        definitionFilePath: target.definitionFilePath,
        formId: target.formId,
        scaffoldName: target.factorySymbol,
      });
      drafts.push({
        projectId: target.projectId,
        sourceId: target.sourceId,
        formId: target.formId,
        factorySymbol: target.factorySymbol,
        ...generated,
        metrics: metrics(generated),
      });
    } catch (error) {
      if (!(error instanceof FactoryInputScaffoldError)) throw error;
      diagnostics.push({
        code: "FACTORY_INPUT_AUTHORING_SCAFFOLD_UNAVAILABLE",
        formId: target.formId,
      });
    }
  }
  return {
    drafts: drafts.sort((left, right) =>
      compareCodeUnits(targetKey(left), targetKey(right))
    ),
    diagnostics: diagnostics.sort((left, right) =>
      compareCodeUnits(
        `${left.formId ?? ""}\0${left.code}`,
        `${right.formId ?? ""}\0${right.code}`
      )
    ),
  };
}
