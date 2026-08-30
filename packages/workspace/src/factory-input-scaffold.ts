import { isAbsolute, posix, relative, resolve } from "node:path";

import ts from "typescript";

import {
  analyzeFactoryInputUsages,
  type AnalyzeFactoryInputUsagesInput,
  type FactoryInputMaterialization,
  type FactoryInputUseAmbiguityReason,
  type FactoryInputUsageDiagnosticCode,
  type FactoryInputUsageAnalysis,
} from "./factory-input-usage.js";
import type { FactoryInputDiagnosticCode } from "./factory-input-analysis.js";
import { compareCodeUnits, isWithinWorkspace } from "./workspace-paths.js";

const FORM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-]*$/u;
const PROPERTY_KEY_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
const MAX_IDENTIFIER_CHARACTERS = 120;
const MAX_PATH_CHARACTERS = 480;

export type FactoryInputScaffoldErrorCode =
  | "FACTORY_INPUT_SCAFFOLD_ANALYSIS_UNAVAILABLE"
  | "FACTORY_INPUT_SCAFFOLD_CONTEXT_INVALID"
  | "FACTORY_INPUT_SCAFFOLD_OPTIONS_TYPE_UNEXPORTED";

const ERROR_MESSAGES: Readonly<Record<FactoryInputScaffoldErrorCode, string>> =
  {
    FACTORY_INPUT_SCAFFOLD_ANALYSIS_UNAVAILABLE:
      "Factory input analysis cannot produce an authoring draft.",
    FACTORY_INPUT_SCAFFOLD_CONTEXT_INVALID:
      "Factory input scaffold authoring context is invalid.",
    FACTORY_INPUT_SCAFFOLD_OPTIONS_TYPE_UNEXPORTED:
      "The factory options type must be a named workspace export.",
  };

export class FactoryInputScaffoldError extends Error {
  readonly code: FactoryInputScaffoldErrorCode;

  constructor(code: FactoryInputScaffoldErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "FactoryInputScaffoldError";
    this.code = code;
  }
}

export interface GenerateFactoryInputScaffoldInput
  extends AnalyzeFactoryInputUsagesInput {
  readonly definitionFilePath: string;
  readonly formId: string;
  readonly scaffoldName: string;
}

export type FactoryInputScaffoldHelper =
  | "capturedCallback"
  | "inertObservable"
  | "unavailableView";

export interface FactoryInputScaffoldGeneratedProperty {
  readonly helper: FactoryInputScaffoldHelper;
  readonly key: string;
}

export interface FactoryInputScaffoldExplicitProperty {
  readonly key: string;
  readonly requirement: "binding" | "value";
}

export interface FactoryInputScaffoldDiagnostic {
  readonly code: FactoryInputDiagnosticCode | FactoryInputUsageDiagnosticCode;
  readonly propertyKey?: string;
  readonly reason?: FactoryInputUseAmbiguityReason;
  readonly storagePath?: string;
}

export interface FactoryInputScaffoldReview {
  readonly formId: string;
  readonly coverage: FactoryInputUsageAnalysis["coverage"];
  readonly generated: readonly FactoryInputScaffoldGeneratedProperty[];
  readonly explicit: readonly FactoryInputScaffoldExplicitProperty[];
  readonly unsupported: readonly string[];
  readonly diagnostics: readonly FactoryInputScaffoldDiagnostic[];
}

export interface FactoryInputScaffoldResult {
  readonly suggestedPath: string;
  readonly code: string;
  readonly review: FactoryInputScaffoldReview;
}

interface ExportedOptionsType {
  readonly exportName: string;
  readonly workspacePath: string;
}

function canonicalSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol | undefined
): ts.Symbol | undefined {
  return symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

function safeIdentifier(value: string): boolean {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    value
  );
  return (
    value.length > 0 &&
    value.length <= MAX_IDENTIFIER_CHARACTERS &&
    PROPERTY_KEY_PATTERN.test(value) &&
    scanner.scan() === ts.SyntaxKind.Identifier &&
    scanner.getTokenText() === value &&
    scanner.scan() === ts.SyntaxKind.EndOfFileToken
  );
}

function sourceExtension(path: string): string | undefined {
  for (const extension of [
    ".d.mts",
    ".d.cts",
    ".d.ts",
    ".mts",
    ".cts",
    ".tsx",
    ".ts",
  ]) {
    if (path.endsWith(extension)) return extension;
  }
  return undefined;
}

function safeWorkspaceSourcePath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= MAX_PATH_CHARACTERS &&
    !isAbsolute(path) &&
    !path.includes("\\") &&
    !path.includes(":") &&
    !/[\u0000-\u001f\u007f]/u.test(path) &&
    posix.normalize(path) === path &&
    path !== ".." &&
    !path.startsWith("../") &&
    sourceExtension(path) !== undefined
  );
}

