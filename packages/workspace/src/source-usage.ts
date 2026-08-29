import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import {
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
  createAgentContextSourceUsageCatalog,
  type AgentContextFormRootCandidate,
  type AgentContextSourceLocation,
  type AgentContextSourceProgramPurpose,
  type AgentContextSourceSpan,
  type AgentContextSourceUsage,
  type AgentContextSourceUsageCatalog,
  type AgentContextWorkspaceIndexReference,
  type Sha256Digest,
} from "@formly-contract/schema";
import ts from "typescript";

export const SOURCE_USAGE_PILOT_COVERAGE_REASON =
  "bounded-programs-mvp" as const;

export interface WorkspaceSourceUsageProjectDescriptor {
  readonly projectId: string;
  readonly projectRoot: string;
  readonly projectConfigPath: string;
}

export interface WorkspaceSourceUsageProgramDescriptor {
  readonly programId: string;
  readonly purpose: AgentContextSourceProgramPurpose;
  readonly program: ts.Program;
  readonly resolveRuntimeModule?: (
    specifier: string,
    importerPath: string
  ) => string;
}

export interface WorkspaceSourceUsageIndexedForm {
  readonly projectId: string;
  readonly sourceId: string;
  readonly formId: string;
  readonly contractHash: Sha256Digest;
}

export type WorkspaceSourceUsageDiagnosticCode =
  | "DEFINITION_HELPER_NOT_FOUND"
  | "FORM_DEFINITION_DUPLICATE"
  | "FORM_DEFINITION_MISSING"
  | "FORM_DEFINITION_UNSUPPORTED"
  | "FORM_NOT_INDEXED"
  | "FORM_ROOT_INCOMPATIBLE"
  | "FORM_ROOT_MISSING"
  | "FORM_ROOT_OUTSIDE_WORKSPACE"
  | "FORM_ROOT_UNEXPORTED"
  | "FORM_ROOT_UNSTABLE"
  | "OVERLAPPING_PROGRAM_CONFLICT"
  | "SOURCE_FILE_SNAPSHOT_MISMATCH"
  | "SOURCE_FILE_UNREADABLE"
  | "SOURCE_DESCRIPTOR_CONFLICT"
  | "SOURCE_DESCRIPTOR_UNSUPPORTED"
  | "SOURCE_PROJECT_AMBIGUOUS"
  | "SOURCE_PROJECT_UNRESOLVED"
  | "SOURCE_RUNTIME_RESOLUTION_MISMATCH"
  | "SOURCE_USAGE_UNSUPPORTED";

export interface WorkspaceSourceUsageDiagnostic {
  readonly code: WorkspaceSourceUsageDiagnosticCode;
  readonly programId?: string;
  readonly projectId?: string;
  readonly formId?: string;
  readonly location?: Extract<
    AgentContextSourceLocation,
    { readonly kind: "path" }
  >;
}

export interface IndexWorkspaceSourceUsagesInput {
  readonly workspaceRoot: string;
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly projects: readonly WorkspaceSourceUsageProjectDescriptor[];
  readonly programs: readonly WorkspaceSourceUsageProgramDescriptor[];
  readonly indexedForms: readonly WorkspaceSourceUsageIndexedForm[];
  readonly readSourceFile?: (absolutePath: string) => Uint8Array;
}

export interface IndexWorkspaceSourceUsagesResult {
  readonly catalog: AgentContextSourceUsageCatalog;
  readonly diagnostics: readonly WorkspaceSourceUsageDiagnostic[];
}

interface ResolvedProjectDescriptor {
  readonly projectId: string;
  readonly projectRoot: string;
  readonly projectConfigPath: string;
}

interface SourceIdentity {
  readonly absolutePath: string;
  readonly path: string;
}

interface SourceState extends SourceIdentity {
  readonly hash: Sha256Digest;
  readonly analyzedText: string;
}

interface AnchorCandidate extends AgentContextFormRootCandidate {
  readonly dependencyPaths: readonly string[];
  readonly symbolId: string;
  readonly symbolKind: "function" | "class" | "callable-const";
}

interface RawDefinition {
  readonly anchorKey: string;
  readonly dependencyPaths: readonly string[];
  readonly definitionSiteKey: string;
  readonly formId: string;
  readonly rootAnchorId: string;
  readonly symbolId: string;
  readonly symbolKind: "function" | "class" | "callable-const";
}

interface ProvenancedDefinition extends RawDefinition {
  readonly evidenceRefs: readonly string[];
  readonly projectId: string;
}

interface RawDefinitionRegistration {
  readonly definitionSiteKey: string;
  readonly formId: string;
}

interface DefinitionSourceMembership {
  readonly dependencyPaths: readonly string[];
  readonly descriptorSiteKey: string;
  readonly definitionSiteKey: string;
  readonly projectId: string;
  readonly sourceId: string;
}

interface DefinitionRegistrationState {
  readonly formId: string;
  readonly projectId: string;
  readonly siteKeys: Set<string>;
}

interface ProgramContext {
  readonly checker: ts.TypeChecker;
  readonly componentDecoratorKeys: ReadonlySet<string>;
  readonly definitionHelpers: CanonicalHelperRegistry;
  readonly descriptor: WorkspaceSourceUsageProgramDescriptor;
  readonly errorDiagnostics: (
    sourceFile: ts.SourceFile
  ) => readonly ts.Diagnostic[];
  readonly hasSuppressionDirectives: (sourceFile: ts.SourceFile) => boolean;
  readonly projectHelpers: CanonicalHelperRegistry;
  readonly sourceHelpers: CanonicalHelperRegistry;
}

interface RegisteredSourceOrigin {
  readonly dependencyPaths: readonly string[];
  readonly descriptorSiteKey: string;
  readonly location: Extract<
    AgentContextSourceLocation,
    { readonly kind: "path" }
  >;
  readonly projectId: string;
  readonly registrationSiteKey: string;
  readonly sourceId: string;
}

interface StaticSourceDescriptor {
  readonly list: ts.ArrowFunction & {
    readonly body: ts.ArrayLiteralExpression;
  };
  readonly sourceId: string;
}

interface SourceUsageObservation {
  readonly dependencyPaths: readonly string[];
  readonly usage: AgentContextSourceUsage;
}

interface ResolvedSymbolTrace {
  readonly aliasDeclarations: readonly ts.Declaration[];
  readonly symbol?: ts.Symbol;
}

interface CanonicalHelperRegistry {
  readonly declarationsByKey: ReadonlyMap<string, readonly ts.Declaration[]>;
  readonly keys: ReadonlySet<string>;
}

interface ResolvedHelperTrace extends ResolvedSymbolTrace {
  readonly canonicalDeclarations: readonly ts.Declaration[];
  readonly helperDeclaration: ts.Declaration;
  readonly symbol: ts.Symbol;
}

interface ResolvedHelperCall {
  readonly aliasDeclarations: readonly ts.Declaration[];
  readonly call: ts.CallExpression;
  readonly helperDeclarations: readonly ts.Declaration[];
}

const FORM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-]*$/u;
const AGENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const WORKSPACE_MODULE_ID = "@formly-contract/workspace";
const ANGULAR_MODULE_ID = "@angular/core";
const TYPESCRIPT_SUPPRESSION_DIRECTIVE_PATTERN =
  /@ts-(?:expect-error|ignore|nocheck)\b/u;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function digest(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function sha256(input: Uint8Array): Sha256Digest {
  return `sha256:${createHash("sha256").update(input).digest("hex")}`;
}

function decodeTypeScriptSource(input: Uint8Array): string {
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = Buffer.from(bytes);
    const evenLength = swapped.length & ~1;
    for (let index = 0; index < evenLength; index += 2) {
      const first = swapped[index]!;
      swapped[index] = swapped[index + 1]!;
      swapped[index + 1] = first;
    }
    return swapped.toString("utf16le", 2);
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return bytes.toString("utf16le", 2);
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return bytes.toString("utf8", 3);
  }
  return bytes.toString("utf8");
}

function isWithin(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function sourceIdentity(
  workspaceRoot: string,
  fileName: string
): SourceIdentity | undefined {
  const absolutePath = resolve(workspaceRoot, fileName);
  if (!isWithin(workspaceRoot, absolutePath)) return undefined;
  const path = relative(workspaceRoot, absolutePath).replaceAll("\\", "/");
  if (path.length === 0) return undefined;
  return { absolutePath, path };
}

function sourceSpan(
  sourceFile: ts.SourceFile,
  node: ts.Node
): AgentContextSourceSpan {
  const start = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile)
  );
  const end = sourceFile.getLineAndCharacterOfPosition(node.end);
  return {
    start: { line: start.line + 1, column: start.character + 1 },
    end: { line: end.line + 1, column: end.character + 1 },
  };
}

