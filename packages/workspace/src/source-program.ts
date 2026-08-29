import { realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import ts from "typescript";

import type { WorkspaceSourceUsageProgramDescriptor } from "./source-usage.js";
import { compareCodeUnits, isWithinWorkspace } from "./workspace-paths.js";

export type WorkspaceSourceProgramErrorCode =
  | "SOURCE_TSCONFIG_UNAVAILABLE"
  | "SOURCE_TSCONFIG_OUTSIDE_WORKSPACE"
  | "SOURCE_TSCONFIG_INVALID"
  | "SOURCE_TSCONFIG_UNCHECKED"
  | "SOURCE_PROGRAM_ROOT_UNAVAILABLE"
  | "SOURCE_PROGRAM_ROOT_OUTSIDE_WORKSPACE"
  | "SOURCE_PROGRAM_SOURCE_UNAVAILABLE"
  | "SOURCE_PROGRAM_SOURCE_OUTSIDE_WORKSPACE"
  | "SOURCE_ADDITIONAL_ROOT_UNAVAILABLE"
  | "SOURCE_ADDITIONAL_ROOT_OUTSIDE_WORKSPACE"
  | "SOURCE_PROGRAM_EMPTY";

const ERROR_MESSAGES: Readonly<
  Record<WorkspaceSourceProgramErrorCode, string>
> = {
  SOURCE_TSCONFIG_UNAVAILABLE:
    "The configured source-usage tsconfig could not be read.",
  SOURCE_TSCONFIG_OUTSIDE_WORKSPACE:
    "The configured source-usage tsconfig resolves outside the workspace.",
  SOURCE_TSCONFIG_INVALID: "The configured source-usage tsconfig is invalid.",
  SOURCE_TSCONFIG_UNCHECKED:
    "The configured application source-usage program must enable type checking.",
  SOURCE_PROGRAM_ROOT_UNAVAILABLE:
    "A configured source-usage program root could not be read.",
  SOURCE_PROGRAM_ROOT_OUTSIDE_WORKSPACE:
    "A configured source-usage program root resolves outside the workspace.",
  SOURCE_PROGRAM_SOURCE_UNAVAILABLE:
    "A workspace source in the source-usage program could not be read.",
  SOURCE_PROGRAM_SOURCE_OUTSIDE_WORKSPACE:
    "A workspace source in the source-usage program resolves outside the workspace.",
  SOURCE_ADDITIONAL_ROOT_UNAVAILABLE:
    "A registered contract config root could not be read.",
  SOURCE_ADDITIONAL_ROOT_OUTSIDE_WORKSPACE:
    "A registered contract config root resolves outside the workspace.",
  SOURCE_PROGRAM_EMPTY:
    "The configured source-usage tsconfig does not contain a leaf program.",
};

export class WorkspaceSourceProgramError extends Error {
  readonly code: WorkspaceSourceProgramErrorCode;

  constructor(code: WorkspaceSourceProgramErrorCode, cause?: unknown) {
    super(ERROR_MESSAGES[code], cause === undefined ? undefined : { cause });
    this.name = "WorkspaceSourceProgramError";
    this.code = code;
  }
}

export interface CreateWorkspaceSourceProgramInput {
  readonly workspaceRoot: string;
  readonly tsconfigPath: string;
  readonly programId: string;
  readonly purpose: WorkspaceSourceUsageProgramDescriptor["purpose"];
  readonly additionalRootPaths?: readonly string[];
  readonly includeConfiguredRootPaths?: boolean;
}

async function resolveAdditionalRootPaths(
  workspaceRoot: string,
  paths: readonly string[]
): Promise<readonly string[]> {
  const resolvedPaths: string[] = [];
  for (const path of paths) {
    let resolvedPath: string;
    try {
      resolvedPath = await realpath(resolve(workspaceRoot, path));
    } catch (error) {
      throw new WorkspaceSourceProgramError(
        "SOURCE_ADDITIONAL_ROOT_UNAVAILABLE",
        error
      );
    }
    if (!isWithinWorkspace(workspaceRoot, resolvedPath)) {
      throw new WorkspaceSourceProgramError(
        "SOURCE_ADDITIONAL_ROOT_OUTSIDE_WORKSPACE"
      );
    }
    resolvedPaths.push(resolvedPath);
  }
  return [...new Set(resolvedPaths)].sort(compareCodeUnits);
}

async function validateConfiguredRootPaths(
  workspaceRoot: string,
  paths: readonly string[]
): Promise<readonly string[]> {
  const validatedPaths: string[] = [];
  for (const path of paths) {
    const absolutePath = resolve(path);
    let resolvedPath: string;
    try {
      resolvedPath = await realpath(absolutePath);
    } catch (error) {
      throw new WorkspaceSourceProgramError(
        "SOURCE_PROGRAM_ROOT_UNAVAILABLE",
        error
      );
    }
    if (!isWithinWorkspace(workspaceRoot, resolvedPath)) {
      throw new WorkspaceSourceProgramError(
        "SOURCE_PROGRAM_ROOT_OUTSIDE_WORKSPACE"
      );
    }
    validatedPaths.push(absolutePath);
  }
  return [...new Set(validatedPaths)].sort(compareCodeUnits);
}

async function validateWorkspaceProgramSources(
  workspaceRoot: string,
  program: ts.Program
): Promise<void> {
  for (const sourceFile of program.getSourceFiles()) {
    const absolutePath = resolve(sourceFile.fileName);
    if (!isWithinWorkspace(workspaceRoot, absolutePath)) {
      continue;
    }
    if (
      sourceFile.isDeclarationFile &&
      program.isSourceFileFromExternalLibrary(sourceFile)
    ) {
      continue;
    }
    let resolvedPath: string;
    try {
      resolvedPath = await realpath(absolutePath);
    } catch (error) {
      throw new WorkspaceSourceProgramError(
        "SOURCE_PROGRAM_SOURCE_UNAVAILABLE",
        error
      );
    }
    if (!isWithinWorkspace(workspaceRoot, resolvedPath)) {
      throw new WorkspaceSourceProgramError(
        "SOURCE_PROGRAM_SOURCE_OUTSIDE_WORKSPACE"
      );
    }
  }
}

export async function createWorkspaceSourceProgram(
  input: CreateWorkspaceSourceProgramInput
): Promise<WorkspaceSourceUsageProgramDescriptor> {
  let workspaceRoot: string;
  let tsconfigPath: string;
  try {
    workspaceRoot = await realpath(resolve(input.workspaceRoot));
    tsconfigPath = await realpath(resolve(workspaceRoot, input.tsconfigPath));
  } catch (error) {
    throw new WorkspaceSourceProgramError("SOURCE_TSCONFIG_UNAVAILABLE", error);
  }
  if (!isWithinWorkspace(workspaceRoot, tsconfigPath)) {
    throw new WorkspaceSourceProgramError("SOURCE_TSCONFIG_OUTSIDE_WORKSPACE");
  }

  const config = ts.readConfigFile(tsconfigPath, (path) =>
    ts.sys.readFile(path)
  );
  if (config.error !== undefined) {
    throw new WorkspaceSourceProgramError(
      "SOURCE_TSCONFIG_INVALID",
      config.error
    );
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    dirname(tsconfigPath),
    undefined,
    tsconfigPath
  );
  const errors = parsed.errors.filter(
    ({ category, code }) =>
      category === ts.DiagnosticCategory.Error &&
      code !== 18002 &&
      code !== 18003
  );
  if (errors.length > 0) {
    throw new WorkspaceSourceProgramError("SOURCE_TSCONFIG_INVALID", errors);
  }
  if (input.purpose === "application" && parsed.options.noCheck === true) {
    throw new WorkspaceSourceProgramError("SOURCE_TSCONFIG_UNCHECKED");
  }
  const configuredRootPaths =
    input.includeConfiguredRootPaths === false
      ? []
      : await validateConfiguredRootPaths(workspaceRoot, parsed.fileNames);
  const additionalRootPaths = await resolveAdditionalRootPaths(
    workspaceRoot,
    input.additionalRootPaths ?? []
  );
  const rootNames = [
    ...new Set([...configuredRootPaths, ...additionalRootPaths]),
  ].sort(compareCodeUnits);
  if (rootNames.length === 0) {
    throw new WorkspaceSourceProgramError("SOURCE_PROGRAM_EMPTY");
  }

  let program: ts.Program;
  try {
    program = ts.createProgram({
      rootNames,
      options: parsed.options,
      ...(parsed.projectReferences === undefined
        ? {}
        : { projectReferences: parsed.projectReferences }),
    });
  } catch (error) {
    throw new WorkspaceSourceProgramError("SOURCE_TSCONFIG_INVALID", error);
  }
  if (program.getRootFileNames().length === 0) {
    throw new WorkspaceSourceProgramError("SOURCE_PROGRAM_EMPTY");
  }
  if (rootNames.some((path) => program.getSourceFile(path) === undefined)) {
    throw new WorkspaceSourceProgramError("SOURCE_PROGRAM_ROOT_UNAVAILABLE");
  }
  await validateWorkspaceProgramSources(workspaceRoot, program);

  return {
    programId: input.programId,
    purpose: input.purpose,
    program,
  };
}