function validateContext(input: GenerateFactoryInputScaffoldInput): void {
  const definitionExtension = sourceExtension(input.definitionFilePath);
  if (
    input.formId.length > MAX_IDENTIFIER_CHARACTERS ||
    !FORM_ID_PATTERN.test(input.formId) ||
    !safeIdentifier(input.scaffoldName) ||
    !safeWorkspaceSourcePath(input.definitionFilePath) ||
    definitionExtension?.startsWith(".d.") === true ||
    input.descriptor.program.getSourceFile(
      resolve(input.workspaceRoot, input.definitionFilePath)
    ) === undefined
  ) {
    throw new FactoryInputScaffoldError(
      "FACTORY_INPUT_SCAFFOLD_CONTEXT_INVALID"
    );
  }
}

function exportedOptionsType(
  input: GenerateFactoryInputScaffoldInput
): ExportedOptionsType {
  const typeAnalysis = analysisInputType(input);
  if (typeAnalysis === undefined) {
    throw new FactoryInputScaffoldError(
      "FACTORY_INPUT_SCAFFOLD_OPTIONS_TYPE_UNEXPORTED"
    );
  }
  return typeAnalysis;
}

function analysisInputType(
  input: GenerateFactoryInputScaffoldInput
): ExportedOptionsType | undefined {
  const checker = input.descriptor.program.getTypeChecker();
  const name = (input.factoryDeclaration as ts.NamedDeclaration).name;
  if (name === undefined) return undefined;
  const factorySymbol = checker.getSymbolAtLocation(name);
  if (factorySymbol === undefined) return undefined;
  const factoryType = checker.getTypeOfSymbolAtLocation(factorySymbol, name);
  const signatureKind = ts.isClassDeclaration(input.factoryDeclaration)
    ? ts.SignatureKind.Construct
    : ts.SignatureKind.Call;
  const signatures = checker.getSignaturesOfType(factoryType, signatureKind);
  if (signatures.length !== 1 || signatures[0]?.parameters.length !== 1) {
    return undefined;
  }
  const parameter = signatures[0].parameters[0]!;
  const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0];
  const type = checker.getTypeOfSymbolAtLocation(
    parameter,
    declaration ?? input.factoryDeclaration
  );
  const typeSymbol = canonicalSymbol(checker, type.aliasSymbol ?? type.symbol);
  const typeDeclaration =
    typeSymbol?.valueDeclaration ?? typeSymbol?.declarations?.[0];
  if (typeSymbol === undefined || typeDeclaration === undefined)
    return undefined;
  const sourceFile = typeDeclaration.getSourceFile();
  const absolutePath = resolve(sourceFile.fileName);
  const workspaceRoot = resolve(input.workspaceRoot);
  const relativePath = relative(workspaceRoot, absolutePath).replaceAll(
    "\\",
    "/"
  );
  if (
    !isWithinWorkspace(workspaceRoot, absolutePath) ||
    input.descriptor.program.isSourceFileFromExternalLibrary(sourceFile) ||
    relativePath.split("/").includes("node_modules") ||
    !safeWorkspaceSourcePath(relativePath)
  ) {
    return undefined;
  }
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (moduleSymbol === undefined) return undefined;
  const exported = checker
    .getExportsOfModule(moduleSymbol)
    .filter((candidate) => canonicalSymbol(checker, candidate) === typeSymbol)
    .sort((left, right) =>
      compareCodeUnits(left.getName(), right.getName())
    )[0];
  const exportName = exported?.getName();
  return exportName !== undefined && safeIdentifier(exportName)
    ? { exportName, workspacePath: relativePath }
    : undefined;
}

function suggestedPath(definitionFilePath: string): string {
  const extension = sourceExtension(definitionFilePath)!;
  return `${definitionFilePath.slice(
    0,
    -extension.length
  )}.factory-input.generated${
    extension.startsWith(".d.") ? extension.slice(2) : extension
  }`;
}

function runtimeImportPath(path: string): string {
  const extension = sourceExtension(path)!;
  const runtimeExtension =
    extension === ".mts" || extension === ".d.mts"
      ? ".mjs"
      : extension === ".cts" || extension === ".d.cts"
      ? ".cjs"
      : ".js";
  return `${path.slice(0, -extension.length)}${runtimeExtension}`;
}