function pathLocation(
  source: SourceIdentity,
  sourceFile: ts.SourceFile,
  node: ts.Node
): Extract<AgentContextSourceLocation, { readonly kind: "path" }> {
  return {
    kind: "path",
    pathMode: "workspace-relative",
    path: source.path,
    span: sourceSpan(sourceFile, node),
  };
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function resolveAliasSymbol(
  checker: ts.TypeChecker,
  initial: ts.Symbol | undefined
): ts.Symbol | undefined {
  return resolveAliasSymbolTrace(checker, initial).symbol;
}

function resolveAliasSymbolTrace(
  checker: ts.TypeChecker,
  initial: ts.Symbol | undefined
): ResolvedSymbolTrace {
  let symbol = initial;
  const seen = new Set<ts.Symbol>();
  const aliasDeclarations: ts.Declaration[] = [];
  while (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    if (seen.has(symbol)) return { aliasDeclarations };
    seen.add(symbol);
    for (const declaration of symbol.declarations ?? []) {
      aliasDeclarations.push(declaration);
    }
    symbol =
      checker.getImmediateAliasedSymbol(symbol) ??
      checker.getAliasedSymbol(symbol);
  }
  return { aliasDeclarations, ...(symbol === undefined ? {} : { symbol }) };
}

interface AliasModuleReference {
  readonly importerPath: string;
  readonly specifier: string;
}

function aliasModuleReference(
  declaration: ts.Declaration
): AliasModuleReference | undefined {
  let current: ts.Node | undefined = declaration;
  while (current !== undefined && !ts.isSourceFile(current)) {
    if (
      (ts.isImportDeclaration(current) || ts.isExportDeclaration(current)) &&
      current.moduleSpecifier !== undefined &&
      ts.isStringLiteral(current.moduleSpecifier)
    ) {
      return {
        importerPath: current.getSourceFile().fileName,
        specifier: current.moduleSpecifier.text,
      };
    }
    if (
      ts.isImportEqualsDeclaration(current) &&
      ts.isExternalModuleReference(current.moduleReference) &&
      current.moduleReference.expression !== undefined &&
      ts.isStringLiteral(current.moduleReference.expression)
    ) {
      return {
        importerPath: current.getSourceFile().fileName,
        specifier: current.moduleReference.expression.text,
      };
    }
    current = current.parent;
  }
  return undefined;
}

/** @internal Exported only for focused resolution-parity verification. */
export function runtimeResolutionMatchesTypeScript(
  descriptor: WorkspaceSourceUsageProgramDescriptor,
  declaration: ts.Declaration
): boolean {
  if (descriptor.resolveRuntimeModule === undefined) return true;
  const reference = aliasModuleReference(declaration);
  if (reference === undefined || reference.specifier === WORKSPACE_MODULE_ID) {
    return true;
  }
  const resolved = ts.resolveModuleName(
    reference.specifier,
    reference.importerPath,
    descriptor.program.getCompilerOptions(),
    ts.sys
  ).resolvedModule?.resolvedFileName;
  if (resolved === undefined) return false;
  try {
    return (
      realpathSync(resolved) ===
      descriptor.resolveRuntimeModule(
        reference.specifier,
        reference.importerPath
      )
    );
  } catch {
    return false;
  }
}

function canonicalSymbolAt(
  checker: ts.TypeChecker,
  node: ts.Node
): ts.Symbol | undefined {
  return resolveAliasSymbol(checker, checker.getSymbolAtLocation(node));
}

function declarationOf(symbol: ts.Symbol): ts.Declaration | undefined {
  return symbol.valueDeclaration ?? symbol.declarations?.[0];
}

function symbolKey(
  workspaceRoot: string,
  symbol: ts.Symbol
): string | undefined {
  const declaration = declarationOf(symbol);
  if (declaration === undefined) return undefined;
  const source = sourceIdentity(
    workspaceRoot,
    declaration.getSourceFile().fileName
  );
  if (source === undefined) return undefined;
  return `${source.path}:${declaration.pos}:${
    declaration.end
  }:${symbol.getName()}`;
}

function internalSymbolKey(symbol: ts.Symbol): string | undefined {
  const declaration = declarationOf(symbol);
  return declaration === undefined
    ? undefined
    : `${resolve(declaration.getSourceFile().fileName)}:${declaration.pos}:${
        declaration.end
      }:${symbol.getName()}`;
}

function directReferenceNode(
  node: ts.Expression
): ts.Identifier | ts.PropertyAccessExpression | undefined {
  if (ts.isIdentifier(node)) return node;
  if (
    ts.isPropertyAccessExpression(node) &&
    node.questionDotToken === undefined
  ) {
    let expression: ts.Expression = node.expression;
    while (ts.isPropertyAccessExpression(expression)) {
      if (expression.questionDotToken !== undefined) return undefined;
      expression = expression.expression;
    }
    return ts.isIdentifier(expression) ? node : undefined;
  }
  return undefined;
}

function calleeSymbolNode(
  node: ts.Identifier | ts.PropertyAccessExpression
): ts.Node {
  return ts.isPropertyAccessExpression(node) ? node.name : node;
}

function invocationSymbol(
  checker: ts.TypeChecker,
  expression: ts.Expression
): ResolvedSymbolTrace {
  const direct = directReferenceNode(expression);
  if (direct !== undefined) {
    return resolveAliasSymbolTrace(
      checker,
      checker.getSymbolAtLocation(calleeSymbolNode(direct))
    );
  }
  if (
    ts.isElementAccessExpression(expression) &&
    ts.isStringLiteral(expression.argumentExpression)
  ) {
    return resolveAliasSymbolTrace(
      checker,
      checker
        .getTypeAtLocation(expression.expression)
        .getProperty(expression.argumentExpression.text)
    );
  }
  return { aliasDeclarations: [] };
}

function isCanonicalHelperCall(
  checker: ts.TypeChecker,
  helpers: CanonicalHelperRegistry,
  node: ts.CallExpression
): boolean {
  return canonicalHelperCallTrace(checker, helpers, node) !== undefined;
}

function canonicalHelperCallTrace(
  checker: ts.TypeChecker,
  helpers: CanonicalHelperRegistry,
  node: ts.CallExpression
): ResolvedHelperTrace | undefined {
  if (node.questionDotToken !== undefined) return undefined;
  const reference = directReferenceNode(node.expression);
  if (reference === undefined) return undefined;
  const resolution = resolveAliasSymbolTrace(
    checker,
    checker.getSymbolAtLocation(calleeSymbolNode(reference))
  );
  const helperSymbol = resolution.symbol;
  const helperKey =
    helperSymbol === undefined ? undefined : internalSymbolKey(helperSymbol);
  if (
    helperSymbol === undefined ||
    helperKey === undefined ||
    !helpers.keys.has(helperKey)
  ) {
    return undefined;
  }
  const helperDeclaration = declarationOf(helperSymbol);
  const canonicalDeclarations = helpers.declarationsByKey.get(helperKey);
  return helperDeclaration === undefined || canonicalDeclarations === undefined
    ? undefined
    : {
        ...resolution,
        canonicalDeclarations,
        helperDeclaration,
        symbol: helperSymbol,
      };
}

function definitionSiteKey(
  workspaceRoot: string,
  node: ts.CallExpression
): string | undefined {
  const sourceFile = node.getSourceFile();
  const source = sourceIdentity(workspaceRoot, sourceFile.fileName);
  return source === undefined
    ? undefined
    : `${source.path}:${node.getStart(sourceFile)}:${node.end}`;
}

function helperDefinitionCallFromListElement(
  checker: ts.TypeChecker,
  definitionHelpers: CanonicalHelperRegistry,
  element: ts.Expression
): ResolvedHelperCall | undefined {
  if (
    ts.isCallExpression(element) &&
    isCanonicalHelperCall(checker, definitionHelpers, element)
  ) {
    const helperTrace = canonicalHelperCallTrace(
      checker,
      definitionHelpers,
      element
    );
    if (helperTrace === undefined) return undefined;
    return {
      aliasDeclarations: helperTrace.aliasDeclarations,
      call: element,
      helperDeclarations: helperTrace.canonicalDeclarations,
    };
  }
  const reference = directReferenceNode(element);
  if (reference === undefined) return undefined;
  const resolution = resolveAliasSymbolTrace(
    checker,
    checker.getSymbolAtLocation(calleeSymbolNode(reference))
  );
  const declaration =
    resolution.symbol === undefined
      ? undefined
      : declarationOf(resolution.symbol);
  if (
    declaration === undefined ||
    !ts.isVariableDeclaration(declaration) ||
    !ts.isIdentifier(declaration.name) ||
    !ts.isVariableDeclarationList(declaration.parent) ||
    (declaration.parent.flags & ts.NodeFlags.Const) === 0 ||
    declaration.initializer === undefined ||
    !ts.isCallExpression(declaration.initializer) ||
    !isCanonicalHelperCall(checker, definitionHelpers, declaration.initializer)
  ) {
    return undefined;
  }
  const helperTrace = canonicalHelperCallTrace(
    checker,
    definitionHelpers,
    declaration.initializer
  );
  if (helperTrace === undefined) return undefined;
  return {
    aliasDeclarations: [
      ...resolution.aliasDeclarations,
      ...helperTrace.aliasDeclarations,
    ],
    call: declaration.initializer,
    helperDeclarations: helperTrace.canonicalDeclarations,
  };
}

function helperCallFromDirectReference(
  checker: ts.TypeChecker,
  helpers: CanonicalHelperRegistry,
  expression: ts.Expression
): ResolvedHelperCall | undefined {
  const reference = directReferenceNode(expression);
  if (reference === undefined) return undefined;
  const resolution = resolveAliasSymbolTrace(
    checker,
    checker.getSymbolAtLocation(calleeSymbolNode(reference))
  );
  const declaration =
    resolution.symbol === undefined
      ? undefined
      : declarationOf(resolution.symbol);
  if (
    declaration === undefined ||
    !ts.isVariableDeclaration(declaration) ||
    !ts.isIdentifier(declaration.name) ||
    !ts.isVariableDeclarationList(declaration.parent) ||
    (declaration.parent.flags & ts.NodeFlags.Const) === 0 ||
    declaration.initializer === undefined ||
    !ts.isCallExpression(declaration.initializer) ||
    !isCanonicalHelperCall(checker, helpers, declaration.initializer)
  ) {
    return undefined;
  }
  const helperTrace = canonicalHelperCallTrace(
    checker,
    helpers,
    declaration.initializer
  );
  if (helperTrace === undefined) return undefined;
  return {
    aliasDeclarations: [
      ...resolution.aliasDeclarations,
      ...helperTrace.aliasDeclarations,
    ],
    call: declaration.initializer,
    helperDeclarations: helperTrace.canonicalDeclarations,
  };
}

function staticSourceDescriptor(
  node: ts.CallExpression
): StaticSourceDescriptor | undefined {
  const sourceArgument = node.arguments[0];
  const properties =
    node.arguments.length === 1 &&
    sourceArgument !== undefined &&
    ts.isObjectLiteralExpression(sourceArgument)
      ? exactObjectProperties(sourceArgument)
      : undefined;
  const sourceIdNode = properties?.get("sourceId");
  const listNode = properties?.get("list");
  return properties?.size === 2 &&
    sourceIdNode !== undefined &&
    ts.isStringLiteral(sourceIdNode) &&
    listNode !== undefined &&
    ts.isArrowFunction(listNode) &&
    listNode.parameters.length === 0 &&
    ts.isArrayLiteralExpression(listNode.body)
    ? {
        list: listNode as StaticSourceDescriptor["list"],
        sourceId: sourceIdNode.text,
      }
    : undefined;
}

function defaultExportCall(
  sourceFile: ts.SourceFile
): ts.CallExpression | undefined {
  const exports = sourceFile.statements.filter(
    (statement): statement is ts.ExportAssignment =>
      ts.isExportAssignment(statement) && !statement.isExportEquals
  );
  if (exports.length !== 1) return undefined;
  const expression = unwrapTransparentExpression(exports[0]!.expression);
  return ts.isCallExpression(expression) ? expression : undefined;
}

function moduleExportTrace(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  moduleId: string,
  exportName: string
):
  | {
      readonly declarations: readonly ts.Declaration[];
      readonly key: string;
    }
  | undefined {
  for (const statement of sourceFile.statements) {
    const moduleSpecifier =
      ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)
        ? statement.moduleSpecifier
        : undefined;
    if (
      moduleSpecifier === undefined ||
      !ts.isStringLiteral(moduleSpecifier) ||
      moduleSpecifier.text !== moduleId
    ) {
      continue;
    }
    const moduleSymbol = checker.getSymbolAtLocation(moduleSpecifier);
    if (moduleSymbol === undefined) continue;
    const exported = checker
      .getExportsOfModule(moduleSymbol)
      .find((candidate) => candidate.getName() === exportName);
    const resolution = resolveAliasSymbolTrace(checker, exported);
    const canonical = resolution.symbol;
    const declaration =
      canonical === undefined ? undefined : declarationOf(canonical);
    const key =
      canonical === undefined ? undefined : internalSymbolKey(canonical);
    if (key !== undefined && declaration !== undefined) {
      return {
        declarations: [...resolution.aliasDeclarations, declaration].filter(
          (candidate, index, declarations) =>
            declarations.indexOf(candidate) === index
        ),
        key,
      };
    }
  }
  return undefined;
}

function moduleExportRegistry(
  program: ts.Program,
  checker: ts.TypeChecker,
  moduleId: string,
  exportName: string
): CanonicalHelperRegistry {
  const keys = new Set<string>();
  const declarationsByKey = new Map<string, ts.Declaration[]>();
  for (const sourceFile of program.getSourceFiles()) {
    const trace = moduleExportTrace(checker, sourceFile, moduleId, exportName);
    if (trace === undefined) continue;
    keys.add(trace.key);
    const declarations = declarationsByKey.get(trace.key) ?? [];
    for (const declaration of trace.declarations) {
      if (!declarations.includes(declaration)) declarations.push(declaration);
    }
    declarationsByKey.set(trace.key, declarations);
  }
  return { declarationsByKey, keys };
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    ) ?? false
  );
}

function rootDeclarationStatus(
  declaration: ts.Declaration
): "supported" | "unexported" | "unstable" {
  if (
    ts.isFunctionDeclaration(declaration) ||
    ts.isClassDeclaration(declaration)
  ) {
    if (declaration.name === undefined) return "unstable";
    return hasExportModifier(declaration) ? "supported" : "unexported";
  }
  if (
    !ts.isVariableDeclaration(declaration) ||
    !ts.isIdentifier(declaration.name)
  ) {
    return "unstable";
  }
  if (
    declaration.initializer === undefined ||
    (!ts.isArrowFunction(declaration.initializer) &&
      !ts.isFunctionExpression(declaration.initializer))
  ) {
    return "unstable";
  }
  const declarationList = declaration.parent;
  const statement = declarationList.parent;
  if (
    !ts.isVariableDeclarationList(declarationList) ||
    (declarationList.flags & ts.NodeFlags.Const) === 0 ||
    !ts.isVariableStatement(statement)
  ) {
    return "unstable";
  }
  return hasExportModifier(statement) ? "supported" : "unexported";
}

function isArrayRootType(checker: ts.TypeChecker, type: ts.Type): boolean {
  if (
    (type.flags &
      (ts.TypeFlags.Any |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Null)) !==
    0
  ) {
    return false;
  }
  if (type.isUnion())
    return type.types.every((member) => isArrayRootType(checker, member));
  const isTuple = checker.isTupleType(type);
  if (!checker.isArrayType(type) && !isTuple) return false;
  const elementTypes = checker.getTypeArguments(type as ts.TypeReference);
  if (isTuple && elementTypes.length === 0) return true;
  return (
    elementTypes.length > 0 &&
    elementTypes.every(
      (elementType) =>
        (elementType.flags &
          (ts.TypeFlags.Any |
            ts.TypeFlags.Unknown |
            ts.TypeFlags.Never |
            ts.TypeFlags.Void |
            ts.TypeFlags.Undefined |
            ts.TypeFlags.Null)) ===
          0 &&
        checker.isTypeAssignableTo(elementType, checker.getNonPrimitiveType())
    )
  );
}

function isRootProductType(
  checker: ts.TypeChecker,
  type: ts.Type,
  location: ts.Node
): boolean {
  if (isArrayRootType(checker, type)) return true;
  if (type.isUnion()) {
    return type.types.every((member) =>
      isRootProductType(checker, member, location)
    );
  }
  const fields = type.getProperty("fields");
  if (fields === undefined) return false;
  return isArrayRootType(
    checker,
    checker.getTypeOfSymbolAtLocation(fields, location)
  );
}

function restTypeAcceptsZeroArguments(
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: Set<ts.Type> = new Set<ts.Type>()
): boolean {
  if (seen.has(type)) return false;
  seen.add(type);
  if (checker.isTupleType(type)) {
    return (type as ts.TupleTypeReference).target.minLength === 0;
  }
  if (type.isUnion()) {
    return type.types.some((member) =>
      restTypeAcceptsZeroArguments(checker, member, new Set<ts.Type>(seen))
    );
  }
  if (type.isIntersection()) {
    return type.types.every((member) =>
      restTypeAcceptsZeroArguments(checker, member, new Set<ts.Type>(seen))
    );
  }
  if ((type.flags & ts.TypeFlags.TypeParameter) !== 0) {
    const constraint = checker.getBaseConstraintOfType(type);
    return (
      constraint !== undefined &&
      constraint !== type &&
      restTypeAcceptsZeroArguments(checker, constraint, seen)
    );
  }
  return checker.isArrayType(type);
}

function isCompatibleRoot(
  checker: ts.TypeChecker,
  anchor: ts.Expression,
  declaration: ts.Declaration,
  requireZeroArguments: boolean
): boolean {
  const type = checker.getTypeAtLocation(anchor);
  const signatureKind = ts.isClassDeclaration(declaration)
    ? ts.SignatureKind.Construct
    : ts.SignatureKind.Call;
  return checker.getSignaturesOfType(type, signatureKind).some(
    (signature) =>
      (!requireZeroArguments ||
        signature.getDeclaration().parameters.every((parameter) => {
          if (
            parameter.questionToken !== undefined ||
            parameter.initializer !== undefined
          ) {
            return true;
          }
          if (parameter.dotDotDotToken === undefined) return false;
          return restTypeAcceptsZeroArguments(
            checker,
            checker.getTypeAtLocation(parameter)
          );
        })) &&
      isRootProductType(
        checker,
        checker.getReturnTypeOfSignature(signature),
        declaration
      )
  );
}

function isCompatibleInvocation(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression
): boolean {
  const signature = checker.getResolvedSignature(node);
  return (
    signature !== undefined &&
    isRootProductType(
      checker,
      checker.getReturnTypeOfSignature(signature),
      node
    )
  );
}

function hasIntersectingTypeScriptError(
  context: ProgramContext,
  sourceFile: ts.SourceFile,
  node: ts.Node
): boolean {
  const nodeStart = node.getStart(sourceFile);
  const nodeEnd = node.end;
  return context.errorDiagnostics(sourceFile).some((diagnostic) => {
    if (
      diagnostic.category !== ts.DiagnosticCategory.Error ||
      diagnostic.file !== sourceFile ||
      diagnostic.start === undefined
    ) {
      return false;
    }
    const diagnosticStart = diagnostic.start;
    const diagnosticLength = diagnostic.length ?? 0;
    if (diagnosticLength === 0) {
      return diagnosticStart >= nodeStart && diagnosticStart <= nodeEnd;
    }
    const diagnosticEnd = diagnosticStart + diagnosticLength;
    return diagnosticStart < nodeEnd && diagnosticEnd > nodeStart;
  });
}

function isJavaScriptFamilySource(sourceFile: ts.SourceFile): boolean {
  return /\.(?:cjs|js|jsx|mjs)$/iu.test(sourceFile.fileName);
}