function relativeModuleSpecifier(
  generatedPath: string,
  optionsPath: string
): string {
  const relativePath = posix.relative(
    posix.dirname(generatedPath),
    runtimeImportPath(optionsPath)
  );
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function helperFor(
  materialization: FactoryInputMaterialization
): FactoryInputScaffoldHelper | undefined {
  if (materialization === "captured-callback") return "capturedCallback";
  if (materialization === "inert-observable") return "inertObservable";
  if (materialization === "unavailable-view") return "unavailableView";
  return undefined;
}

function diagnosticKey(diagnostic: FactoryInputScaffoldDiagnostic): string {
  return [
    diagnostic.propertyKey ?? "",
    diagnostic.code,
    diagnostic.reason ?? "",
    diagnostic.storagePath ?? "",
  ].join("\0");
}

function createReview(
  formId: string,
  analysis: FactoryInputUsageAnalysis
): FactoryInputScaffoldReview {
  const generated: FactoryInputScaffoldGeneratedProperty[] = [];
  const explicit: FactoryInputScaffoldExplicitProperty[] = [];
  const unsupported: string[] = [];
  for (const property of analysis.properties) {
    if (
      property.key.length > MAX_IDENTIFIER_CHARACTERS ||
      !PROPERTY_KEY_PATTERN.test(property.key)
    ) {
      throw new FactoryInputScaffoldError(
        "FACTORY_INPUT_SCAFFOLD_CONTEXT_INVALID"
      );
    }
    const helper = property.optional
      ? undefined
      : helperFor(property.materialization);
    if (helper !== undefined) {
      generated.push({ helper, key: property.key });
    } else if (property.materialization === "unsupported") {
      unsupported.push(property.key);
    } else {
      explicit.push({
        key: property.key,
        requirement:
          property.materialization === "explicit-value-required"
            ? "value"
            : "binding",
      });
    }
  }
  const diagnostics = new Map<string, FactoryInputScaffoldDiagnostic>();
  for (const diagnostic of [
    ...analysis.diagnostics,
    ...analysis.typeDiagnostics,
  ]) {
    const value = {
      code: diagnostic.code,
      ...(diagnostic.propertyKey === undefined
        ? {}
        : { propertyKey: diagnostic.propertyKey }),
      ...("reason" in diagnostic && diagnostic.reason !== undefined
        ? { reason: diagnostic.reason }
        : {}),
      ...("storagePath" in diagnostic && diagnostic.storagePath !== undefined
        ? { storagePath: diagnostic.storagePath }
        : {}),
    };
    diagnostics.set(diagnosticKey(value), value);
  }
  return {
    formId,
    coverage: analysis.coverage,
    generated: generated.sort((left, right) =>
      compareCodeUnits(left.key, right.key)
    ),
    explicit: explicit.sort((left, right) =>
      compareCodeUnits(left.key, right.key)
    ),
    unsupported: unsupported.sort(compareCodeUnits),
    diagnostics: [...diagnostics.values()].sort((left, right) =>
      compareCodeUnits(diagnosticKey(left), diagnosticKey(right))
    ),
  };
}

function renderPickType(
  typeName: string,
  explicit: readonly FactoryInputScaffoldExplicitProperty[]
): string {
  if (explicit.length === 0) return `Pick<${typeName}, never>`;
  return [
    `Pick<`,
    `  ${typeName},`,
    ...explicit.map(({ key }) => `  | ${JSON.stringify(key)}`),
    `>`,
  ].join("\n");
}

function renderAssignment(
  typeName: string,
  property: FactoryInputScaffoldGeneratedProperty
): readonly string[] {
  const key = JSON.stringify(property.key);
  return [
    `    ${key}: h.${property.helper}<`,
    `      ${typeName}[${key}]`,
    `    >(${key}),`,
  ];
}

function renderCode(
  scaffoldName: string,
  optionsType: ExportedOptionsType,
  generatedPath: string,
  review: FactoryInputScaffoldReview
): string {
  const typeName = optionsType.exportName;
  const reserved = new Set([typeName]);
  const uniqueName = (base: string): string => {
    let candidate = base;
    let suffix = 2;
    while (reserved.has(candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    reserved.add(candidate);
    return candidate;
  };
  const explicitType = uniqueName(`${scaffoldName}ExplicitOptions`);
  const reviewName = uniqueName(`${scaffoldName}InputReview`);
  const factoryName = uniqueName(`create${scaffoldName}OptionsDraft`);
  const harnessType = uniqueName("FormlyContractFactoryInputAuthoringHarness");
  return [
    `import type { FactoryInputAuthoringHarness as ${harnessType} } from "@formly-contract/compiler";`,
    `import type { ${typeName} } from ${JSON.stringify(
      relativeModuleSpecifier(generatedPath, optionsType.workspacePath)
    )};`,
    "",
    `export type ${explicitType} = ${renderPickType(
      typeName,
      review.explicit
    )};`,
    "",
    `export const ${reviewName} = ${JSON.stringify(review, null, 2)} as const;`,
    "",
    `export const ${factoryName} = (`,
    `  h: ${harnessType},`,
    `  explicit: ${explicitType},`,
    `): Partial<${typeName}> =>`,
    "  ({",
    "    ...explicit,",
    ...review.generated.flatMap((property) =>
      renderAssignment(typeName, property)
    ),
    `  }) satisfies Partial<${typeName}>;`,
    "",
  ].join("\n");
}

export function generateFactoryInputScaffold(
  input: GenerateFactoryInputScaffoldInput
): FactoryInputScaffoldResult {
  validateContext(input);
  const analysis = analyzeFactoryInputUsages(input);
  if (analysis.properties.length === 0) {
    throw new FactoryInputScaffoldError(
      "FACTORY_INPUT_SCAFFOLD_ANALYSIS_UNAVAILABLE"
    );
  }
  const optionsType = exportedOptionsType(input);
  const path = suggestedPath(input.definitionFilePath);
  const review = createReview(input.formId, analysis);
  return {
    suggestedPath: path,
    review,
    code: renderCode(input.scaffoldName, optionsType, path, review),
  };
}