function hasTypeScriptSuppressionDirective(sourceFile: ts.SourceFile): boolean {
  const scanner = ts.createScanner(
    sourceFile.languageVersion,
    false,
    sourceFile.languageVariant,
    sourceFile.text
  );
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; ) {
    if (
      (token === ts.SyntaxKind.SingleLineCommentTrivia ||
        token === ts.SyntaxKind.MultiLineCommentTrivia) &&
      TYPESCRIPT_SUPPRESSION_DIRECTIVE_PATTERN.test(scanner.getTokenText())
    ) {
      return true;
    }
    token = scanner.scan();
  }
  return false;
}

function rootSymbolKind(
  declaration: ts.Declaration
): "function" | "class" | "callable-const" {
  if (ts.isClassDeclaration(declaration)) return "class";
  return ts.isVariableDeclaration(declaration) ? "callable-const" : "function";
}

function publicSymbolId(symbol: ts.Symbol, anchorKey: string): string {
  const name = symbol.getName();
  return name.length <= 256 && AGENT_ID_PATTERN.test(name)
    ? name
    : `symbol.${digest(anchorKey)}`;
}

function exactObjectProperties(
  object: ts.ObjectLiteralExpression
): ReadonlyMap<string, ts.Expression> | undefined {
  const properties = new Map<string, ts.Expression>();
  for (const property of object.properties) {
    if (
      !ts.isPropertyAssignment(property) ||
      !ts.isIdentifier(property.name) ||
      properties.has(property.name.text)
    ) {
      return undefined;
    }
    properties.set(property.name.text, property.initializer);
  }
  return properties;
}

function unwrapTransparentExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function invocationKey(
  workspaceRoot: string,
  node: ts.CallExpression | ts.NewExpression
): string | undefined {
  const source = sourceIdentity(workspaceRoot, node.getSourceFile().fileName);
  return source === undefined
    ? undefined
    : `${source.path}:${node.getStart(node.getSourceFile())}:${node.end}:${
        ts.isNewExpression(node) ? "construct" : "call"
      }`;
}

function collectInvocationKeys(
  workspaceRoot: string,
  scope: ts.Node
): readonly string[] {
  const keys: string[] = [];
  walk(scope, (node) => {
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return;
    const key = invocationKey(workspaceRoot, node);
    if (key !== undefined) keys.push(key);
  });
  return keys;
}

function nearestClass(node: ts.Node): ts.ClassDeclaration | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isClassDeclaration(current)) return current;
    current = current.parent;
  }
  return undefined;
}

function componentContext(
  workspaceRoot: string,
  checker: ts.TypeChecker,
  componentDecoratorKeys: ReadonlySet<string>,
  node: ts.Node
): AgentContextSourceUsage["contexts"] {
  const declaration = nearestClass(node);
  if (declaration?.name === undefined || !ts.canHaveDecorators(declaration))
    return [];
  const isComponent = (ts.getDecorators(declaration) ?? []).some(
    (decorator) => {
      const expression = decorator.expression;
      if (!ts.isCallExpression(expression)) return false;
      const callee = directReferenceNode(expression.expression);
      if (callee === undefined) return false;
      const symbol = canonicalSymbolAt(checker, calleeSymbolNode(callee));
      const key = symbol === undefined ? undefined : internalSymbolKey(symbol);
      return key !== undefined && componentDecoratorKeys.has(key);
    }
  );
  if (!isComponent) return [];
  const className = declaration.name.text;
  const classKey = `${
    symbolKey(workspaceRoot, canonicalSymbolAt(checker, declaration.name)!) ??
    className
  }`;
  const id = AGENT_ID_PATTERN.test(className)
    ? className
    : `component.${digest(classKey)}`;
  return [
    {
      kind: "component",
      id,
      evidenceRefs: [`angular.component.${digest(classKey)}`],
    },
  ];
}

function diagnosticKey(diagnostic: WorkspaceSourceUsageDiagnostic): string {
  const location = diagnostic.location;
  return [
    diagnostic.code,
    diagnostic.programId ?? "",
    diagnostic.projectId ?? "",
    diagnostic.formId ?? "",
    location?.path ?? "",
    location?.span.start.line ?? 0,
    location?.span.start.column ?? 0,
    location?.span.end.line ?? 0,
    location?.span.end.column ?? 0,
  ].join("\0");
}

function normalizeDiagnostics(
  diagnostics: readonly WorkspaceSourceUsageDiagnostic[]
): readonly WorkspaceSourceUsageDiagnostic[] {
  const unique = new Map<string, WorkspaceSourceUsageDiagnostic>();
  for (const diagnostic of diagnostics)
    unique.set(diagnosticKey(diagnostic), diagnostic);
  return [...unique.values()].sort((left, right) =>
    compareText(diagnosticKey(left), diagnosticKey(right))
  );
}

function normalizeProjects(
  workspaceRoot: string,
  projects: readonly WorkspaceSourceUsageProjectDescriptor[]
): readonly ResolvedProjectDescriptor[] {
  if (projects.length === 0)
    throw new TypeError("projects must contain at least one project.");
  const ids = new Set<string>();
  return projects
    .map((project) => {
      if (ids.has(project.projectId)) {
        throw new TypeError(`Duplicate project ID: ${project.projectId}`);
      }
      ids.add(project.projectId);
      const projectRoot = resolve(workspaceRoot, project.projectRoot);
      if (!isWithin(workspaceRoot, projectRoot)) {
        throw new TypeError(
          `Project root must be inside the workspace: ${project.projectId}`
        );
      }
      const projectConfig = sourceIdentity(
        workspaceRoot,
        project.projectConfigPath
      );
      if (
        projectConfig === undefined ||
        !isWithin(projectRoot, projectConfig.absolutePath)
      ) {
        throw new TypeError(
          `Project config must be inside the project root: ${project.projectId}`
        );
      }
      return {
        projectId: project.projectId,
        projectRoot,
        projectConfigPath: projectConfig.path,
      };
    })
    .sort((left, right) => compareText(left.projectId, right.projectId));
}

function normalizePrograms(
  programs: readonly WorkspaceSourceUsageProgramDescriptor[]
): readonly WorkspaceSourceUsageProgramDescriptor[] {
  if (programs.length === 0)
    throw new TypeError("programs must contain at least one program.");
  const ids = new Set<string>();
  for (const program of programs) {
    if (!AGENT_ID_PATTERN.test(program.programId)) {
      throw new TypeError(`Invalid program ID: ${program.programId}`);
    }
    if (ids.has(program.programId)) {
      throw new TypeError(`Duplicate program ID: ${program.programId}`);
    }
    ids.add(program.programId);
  }
  return [...programs].sort((left, right) =>
    compareText(left.programId, right.programId)
  );
}

function ownerOf(
  projects: readonly ResolvedProjectDescriptor[],
  absolutePath: string
):
  | { readonly status: "exact"; readonly projectId: string }
  | { readonly status: "ambiguous" | "unresolved" } {
  const candidates = projects
    .filter((project) => isWithin(project.projectRoot, absolutePath))
    .sort(
      (left, right) =>
        right.projectRoot.length - left.projectRoot.length ||
        compareText(left.projectId, right.projectId)
    );
  const first = candidates[0];
  if (first === undefined) return { status: "unresolved" };
  const second = candidates[1];
  if (second?.projectRoot.length === first.projectRoot.length) {
    return { status: "ambiguous" };
  }
  return { status: "exact", projectId: first.projectId };
}

function indexedFormMap(
  indexedForms: readonly WorkspaceSourceUsageIndexedForm[]
): ReadonlyMap<string, WorkspaceSourceUsageIndexedForm> {
  const forms = new Map<string, WorkspaceSourceUsageIndexedForm>();
  for (const form of indexedForms) {
    const key = `${form.projectId}\0${form.sourceId}\0${form.formId}`;
    if (forms.has(key)) {
      throw new TypeError(
        `Duplicate indexed form: ${form.projectId}/${form.sourceId}/${form.formId}`
      );
    }
    forms.set(key, form);
  }
  return forms;
}

function createProgramContext(
  descriptor: WorkspaceSourceUsageProgramDescriptor
): ProgramContext {
  const checker = descriptor.program.getTypeChecker();
  const errorDiagnostics = new Map<ts.SourceFile, readonly ts.Diagnostic[]>();
  const suppressionDirectives = new Map<ts.SourceFile, boolean>();
  const componentDecorators = moduleExportRegistry(
    descriptor.program,
    checker,
    ANGULAR_MODULE_ID,
    "Component"
  );
  return {
    checker,
    descriptor,
    errorDiagnostics: (sourceFile) => {
      const cached = errorDiagnostics.get(sourceFile);
      if (cached !== undefined) return cached;
      const diagnostics = [
        ...descriptor.program.getSyntacticDiagnostics(sourceFile),
        ...descriptor.program.getSemanticDiagnostics(sourceFile),
      ];
      errorDiagnostics.set(sourceFile, diagnostics);
      return diagnostics;
    },
    hasSuppressionDirectives: (sourceFile) => {
      const cached = suppressionDirectives.get(sourceFile);
      if (cached !== undefined) return cached;
      const containsDirective = hasTypeScriptSuppressionDirective(sourceFile);
      suppressionDirectives.set(sourceFile, containsDirective);
      return containsDirective;
    },
    definitionHelpers: moduleExportRegistry(
      descriptor.program,
      checker,
      WORKSPACE_MODULE_ID,
      "defineFormContractDefinition"
    ),
    componentDecoratorKeys: componentDecorators.keys,
    projectHelpers: moduleExportRegistry(
      descriptor.program,
      checker,
      WORKSPACE_MODULE_ID,
      "defineFormContractProject"
    ),
    sourceHelpers: moduleExportRegistry(
      descriptor.program,
      checker,
      WORKSPACE_MODULE_ID,
      "defineFormContractSource"
    ),
  };
}

export function indexWorkspaceSourceUsages(
  input: IndexWorkspaceSourceUsagesInput
): IndexWorkspaceSourceUsagesResult {
  const workspaceRoot = resolve(input.workspaceRoot);
  const projects = normalizeProjects(workspaceRoot, input.projects);
  const programs = normalizePrograms(input.programs);
  const indexedForms = indexedFormMap(input.indexedForms);
  const readSourceFile =
    input.readSourceFile ?? ((fileName: string) => readFileSync(fileName));
  const diagnostics: WorkspaceSourceUsageDiagnostic[] = [];
  const runtimeResolutionDiagnosticKeys = new Set<string>();
  const creationInvocationKeys = new Set<string>();
  const definitionsBySite = new Map<string, RawDefinition>();
  const conflictedDefinitionSites = new Set<string>();
  const invalidDefinitionSites = new Set<string>();
  const registrationsBySite = new Map<string, RawDefinitionRegistration>();
  const definitionSourceMemberships = new Map<
    string,
    DefinitionSourceMembership
  >();
  const contexts = programs.map(createProgramContext);
  const sourceStates = new Map<string, SourceState | null>();
  const invalidatedSourcePaths = new Set<string>();
  const sourceState = (
    programId: string,
    source: SourceIdentity,
    sourceFile: ts.SourceFile
  ): SourceState | undefined => {
    const cached = sourceStates.get(source.absolutePath);
    if (cached !== undefined) {
      if (cached === null) return undefined;
      if (cached.analyzedText !== sourceFile.text) {
        sourceStates.set(source.absolutePath, null);
        invalidatedSourcePaths.add(source.path);
        diagnostics.push({
          code: "SOURCE_FILE_SNAPSHOT_MISMATCH",
          programId,
          location: pathLocation(source, sourceFile, sourceFile),
        });
        return undefined;
      }
      return cached;
    }
    try {
      const bytes = Buffer.from(readSourceFile(source.absolutePath));
      const analyzedText = decodeTypeScriptSource(bytes);
      if (analyzedText !== sourceFile.text) {
        sourceStates.set(source.absolutePath, null);
        invalidatedSourcePaths.add(source.path);
        diagnostics.push({
          code: "SOURCE_FILE_SNAPSHOT_MISMATCH",
          programId,
          location: pathLocation(source, sourceFile, sourceFile),
        });
        return undefined;
      }
      const state = { ...source, analyzedText, hash: sha256(bytes) };
      sourceStates.set(source.absolutePath, state);
      return state;
    } catch {
      sourceStates.set(source.absolutePath, null);
      invalidatedSourcePaths.add(source.path);
      diagnostics.push({
        code: "SOURCE_FILE_UNREADABLE",
        programId,
        location: pathLocation(source, sourceFile, sourceFile),
      });
      return undefined;
    }
  };
  const verifyAliasDeclarations = (
    context: ProgramContext,
    declarations: readonly ts.Declaration[],
    canonicalHelperDeclarations: readonly ts.Declaration[] = []
  ): readonly string[] | undefined => {
    const canonicalHelpers = new Set(canonicalHelperDeclarations);
    const paths: string[] = [];
    for (const declaration of declarations) {
      const sourceFile = declaration.getSourceFile();
      if (
        canonicalHelpers.has(declaration) &&
        context.descriptor.program.isSourceFileFromExternalLibrary(sourceFile)
      ) {
        continue;
      }
      const source = sourceIdentity(workspaceRoot, sourceFile.fileName);
      if (source === undefined) {
        if (canonicalHelpers.has(declaration)) continue;
        return undefined;
      }
      if (
        sourceState(context.descriptor.programId, source, sourceFile) ===
        undefined
      ) {
        return undefined;
      }
      if (
        !runtimeResolutionMatchesTypeScript(context.descriptor, declaration)
      ) {
        const diagnosticKey = `${context.descriptor.programId}\0${source.path}\0${declaration.pos}\0${declaration.end}`;
        if (!runtimeResolutionDiagnosticKeys.has(diagnosticKey)) {
          runtimeResolutionDiagnosticKeys.add(diagnosticKey);
          const ownership = ownerOf(projects, source.absolutePath);
          diagnostics.push({
            code: "SOURCE_RUNTIME_RESOLUTION_MISMATCH",
            programId: context.descriptor.programId,
            ...(ownership.status === "exact"
              ? { projectId: ownership.projectId }
              : {}),
            location: pathLocation(source, sourceFile, declaration),
          });
        }
        return undefined;
      }
      paths.push(source.path);
    }
    return paths
      .filter((path, index, values) => values.indexOf(path) === index)
      .sort(compareText);
  };

  for (const context of contexts) {
    for (const sourceFile of context.descriptor.program.getSourceFiles()) {
      const source = sourceIdentity(workspaceRoot, sourceFile.fileName);
      if (source !== undefined) {
        sourceState(context.descriptor.programId, source, sourceFile);
      }
    }
  }

  const registeredSourceObservations = new Map<
    string,
    RegisteredSourceOrigin
  >();
  const conflictedRegistrationSites = new Set<string>();
  const invalidProjectConfigPaths = new Set<string>();

  for (const context of contexts) {
    for (const project of projects) {
      const sourceFile = context.descriptor.program
        .getSourceFiles()
        .find((candidate) => {
          const identity = sourceIdentity(workspaceRoot, candidate.fileName);
          return identity?.path === project.projectConfigPath;
        });
      if (sourceFile === undefined) continue;
      const source = sourceIdentity(workspaceRoot, sourceFile.fileName)!;
      if (
        sourceState(context.descriptor.programId, source, sourceFile) ===
        undefined
      ) {
        continue;
      }
      const projectCall = defaultExportCall(sourceFile);
      const projectHelperResolution =
        projectCall === undefined
          ? undefined
          : canonicalHelperCallTrace(
              context.checker,
              context.projectHelpers,
              projectCall
            );
      const projectHelperAliasPaths =
        projectHelperResolution === undefined
          ? undefined
          : verifyAliasDeclarations(
              context,
              [
                ...projectHelperResolution.aliasDeclarations,
                ...projectHelperResolution.canonicalDeclarations,
              ],
              projectHelperResolution.canonicalDeclarations
            );
      const projectArgument = projectCall?.arguments[0];
      const projectProperties =
        projectCall !== undefined &&
        projectHelperResolution !== undefined &&
        projectHelperAliasPaths !== undefined &&
        projectCall.arguments.length === 1 &&
        projectArgument !== undefined &&
        ts.isObjectLiteralExpression(projectArgument)
          ? exactObjectProperties(projectArgument)
          : undefined;
      const projectIdNode = projectProperties?.get("projectId");
      const sourcesNode = projectProperties?.get("sources");
      if (
        projectProperties === undefined ||
        projectIdNode === undefined ||
        !ts.isStringLiteral(projectIdNode) ||
        projectIdNode.text !== project.projectId ||
        (sourcesNode !== undefined && !ts.isArrayLiteralExpression(sourcesNode))
      ) {
        diagnostics.push({
          code: "SOURCE_DESCRIPTOR_UNSUPPORTED",
          programId: context.descriptor.programId,
          projectId: project.projectId,
          location: pathLocation(source, sourceFile, projectCall ?? sourceFile),
        });
        invalidProjectConfigPaths.add(source.path);
        continue;
      }
      if (sourcesNode === undefined) continue;
      const projectOrigins: RegisteredSourceOrigin[] = [];
      let unsupportedProjectSources = false;
      for (const element of sourcesNode.elements) {
        const descriptorResolution = helperCallFromDirectReference(
          context.checker,
          context.sourceHelpers,
          element
        );
        if (descriptorResolution === undefined) {
          unsupportedProjectSources = true;
          diagnostics.push({
            code: "SOURCE_DESCRIPTOR_UNSUPPORTED",
            programId: context.descriptor.programId,
            projectId: project.projectId,
            location: pathLocation(source, sourceFile, element),
          });
          continue;
        }
        const descriptorCall = descriptorResolution.call;
        const descriptorAliasPaths = verifyAliasDeclarations(
          context,
          [
            ...descriptorResolution.aliasDeclarations,
            ...descriptorResolution.helperDeclarations,
          ],
          descriptorResolution.helperDeclarations
        );
        const descriptorSourceFile = descriptorCall.getSourceFile();
        const descriptorSource = sourceIdentity(
          workspaceRoot,
          descriptorSourceFile.fileName
        );
        const descriptorSiteKey = definitionSiteKey(
          workspaceRoot,
          descriptorCall
        );
        const descriptor = staticSourceDescriptor(descriptorCall);
        if (
          descriptorSource === undefined ||
          descriptorSiteKey === undefined ||
          descriptor === undefined ||
          descriptorAliasPaths === undefined ||
          sourceState(
            context.descriptor.programId,
            descriptorSource,
            descriptorSourceFile
          ) === undefined
        ) {
          unsupportedProjectSources = true;
          diagnostics.push({
            code: "SOURCE_DESCRIPTOR_UNSUPPORTED",
            programId: context.descriptor.programId,
            projectId: project.projectId,
            location:
              descriptorSource === undefined
                ? pathLocation(source, sourceFile, element)
                : pathLocation(
                    descriptorSource,
                    descriptorSourceFile,
                    descriptorCall
                  ),
          });
          continue;
        }
        const registrationSiteKey = `${source.path}:${element.getStart(
          sourceFile
        )}:${element.end}`;
        projectOrigins.push({
          dependencyPaths: [
            source.path,
            descriptorSource.path,
            ...(projectHelperAliasPaths ?? []),
            ...descriptorAliasPaths,
          ]
            .filter((path, index, paths) => paths.indexOf(path) === index)
            .sort(compareText),
          descriptorSiteKey,
          location: pathLocation(source, sourceFile, element),
          projectId: project.projectId,
          registrationSiteKey,
          sourceId: descriptor.sourceId,
        });
      }
      if (unsupportedProjectSources) {
        invalidProjectConfigPaths.add(source.path);
        continue;
      }
      for (const origin of projectOrigins) {
        const existing = registeredSourceObservations.get(
          origin.registrationSiteKey
        );
        if (
          existing === undefined &&
          !conflictedRegistrationSites.has(origin.registrationSiteKey)
        ) {
          registeredSourceObservations.set(origin.registrationSiteKey, origin);
          continue;
        }
        if (
          existing !== undefined &&
          JSON.stringify(existing) !== JSON.stringify(origin)
        ) {
          registeredSourceObservations.delete(origin.registrationSiteKey);
          conflictedRegistrationSites.add(origin.registrationSiteKey);
          diagnostics.push({
            code: "OVERLAPPING_PROGRAM_CONFLICT",
            programId: context.descriptor.programId,
            projectId: origin.projectId,
            location: origin.location,
          });
        }
      }
    }
  }

  const registeredSourceCandidates = new Map<
    string,
    Map<string, RegisteredSourceOrigin>
  >();
  for (const origin of registeredSourceObservations.values()) {
    if (
      conflictedRegistrationSites.has(origin.registrationSiteKey) ||
      origin.dependencyPaths.some(
        (path) =>
          invalidProjectConfigPaths.has(path) ||
          invalidatedSourcePaths.has(path)
      )
    ) {
      continue;
    }
    const groupKey = `${origin.projectId}\0${origin.sourceId}`;
    const candidates =
      registeredSourceCandidates.get(groupKey) ??
      new Map<string, RegisteredSourceOrigin>();
    candidates.set(origin.registrationSiteKey, origin);
    registeredSourceCandidates.set(groupKey, candidates);
  }

  const registeredSourcesByDescriptorSite = new Map<
    string,
    RegisteredSourceOrigin[]
  >();
  for (const candidates of registeredSourceCandidates.values()) {
    const origins = [...candidates.values()].sort((left, right) =>
      compareText(left.registrationSiteKey, right.registrationSiteKey)
    );
    if (origins.length !== 1) {
      const first = origins[0];
      if (first !== undefined) {
        diagnostics.push({
          code: "SOURCE_DESCRIPTOR_CONFLICT",
          projectId: first.projectId,
          location: first.location,
        });
      }
      continue;
    }
    const origin = origins[0]!;
    const registered =
      registeredSourcesByDescriptorSite.get(origin.descriptorSiteKey) ?? [];
    registered.push(origin);
    registeredSourcesByDescriptorSite.set(origin.descriptorSiteKey, registered);
  }

  const descriptorListSignatures = new Map<string, string>();
  const invalidDescriptorSites = new Set<string>();
  const conflictedMemberships = new Set<string>();

  for (const context of contexts) {
    if (context.definitionHelpers.keys.size === 0) {
      diagnostics.push({
        code: "DEFINITION_HELPER_NOT_FOUND",
        programId: context.descriptor.programId,
      });
      continue;
    }
    for (const sourceFile of context.descriptor.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;
      const source = sourceIdentity(workspaceRoot, sourceFile.fileName);
      if (source === undefined) continue;
      const ownership = ownerOf(projects, source.absolutePath);
      if (ownership.status !== "exact") {
        diagnostics.push({
          code:
            ownership.status === "ambiguous"
              ? "SOURCE_PROJECT_AMBIGUOUS"
              : "SOURCE_PROJECT_UNRESOLVED",
          programId: context.descriptor.programId,
          location: pathLocation(source, sourceFile, sourceFile),
        });
        continue;
      }
      walk(sourceFile, (node) => {
        if (!ts.isCallExpression(node)) return;
        if (
          isCanonicalHelperCall(context.checker, context.sourceHelpers, node)
        ) {
          const descriptorSiteKey = definitionSiteKey(workspaceRoot, node);
          const origins =
            descriptorSiteKey === undefined
              ? undefined
              : registeredSourcesByDescriptorSite.get(descriptorSiteKey);
          const descriptor = staticSourceDescriptor(node);
          if (
            origins !== undefined &&
            descriptor !== undefined &&
            sourceState(context.descriptor.programId, source, sourceFile) !==
              undefined
          ) {
            const resolvedDefinitions: {
              readonly aliasPaths: readonly string[];
              readonly definitionSource: SourceIdentity;
              readonly siteKey: string;
            }[] = [];
            let unsupportedSourceList = false;
            for (const element of descriptor.list.body.elements) {
              const definitionResolution = helperDefinitionCallFromListElement(
                context.checker,
                context.definitionHelpers,
                element
              );
              const siteKey =
                definitionResolution === undefined
                  ? undefined
                  : definitionSiteKey(workspaceRoot, definitionResolution.call);
              if (siteKey === undefined || definitionResolution === undefined) {
                unsupportedSourceList = true;
                break;
              }
              const definitionSourceFile =
                definitionResolution.call.getSourceFile();
              const definitionAliasPaths = verifyAliasDeclarations(
                context,
                [
                  ...definitionResolution.aliasDeclarations,
                  ...definitionResolution.helperDeclarations,
                ],
                definitionResolution.helperDeclarations
              );
              const definitionSource = sourceIdentity(
                workspaceRoot,
                definitionSourceFile.fileName
              );
              if (
                definitionSource === undefined ||
                definitionAliasPaths === undefined ||
                sourceState(
                  context.descriptor.programId,
                  definitionSource,
                  definitionSourceFile
                ) === undefined
              ) {
                unsupportedSourceList = true;
                break;
              }
              resolvedDefinitions.push({
                aliasPaths: definitionAliasPaths,
                definitionSource,
                siteKey,
              });
            }
            if (unsupportedSourceList) {
              invalidDescriptorSites.add(descriptorSiteKey!);
              for (const origin of origins) {
                diagnostics.push({
                  code: "SOURCE_DESCRIPTOR_UNSUPPORTED",
                  programId: context.descriptor.programId,
                  projectId: origin.projectId,
                  location: pathLocation(source, sourceFile, node),
                });
              }
              return;
            }
            const descriptorListSignature = JSON.stringify(
              resolvedDefinitions.map(
                ({ aliasPaths, definitionSource, siteKey }) => ({
                  aliasPaths,
                  definitionSourcePath: definitionSource.path,
                  siteKey,
                })
              )
            );
            const existingDescriptorListSignature =
              descriptorListSignatures.get(descriptorSiteKey!);
            if (
              existingDescriptorListSignature !== undefined &&
              existingDescriptorListSignature !== descriptorListSignature
            ) {
              invalidDescriptorSites.add(descriptorSiteKey!);
              for (const origin of origins) {
                diagnostics.push({
                  code: "OVERLAPPING_PROGRAM_CONFLICT",
                  programId: context.descriptor.programId,
                  projectId: origin.projectId,
                  location: pathLocation(source, sourceFile, node),
                });
              }
              return;
            }
            descriptorListSignatures.set(
              descriptorSiteKey!,
              descriptorListSignature
            );
            if (invalidDescriptorSites.has(descriptorSiteKey!)) return;
            for (const resolvedDefinition of resolvedDefinitions) {
              for (const origin of origins) {
                if (origin.sourceId !== descriptor.sourceId) continue;
                const membership: DefinitionSourceMembership = {
                  dependencyPaths: [
                    ...origin.dependencyPaths,
                    resolvedDefinition.definitionSource.path,
                    ...resolvedDefinition.aliasPaths,
                  ]
                    .filter(
                      (path, index, paths) => paths.indexOf(path) === index
                    )
                    .sort(compareText),
                  descriptorSiteKey: descriptorSiteKey!,
                  definitionSiteKey: resolvedDefinition.siteKey,
                  projectId: origin.projectId,
                  sourceId: origin.sourceId,
                };
                const membershipKey = `${membership.projectId}\0${membership.sourceId}\0${membership.definitionSiteKey}`;
                const existingMembership =
                  definitionSourceMemberships.get(membershipKey);
                if (
                  existingMembership === undefined &&
                  !conflictedMemberships.has(membershipKey)
                ) {
                  definitionSourceMemberships.set(membershipKey, membership);
                } else if (
                  existingMembership !== undefined &&
                  JSON.stringify(existingMembership) !==
                    JSON.stringify(membership)
                ) {
                  definitionSourceMemberships.delete(membershipKey);
                  conflictedMemberships.add(membershipKey);
                  invalidDescriptorSites.add(descriptorSiteKey!);
                  diagnostics.push({
                    code: "OVERLAPPING_PROGRAM_CONFLICT",
                    programId: context.descriptor.programId,
                    projectId: origin.projectId,
                    location: pathLocation(source, sourceFile, node),
                  });
                }
              }
            }
          }
        }
        const definitionHelperResolution = canonicalHelperCallTrace(
          context.checker,
          context.definitionHelpers,
          node
        );
        if (definitionHelperResolution === undefined) return;
        const siteKey = `${source.path}:${node.getStart(sourceFile)}:${
          node.end
        }`;
        const definitionHelperAliasPaths = verifyAliasDeclarations(
          context,
          [
            ...definitionHelperResolution.aliasDeclarations,
            ...definitionHelperResolution.canonicalDeclarations,
          ],
          definitionHelperResolution.canonicalDeclarations
        );
        if (definitionHelperAliasPaths === undefined) {
          invalidDefinitionSites.add(siteKey);
          return;
        }
        if (
          sourceState(context.descriptor.programId, source, sourceFile) ===
          undefined
        ) {
          invalidDefinitionSites.add(siteKey);
          return;
        }
        const location = pathLocation(source, sourceFile, node);
        const definitionArgument = node.arguments[0];
        if (
          node.arguments.length !== 1 ||
          definitionArgument === undefined ||
          !ts.isObjectLiteralExpression(definitionArgument)
        ) {
          diagnostics.push({
            code: "FORM_DEFINITION_UNSUPPORTED",
            programId: context.descriptor.programId,
            projectId: ownership.projectId,
            location,
          });
          invalidDefinitionSites.add(siteKey);
          return;
        }
        for (const property of definitionArgument.properties) {
          if (
            !ts.isPropertyAssignment(property) ||
            !ts.isIdentifier(property.name) ||
            property.name.text !== "create"
          ) {
            continue;
          }
          const inlineCreate = unwrapTransparentExpression(
            property.initializer
          );
          if (
            !ts.isArrowFunction(inlineCreate) &&
            !ts.isFunctionExpression(inlineCreate)
          ) {
            continue;
          }
          for (const key of collectInvocationKeys(
            workspaceRoot,
            inlineCreate
          )) {
            creationInvocationKeys.add(key);
          }
        }
        const properties = exactObjectProperties(definitionArgument);
        const idNode = properties?.get("id");
        const createNode = properties?.get("create");
        const formId =
          idNode !== undefined && ts.isStringLiteral(idNode)
            ? idNode.text
            : undefined;
        const diagnosticBase = {
          programId: context.descriptor.programId,
          projectId: ownership.projectId,
          ...(formId === undefined ? {} : { formId }),
          location,
        };
        if (
          properties === undefined ||
          formId === undefined ||
          !FORM_ID_PATTERN.test(formId) ||
          createNode === undefined
        ) {
          diagnostics.push({
            code: "FORM_DEFINITION_UNSUPPORTED",
            ...diagnosticBase,
          });
          invalidDefinitionSites.add(siteKey);
          return;
        }
        registrationsBySite.set(siteKey, {
          definitionSiteKey: siteKey,
          formId,
        });

        const lineageNode = properties.get("lineage");
        let anchorNode: ts.Expression | undefined;
        if (lineageNode !== undefined) {
          if (!ts.isObjectLiteralExpression(lineageNode)) {
            diagnostics.push({ code: "FORM_ROOT_UNSTABLE", ...diagnosticBase });
            invalidDefinitionSites.add(siteKey);
            return;
          }
          const lineageProperties = exactObjectProperties(lineageNode);
          if (lineageProperties?.size !== 1) {
            diagnostics.push({ code: "FORM_ROOT_UNSTABLE", ...diagnosticBase });
            invalidDefinitionSites.add(siteKey);
            return;
          }
          anchorNode = lineageProperties.get("rootSymbol");
        } else {
          anchorNode = createNode;
        }
        if (anchorNode === undefined) {
          diagnostics.push({ code: "FORM_ROOT_MISSING", ...diagnosticBase });
          invalidDefinitionSites.add(siteKey);
          return;
        }
        const anchorReference = directReferenceNode(anchorNode);
        if (anchorReference === undefined) {
          diagnostics.push({
            code:
              lineageNode === undefined
                ? "FORM_ROOT_MISSING"
                : "FORM_ROOT_UNSTABLE",
            ...diagnosticBase,
          });
          invalidDefinitionSites.add(siteKey);
          return;
        }
        const anchorResolution = resolveAliasSymbolTrace(
          context.checker,
          context.checker.getSymbolAtLocation(calleeSymbolNode(anchorReference))
        );
        const anchor = anchorResolution.symbol;
        const anchorAliasPaths = verifyAliasDeclarations(
          context,
          anchorResolution.aliasDeclarations
        );
        const declaration =
          anchor === undefined ? undefined : declarationOf(anchor);
        if (
          anchor === undefined ||
          declaration === undefined ||
          anchorAliasPaths === undefined
        ) {
          diagnostics.push({ code: "FORM_ROOT_UNSTABLE", ...diagnosticBase });
          invalidDefinitionSites.add(siteKey);
          return;
        }
        const anchorKey = symbolKey(workspaceRoot, anchor);
        if (anchorKey === undefined) {
          diagnostics.push({
            code: "FORM_ROOT_OUTSIDE_WORKSPACE",
            ...diagnosticBase,
          });
          invalidDefinitionSites.add(siteKey);
          return;
        }
        const rootSourceFile = declaration.getSourceFile();
        const rootSource = sourceIdentity(
          workspaceRoot,
          rootSourceFile.fileName
        );
        if (
          rootSource === undefined ||
          sourceState(
            context.descriptor.programId,
            rootSource,
            rootSourceFile
          ) === undefined
        ) {
          if (rootSource === undefined) {
            diagnostics.push({
              code: "FORM_ROOT_OUTSIDE_WORKSPACE",
              ...diagnosticBase,
            });
          }
          invalidDefinitionSites.add(siteKey);
          return;
        }
        const declarationStatus = rootDeclarationStatus(declaration);
        if (declarationStatus !== "supported") {
          diagnostics.push({
            code:
              declarationStatus === "unexported"
                ? "FORM_ROOT_UNEXPORTED"
                : "FORM_ROOT_UNSTABLE",
            ...diagnosticBase,
          });
          invalidDefinitionSites.add(siteKey);
          return;
        }
        if (
          !isCompatibleRoot(
            context.checker,
            anchorNode,
            declaration,
            lineageNode === undefined
          )
        ) {
          diagnostics.push({
            code: "FORM_ROOT_INCOMPATIBLE",
            ...diagnosticBase,
          });
          invalidDefinitionSites.add(siteKey);
          return;
        }

        const unwrappedCreateNode = unwrapTransparentExpression(createNode);
        if (
          !ts.isArrowFunction(unwrappedCreateNode) &&
          !ts.isFunctionExpression(unwrappedCreateNode) &&
          lineageNode !== undefined
        ) {
          const createReference = directReferenceNode(unwrappedCreateNode);
          const createSymbol =
            createReference === undefined
              ? undefined
              : canonicalSymbolAt(
                  context.checker,
                  calleeSymbolNode(createReference)
                );
          const createDeclaration =
            createSymbol === undefined
              ? undefined
              : declarationOf(createSymbol);
          if (createDeclaration !== undefined) {
            for (const key of collectInvocationKeys(
              workspaceRoot,
              createDeclaration
            )) {
              creationInvocationKeys.add(key);
            }
          }
        }

        const definition: RawDefinition = {
          anchorKey,
          dependencyPaths: [
            source.path,
            rootSource.path,
            ...anchorAliasPaths,
            ...definitionHelperAliasPaths,
          ]
            .filter((path, index, paths) => paths.indexOf(path) === index)
            .sort(compareText),
          definitionSiteKey: siteKey,
          formId,
          rootAnchorId: `root.${digest(anchorKey)}`,
          symbolId: publicSymbolId(anchor, anchorKey),
          symbolKind: rootSymbolKind(declaration),
        };
        const existingDefinition = definitionsBySite.get(siteKey);
        if (
          existingDefinition === undefined &&
          !conflictedDefinitionSites.has(siteKey) &&
          !invalidDefinitionSites.has(siteKey)
        ) {
          definitionsBySite.set(siteKey, definition);
        } else if (
          existingDefinition !== undefined &&
          JSON.stringify(existingDefinition) !== JSON.stringify(definition)
        ) {
          definitionsBySite.delete(siteKey);
          conflictedDefinitionSites.add(siteKey);
          invalidDefinitionSites.add(siteKey);
          diagnostics.push({
            code: "OVERLAPPING_PROGRAM_CONFLICT",
            ...diagnosticBase,
          });
        } else if (invalidDefinitionSites.has(siteKey)) {
          diagnostics.push({
            code: "OVERLAPPING_PROGRAM_CONFLICT",
            ...diagnosticBase,
          });
        }
      });
    }
  }

  const definitionsByForm = new Map<string, ProvenancedDefinition[]>();
  const registrationsByForm = new Map<string, DefinitionRegistrationState>();
  for (const [, membership] of [...definitionSourceMemberships.entries()].sort(
    ([left], [right]) => compareText(left, right)
  )) {
    if (
      conflictedMemberships.has(
        `${membership.projectId}\0${membership.sourceId}\0${membership.definitionSiteKey}`
      ) ||
      invalidDescriptorSites.has(membership.descriptorSiteKey)
    ) {
      continue;
    }
    const registration = registrationsBySite.get(membership.definitionSiteKey);
    if (registration === undefined) continue;
    const formKey = `${membership.projectId}\0${membership.sourceId}\0${registration.formId}`;
    const registrationState = registrationsByForm.get(formKey) ?? {
      formId: registration.formId,
      projectId: membership.projectId,
      siteKeys: new Set<string>(),
    };
    registrationState.siteKeys.add(registration.definitionSiteKey);
    registrationsByForm.set(formKey, registrationState);

    if (
      conflictedDefinitionSites.has(membership.definitionSiteKey) ||
      invalidDefinitionSites.has(membership.definitionSiteKey)
    ) {
      continue;
    }

    const definition = definitionsBySite.get(membership.definitionSiteKey);
    if (definition === undefined) continue;
    const dependencyPaths = [
      ...membership.dependencyPaths,
      ...definition.dependencyPaths,
    ]
      .filter((path, index, paths) => paths.indexOf(path) === index)
      .sort(compareText);
    if (dependencyPaths.some((path) => invalidatedSourcePaths.has(path))) {
      continue;
    }
    const descriptorEvidence = `descriptor.form-root.${digest(
      `${formKey}\0${definition.definitionSiteKey}`
    )}`;
    const symbolEvidence = `typescript.symbol.${digest(definition.anchorKey)}`;
    const definitions = definitionsByForm.get(formKey) ?? [];
    definitions.push({
      ...definition,
      dependencyPaths,
      evidenceRefs: [descriptorEvidence, symbolEvidence].sort(compareText),
      projectId: membership.projectId,
    });
    definitionsByForm.set(formKey, definitions);
  }
  for (const [, registration] of [...registrationsByForm.entries()].sort(
    ([left], [right]) => compareText(left, right)
  )) {
    if (registration.siteKeys.size > 1) {
      diagnostics.push({
        code: "FORM_DEFINITION_DUPLICATE",
        projectId: registration.projectId,
        formId: registration.formId,
      });
    }
  }
  for (const [formKey, indexedForm] of [...indexedForms.entries()].sort(
    ([left], [right]) => compareText(left, right)
  )) {
    if (!registrationsByForm.has(formKey)) {
      diagnostics.push({
        code: "FORM_DEFINITION_MISSING",
        projectId: indexedForm.projectId,
        formId: indexedForm.formId,
      });
    }
  }

  const anchors = new Map<string, AnchorCandidate[]>();
  for (const [formKey, definitions] of [...definitionsByForm.entries()].sort(
    ([left], [right]) => compareText(left, right)
  )) {
    const first = definitions[0]!;
    if ((registrationsByForm.get(formKey)?.siteKeys.size ?? 0) > 1) {
      continue;
    }
    const indexedForm = indexedForms.get(formKey);
    if (indexedForm === undefined) {
      diagnostics.push({
        code: "FORM_NOT_INDEXED",
        projectId: first.projectId,
        formId: first.formId,
      });
      continue;
    }
    const candidate: AnchorCandidate = {
      root: {
        projectId: indexedForm.projectId,
        rootAnchorId: first.rootAnchorId,
      },
      form: {
        projectId: indexedForm.projectId,
        formId: indexedForm.formId,
        contractHash: indexedForm.contractHash,
      },
      dependencyPaths: first.dependencyPaths,
      evidenceRefs: first.evidenceRefs,
      symbolId: first.symbolId,
      symbolKind: first.symbolKind,
    };
    const candidates = anchors.get(first.anchorKey) ?? [];
    candidates.push(candidate);
    anchors.set(first.anchorKey, candidates);
  }
  for (const candidates of anchors.values()) {
    candidates.sort((left, right) =>
      compareText(
        `${left.form.projectId}\0${left.form.formId}\0${left.form.contractHash}`,
        `${right.form.projectId}\0${right.form.formId}\0${right.form.contractHash}`
      )
    );
  }

  const usagesByObservation = new Map<string, SourceUsageObservation>();
  const conflictedObservations = new Set<string>();

  for (const context of contexts) {
    for (const sourceFile of context.descriptor.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;
      const source = sourceIdentity(workspaceRoot, sourceFile.fileName);
      if (source === undefined) continue;
      const ownership = ownerOf(projects, source.absolutePath);
      if (ownership.status !== "exact") continue;
      walk(sourceFile, (node) => {
        if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return;
        const invocationResolution = invocationSymbol(
          context.checker,
          node.expression
        );
        const resolvedInvocationSymbol = invocationResolution.symbol;
        const resolvedAnchorKey =
          resolvedInvocationSymbol === undefined
            ? undefined
            : symbolKey(workspaceRoot, resolvedInvocationSymbol);
        if (resolvedAnchorKey === undefined) return;
        const invocationDeclaration =
          resolvedInvocationSymbol === undefined
            ? undefined
            : declarationOf(resolvedInvocationSymbol);
        const invocationRootSourceFile = invocationDeclaration?.getSourceFile();
        const invocationRootSource =
          invocationRootSourceFile === undefined
            ? undefined
            : sourceIdentity(workspaceRoot, invocationRootSourceFile.fileName);
        if (
          invocationRootSourceFile === undefined ||
          invocationRootSource === undefined ||
          sourceState(
            context.descriptor.programId,
            invocationRootSource,
            invocationRootSourceFile
          ) === undefined
        ) {
          return;
        }
        const candidates = anchors
          .get(resolvedAnchorKey)
          ?.filter(
            ({ dependencyPaths }) =>
              !dependencyPaths.some((path) => invalidatedSourcePaths.has(path))
          );
        if (candidates === undefined || candidates.length === 0) return;
        const invocationAliasPaths = verifyAliasDeclarations(
          context,
          invocationResolution.aliasDeclarations
        );
        if (invocationAliasPaths === undefined) return;
        const key = invocationKey(workspaceRoot, node);
        if (key === undefined || creationInvocationKeys.has(key)) return;
        if (
          isJavaScriptFamilySource(sourceFile) ||
          context.hasSuppressionDirectives(sourceFile)
        ) {
          diagnostics.push({
            code: "SOURCE_USAGE_UNSUPPORTED",
            programId: context.descriptor.programId,
            projectId: ownership.projectId,
            location: pathLocation(source, sourceFile, node),
          });
          return;
        }
        const supportedReference = directReferenceNode(node.expression);
        if (
          (ts.isCallExpression(node) && node.questionDotToken !== undefined) ||
          supportedReference === undefined
        ) {
          diagnostics.push({
            code: "SOURCE_USAGE_UNSUPPORTED",
            programId: context.descriptor.programId,
            projectId: ownership.projectId,
            location: pathLocation(source, sourceFile, node),
          });
          return;
        }
        if (hasIntersectingTypeScriptError(context, sourceFile, node)) {
          diagnostics.push({
            code: "SOURCE_USAGE_UNSUPPORTED",
            programId: context.descriptor.programId,
            projectId: ownership.projectId,
            location: pathLocation(source, sourceFile, node),
          });
          return;
        }
        if (!isCompatibleInvocation(context.checker, node)) {
          diagnostics.push({
            code: "SOURCE_USAGE_UNSUPPORTED",
            programId: context.descriptor.programId,
            projectId: ownership.projectId,
            location: pathLocation(source, sourceFile, node),
          });
          return;
        }
        const state = sourceState(
          context.descriptor.programId,
          source,
          sourceFile
        );
        if (state === undefined) return;
        const location = pathLocation(state, sourceFile, node);
        const evidenceRef = `typescript.direct-call.${digest(key)}`;
        const publicCandidates = candidates.map(
          ({ root, form, evidenceRefs }): AgentContextFormRootCandidate => ({
            root,
            form,
            evidenceRefs,
          })
        );
        const first = candidates[0]!;
        const usage: AgentContextSourceUsage = {
          identity: {
            kind: "callsite",
            projectId: ownership.projectId,
            callsiteKey: `callsite.${digest(key)}`,
          },
          projectId: ownership.projectId,
          invocation: {
            location,
            symbol: { id: first.symbolId, kind: first.symbolKind },
            syntaxKind: ts.isNewExpression(node) ? "construct" : "call",
            syntaxToken: {
              kind: "ast-call-shape",
              version: 1,
              calleeForm: ts.isIdentifier(supportedReference)
                ? "identifier"
                : "property-access",
              argumentCount: node.arguments?.length ?? 0,
              typeArgumentCount: node.typeArguments?.length ?? 0,
              optionalCall: false,
            },
            sourceFileHash: state.hash,
          },
          resolution:
            publicCandidates.length === 1
              ? { status: "exact", candidate: publicCandidates[0]! }
              : { status: "ambiguous", candidates: publicCandidates },
          contexts: componentContext(
            workspaceRoot,
            context.checker,
            context.componentDecoratorKeys,
            node
          ),
          evidenceRefs: [evidenceRef],
        };
        const observation: SourceUsageObservation = {
          dependencyPaths: [
            state.path,
            invocationRootSource.path,
            ...invocationAliasPaths,
            ...candidates.flatMap(({ dependencyPaths }) => dependencyPaths),
          ]
            .filter((path, index, paths) => paths.indexOf(path) === index)
            .sort(compareText),
          usage,
        };
        const existing = usagesByObservation.get(key);
        if (existing === undefined && !conflictedObservations.has(key)) {
          usagesByObservation.set(key, observation);
          return;
        }
        if (
          existing !== undefined &&
          JSON.stringify(existing) !== JSON.stringify(observation)
        ) {
          usagesByObservation.delete(key);
          conflictedObservations.add(key);
          diagnostics.push({
            code: "OVERLAPPING_PROGRAM_CONFLICT",
            programId: context.descriptor.programId,
            projectId: ownership.projectId,
            location,
          });
        }
      });
    }
  }

  const includedPurposes = [
    ...new Set(programs.map(({ purpose }) => purpose)),
  ].sort(compareText);
  const catalog = createAgentContextSourceUsageCatalog({
    schemaVersion: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    workspaceIndex: input.workspaceIndex,
    coverage: {
      status: "incomplete",
      scope: {
        projectIds: projects.map(({ projectId }) => projectId),
        includedPurposes,
        excludedPurposes: [],
      },
      reasons: [SOURCE_USAGE_PILOT_COVERAGE_REASON],
      evidenceRefs: [],
    },
    usages: [...usagesByObservation.values()]
      .filter(
        ({ dependencyPaths }) =>
          !dependencyPaths.some((path) => invalidatedSourcePaths.has(path))
      )
      .map(({ usage }) => usage),
  });
  return { catalog, diagnostics: normalizeDiagnostics(diagnostics) };
}
