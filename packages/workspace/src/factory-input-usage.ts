import ts from "typescript";

import {
  analyzeFactoryInputTypes,
  type AnalyzeFactoryInputTypesInput,
  type FactoryInputDiagnostic,
  type FactoryInputPropertyTypeAnalysis,
  type NormalizedTypeDescriptor,
} from "./factory-input-analysis.js";

const SYNCHRONOUS_ARRAY_CALLBACK_METHODS = new Set([
  "every",
  "filter",
  "find",
  "findIndex",
  "flatMap",
  "forEach",
  "map",
  "reduce",
  "reduceRight",
  "some",
]);

const REVIEWED_PROPS_CALLBACKS = new Set([
  "change",
  "compareWith",
  "displayWith",
  "filter",
  "onChange",
  "onClick",
  "optionSelected",
  "trackBy",
]);

const ANGULAR_VIEW_SYMBOLS = new Set([
  "ComponentRef",
  "ElementRef",
  "EmbeddedViewRef",
  "TemplateRef",
  "ViewContainerRef",
]);

export type FactoryInputUseKind =
  | "ambiguous"
  | "construction-call"
  | "construction-read"
  | "direct-escape"
  | "inside-stored-function";

export type FactoryInputUseAmbiguityReason =
  | "computed-access"
  | "destructured-parameter"
  | "getter"
  | "mutable-parameter-alias"
  | "parameter-escape"
  | "parameter-alias"
  | "property-alias"
  | "unknown-callback-consumer"
  | "unsupported-storage";

export interface FactoryInputUse {
  readonly kind: FactoryInputUseKind;
  readonly reason?: FactoryInputUseAmbiguityReason;
  readonly reviewedStorage?: boolean;
  readonly storagePath?: string;
}

export type FactoryInputMaterialization =
  | "captured-callback"
  | "explicit-binding-required"
  | "explicit-value-required"
  | "inert-observable"
  | "unavailable-view"
  | "unsupported";

export type FactoryInputUsageDiagnosticCode =
  | "FACTORY_INPUT_CAPABILITY_UNSUPPORTED"
  | "FACTORY_INPUT_STORAGE_UNREVIEWED"
  | "FACTORY_INPUT_USE_AMBIGUOUS"
  | "FACTORY_INPUT_VALUE_REQUIRED";

export interface FactoryInputUsageDiagnostic {
  readonly code: FactoryInputUsageDiagnosticCode;
  readonly propertyKey?: string;
  readonly reason?: FactoryInputUseAmbiguityReason;
  readonly storagePath?: string;
}

export interface FactoryInputUsagePropertyAnalysis {
  readonly key: string;
  readonly optional: boolean;
  readonly readonly: boolean;
  readonly expectedType: NormalizedTypeDescriptor;
  readonly observables: FactoryInputPropertyTypeAnalysis["observables"];
  readonly uses: readonly FactoryInputUse[];
  readonly materialization: FactoryInputMaterialization;
}

export interface FactoryInputUsageAnalysis {
  readonly factorySymbolId: string;
  readonly coverage: "complete-supported-grammar" | "incomplete";
  readonly properties: readonly FactoryInputUsagePropertyAnalysis[];
  readonly diagnostics: readonly FactoryInputUsageDiagnostic[];
  readonly typeDiagnostics: readonly FactoryInputDiagnostic[];
}

export type AnalyzeFactoryInputUsagesInput = AnalyzeFactoryInputTypesInput;

interface FactoryBody {
  readonly body: ts.Block;
  readonly parameter: ts.ParameterDeclaration;
  readonly root: ts.SignatureDeclaration;
}

interface MutableUsageState {
  readonly diagnostics: FactoryInputUsageDiagnostic[];
  readonly uses: Map<string, FactoryInputUse[]>;
}

interface PropertyAccess {
  readonly key: string;
  readonly outermost: ts.PropertyAccessExpression;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function unwrapOutward(node: ts.Node): ts.Node {
  let current = node;
  while (
    current.parent !== undefined &&
    ((ts.isParenthesizedExpression(current.parent) &&
      current.parent.expression === current) ||
      (ts.isAsExpression(current.parent) &&
        current.parent.expression === current) ||
      (ts.isSatisfiesExpression(current.parent) &&
        current.parent.expression === current) ||
      (ts.isNonNullExpression(current.parent) &&
        current.parent.expression === current))
  ) {
    current = current.parent;
  }
  return current;
}

function canonicalSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol | undefined
): ts.Symbol | undefined {
  return symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

function sameSymbol(
  checker: ts.TypeChecker,
  node: ts.Node,
  expected: ts.Symbol
): boolean {
  return (
    canonicalSymbol(checker, checker.getSymbolAtLocation(node)) === expected
  );
}

function factoryBody(declaration: ts.Declaration): FactoryBody | undefined {
  if (
    ts.isFunctionDeclaration(declaration) &&
    declaration.body !== undefined &&
    declaration.parameters.length === 1
  ) {
    return {
      body: declaration.body,
      parameter: declaration.parameters[0]!,
      root: declaration,
    };
  }
  if (!ts.isClassDeclaration(declaration)) return undefined;
  const constructors = declaration.members.filter(ts.isConstructorDeclaration);
  const constructor = constructors.length === 1 ? constructors[0] : undefined;
  return constructor?.body !== undefined && constructor.parameters.length === 1
    ? {
        body: constructor.body,
        parameter: constructor.parameters[0]!,
        root: constructor,
      }
    : undefined;
}

function outermostPropertyAccess(
  node: ts.PropertyAccessExpression
): ts.PropertyAccessExpression {
  let current = node;
  while (
    ts.isPropertyAccessExpression(current.parent) &&
    current.parent.expression === current
  ) {
    current = current.parent;
  }
  return current;
}

function optionsPropertyAccess(
  checker: ts.TypeChecker,
  node: ts.PropertyAccessExpression,
  parameterSymbol: ts.Symbol
): PropertyAccess | undefined {
  const outermost = outermostPropertyAccess(node);
  let current: ts.Expression = outermost;
  const segments: string[] = [];
  while (ts.isPropertyAccessExpression(current)) {
    segments.unshift(current.name.text);
    current = unwrapExpression(current.expression);
  }
  return ts.isIdentifier(current) &&
    sameSymbol(checker, current, parameterSymbol) &&
    segments[0] !== undefined
    ? { key: segments[0], outermost }
    : undefined;
}

function rootedAtOptionsParameter(
  checker: ts.TypeChecker,
  expression: ts.Expression,
  parameterSymbol: ts.Symbol
): boolean {
  let current = unwrapExpression(expression);
  while (
    ts.isPropertyAccessExpression(current) ||
    ts.isElementAccessExpression(current)
  ) {
    current = unwrapExpression(current.expression);
  }
  return (
    ts.isIdentifier(current) && sameSymbol(checker, current, parameterSymbol)
  );
}

function staticPropertyName(name: ts.PropertyName): string | undefined {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNoSubstitutionTemplateLiteral(name)
  ) {
    return name.text;
  }
  return undefined;
}

function renderStoragePath(segments: readonly string[]): string {
  return segments
    .map((segment, index) =>
      /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(segment)
        ? `${index === 0 ? "" : "."}${segment}`
        : `[${JSON.stringify(segment)}]`
    )
    .join("");
}

function isAssignmentToThisProperty(node: ts.Node): boolean {
  if (
    !ts.isBinaryExpression(node) ||
    node.operatorToken.kind !== ts.SyntaxKind.EqualsToken
  ) {
    return false;
  }
  const left = unwrapExpression(node.left);
  return (
    ts.isPropertyAccessExpression(left) &&
    left.expression.kind === ts.SyntaxKind.ThisKeyword
  );
}

function storagePath(
  assignment: ts.PropertyAssignment,
  root: ts.SignatureDeclaration
): string | undefined {
  const segments: string[] = [];
  let current: ts.Node = assignment;
  while (current !== root) {
    if (ts.isPropertyAssignment(current)) {
      const name = staticPropertyName(current.name);
      if (name === undefined) return undefined;
      segments.unshift(name);
    }
    const parent = current.parent;
    if (parent === undefined) return undefined;
    if (ts.isReturnStatement(parent)) {
      return renderStoragePath(segments);
    }
    if (isAssignmentToThisProperty(parent)) {
      return renderStoragePath(segments);
    }
    if (
      ts.isPropertyAssignment(parent) ||
      ts.isObjectLiteralExpression(parent) ||
      ts.isArrayLiteralExpression(parent) ||
      ts.isParenthesizedExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isSatisfiesExpression(parent) ||
      ts.isNonNullExpression(parent)
    ) {
      current = parent;
      continue;
    }
    return undefined;
  }
  return undefined;
}

function reviewedCallbackStorage(path: string | undefined): boolean {
  if (path === undefined) return false;
  if (path === "hideExpression") return true;
  if (
    path.startsWith("expressions[") ||
    path.startsWith("expressionProperties[") ||
    path.startsWith("hooks.") ||
    path.startsWith("hooks[")
  ) {
    return true;
  }
  if (!path.startsWith("props.")) return false;
  return REVIEWED_PROPS_CALLBACKS.has(path.slice("props.".length));
}

function containingNestedFunction(
  node: ts.Node,
  root: ts.SignatureDeclaration
): ts.SignatureDeclaration | undefined {
  for (
    let current = node.parent;
    current !== undefined;
    current = current.parent
  ) {
    if (current === root) return undefined;
    if (ts.isFunctionLike(current)) return current;
  }
  return undefined;
}

function synchronousArrayCallback(
  checker: ts.TypeChecker,
  parent: ts.CallExpression,
  boundary: ts.Node
): boolean {
  if (
    !parent.arguments.includes(boundary as ts.Expression) ||
    !ts.isPropertyAccessExpression(parent.expression) ||
    !SYNCHRONOUS_ARRAY_CALLBACK_METHODS.has(parent.expression.name.text)
  ) {
    return false;
  }
  const receiverType = checker.getTypeAtLocation(parent.expression.expression);
  return checker.isArrayType(receiverType) || checker.isTupleType(receiverType);
}

function classifyNestedUse(
  checker: ts.TypeChecker,
  functionNode: ts.SignatureDeclaration,
  root: ts.SignatureDeclaration
): FactoryInputUse {
  if (ts.isGetAccessorDeclaration(functionNode)) {
    return { kind: "ambiguous", reason: "getter" };
  }
  const boundary = unwrapOutward(functionNode);
  const parent = boundary.parent;
  if (ts.isCallExpression(parent) && parent.expression === boundary) {
    return { kind: "construction-call" };
  }
  if (
    ts.isCallExpression(parent) &&
    parent.arguments.includes(boundary as ts.Expression)
  ) {
    return synchronousArrayCallback(checker, parent, boundary)
      ? { kind: "construction-call" }
      : { kind: "ambiguous", reason: "unknown-callback-consumer" };
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === boundary) {
    const path = storagePath(parent, root);
    return path === undefined
      ? { kind: "ambiguous", reason: "unsupported-storage" }
      : {
          kind: "inside-stored-function",
          reviewedStorage: reviewedCallbackStorage(path),
          storagePath: path,
        };
  }
  return { kind: "ambiguous", reason: "unsupported-storage" };
}

function classifyImmediateUse(
  node: ts.PropertyAccessExpression,
  root: ts.SignatureDeclaration
): FactoryInputUse {
  const parent = node.parent;
  if (ts.isCallExpression(parent) && parent.expression === node) {
    return { kind: "construction-call" };
  }
  if (
    ts.isVariableDeclaration(parent) &&
    parent.initializer !== undefined &&
    unwrapExpression(parent.initializer) === node
  ) {
    return { kind: "ambiguous", reason: "property-alias" };
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    const path = storagePath(parent, root);
    return path === undefined
      ? { kind: "ambiguous", reason: "unsupported-storage" }
      : {
          kind: "direct-escape",
          reviewedStorage: reviewedCallbackStorage(path),
          storagePath: path,
        };
  }
  return { kind: "construction-read" };
}

function useKey(use: FactoryInputUse): string {
  return [
    use.kind,
    use.reason ?? "",
    use.storagePath ?? "",
    String(use.reviewedStorage ?? ""),
  ].join(":");
}

function addUse(
  state: MutableUsageState,
  propertyKey: string,
  use: FactoryInputUse
): void {
  const uses = state.uses.get(propertyKey) ?? [];
  if (!uses.some((candidate) => useKey(candidate) === useKey(use))) {
    uses.push(use);
    uses.sort((left, right) => compareText(useKey(left), useKey(right)));
    state.uses.set(propertyKey, uses);
  }
}

function addDiagnostic(
  state: MutableUsageState,
  diagnostic: FactoryInputUsageDiagnostic
): void {
  state.diagnostics.push(diagnostic);
}

function analyzeBodyUses(
  checker: ts.TypeChecker,
  body: FactoryBody,
  parameterSymbol: ts.Symbol
): MutableUsageState {
  const state: MutableUsageState = { diagnostics: [], uses: new Map() };
  const visit = (node: ts.Node): void => {
    if (
      ts.isIdentifier(node) &&
      node !== body.parameter.name &&
      sameSymbol(checker, node, parameterSymbol)
    ) {
      const boundary = unwrapOutward(node);
      const parent = boundary.parent;
      const attributedPropertyBase =
        (ts.isPropertyAccessExpression(parent) &&
          parent.expression === boundary) ||
        (ts.isElementAccessExpression(parent) &&
          parent.expression === boundary);
      const attributedAlias =
        ts.isVariableDeclaration(parent) &&
        parent.initializer !== undefined &&
        unwrapExpression(parent.initializer) === node;
      if (!attributedPropertyBase && !attributedAlias) {
        addDiagnostic(state, {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          reason: "parameter-escape",
        });
      }
    }
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer !== undefined &&
      ts.isIdentifier(unwrapExpression(node.initializer)) &&
      sameSymbol(checker, unwrapExpression(node.initializer), parameterSymbol)
    ) {
      const destructured =
        ts.isObjectBindingPattern(node.name) ||
        ts.isArrayBindingPattern(node.name);
      addDiagnostic(state, {
        code: "FACTORY_INPUT_USE_AMBIGUOUS",
        reason: destructured ? "destructured-parameter" : "parameter-alias",
      });
      if (
        ts.isVariableDeclarationList(node.parent) &&
        (node.parent.flags & ts.NodeFlags.Let) !== 0
      ) {
        addDiagnostic(state, {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          reason: "mutable-parameter-alias",
        });
      }
    }
    if (
      ts.isElementAccessExpression(node) &&
      rootedAtOptionsParameter(checker, node, parameterSymbol)
    ) {
      addDiagnostic(state, {
        code: "FACTORY_INPUT_USE_AMBIGUOUS",
        reason: "computed-access",
      });
    }
    if (ts.isPropertyAccessExpression(node)) {
      if (
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.expression === node
      ) {
        ts.forEachChild(node, visit);
        return;
      }
      const access = optionsPropertyAccess(checker, node, parameterSymbol);
      if (access?.outermost === node) {
        const nested = containingNestedFunction(node, body.root);
        const use =
          nested === undefined
            ? classifyImmediateUse(node, body.root)
            : classifyNestedUse(checker, nested, body.root);
        addUse(state, access.key, use);
        if (use.kind === "ambiguous") {
          addDiagnostic(state, {
            code: "FACTORY_INPUT_USE_AMBIGUOUS",
            propertyKey: access.key,
            ...(use.reason === undefined ? {} : { reason: use.reason }),
          });
        }
        if (
          use.kind === "inside-stored-function" &&
          use.reviewedStorage === false
        ) {
          addDiagnostic(state, {
            code: "FACTORY_INPUT_STORAGE_UNREVIEWED",
            propertyKey: access.key,
            ...(use.storagePath === undefined
              ? {}
              : { storagePath: use.storagePath }),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body.body);
  return state;
}

function simpleValueType(type: NormalizedTypeDescriptor): boolean {
  if (
    type.kind === "array" ||
    type.kind === "boolean" ||
    type.kind === "bigint" ||
    type.kind === "literal" ||
    type.kind === "null" ||
    type.kind === "number" ||
    type.kind === "string" ||
    type.kind === "symbol" ||
    type.kind === "tuple" ||
    type.kind === "undefined" ||
    type.kind === "void"
  ) {
    return true;
  }
  return (
    (type.kind === "union" || type.kind === "intersection") &&
    (type.members?.length ?? 0) > 0 &&
    type.members!.every(simpleValueType)
  );
}

function angularViewType(type: NormalizedTypeDescriptor): boolean {
  return (
    type.identity?.scope === "external" &&
    type.identity.packageName === "@angular/core" &&
    ANGULAR_VIEW_SYMBOLS.has(type.identity.symbol)
  );
}

function propertyMaterialization(
  property: FactoryInputPropertyTypeAnalysis,
  uses: readonly FactoryInputUse[],
  unattributedAmbiguity: boolean
): FactoryInputMaterialization {
  const recognizedAngularView = angularViewType(property.expectedType);
  if (property.expectedType.hazards.length > 0 && !recognizedAngularView) {
    return "unsupported";
  }
  if (unattributedAmbiguity) {
    return simpleValueType(property.expectedType)
      ? "explicit-value-required"
      : "explicit-binding-required";
  }
  const onlyDirectEscapes = uses.every(({ kind }) => kind === "direct-escape");
  if (uses.length > 0 && onlyDirectEscapes && recognizedAngularView) {
    return "unavailable-view";
  }
  if (uses.some(({ kind }) => kind === "ambiguous")) {
    return "explicit-binding-required";
  }
  const constructionUses = uses.filter(
    ({ kind }) => kind === "construction-call" || kind === "construction-read"
  );
  if (constructionUses.length > 0) {
    return simpleValueType(property.expectedType)
      ? "explicit-value-required"
      : "explicit-binding-required";
  }
  if (uses.length === 0) {
    return simpleValueType(property.expectedType)
      ? "explicit-value-required"
      : "explicit-binding-required";
  }
  if (
    onlyDirectEscapes &&
    property.observables.some(({ location }) => location.kind === "property")
  ) {
    return "inert-observable";
  }
  const onlyReviewedDeferredUses = uses.every(
    (use) =>
      (use.kind === "inside-stored-function" || use.kind === "direct-escape") &&
      use.reviewedStorage === true
  );
  if (
    onlyReviewedDeferredUses &&
    (property.expectedType.callSignatures?.length ?? 0) > 0
  ) {
    return "captured-callback";
  }
  return simpleValueType(property.expectedType)
    ? "explicit-value-required"
    : "explicit-binding-required";
}

function diagnosticKey(diagnostic: FactoryInputUsageDiagnostic): string {
  return [
    diagnostic.code,
    diagnostic.propertyKey ?? "",
    diagnostic.reason ?? "",
    diagnostic.storagePath ?? "",
  ].join(":");
}

function canonicalDiagnostics(
  diagnostics: readonly FactoryInputUsageDiagnostic[]
): readonly FactoryInputUsageDiagnostic[] {
  const unique = new Map<string, FactoryInputUsageDiagnostic>();
  for (const diagnostic of diagnostics) {
    unique.set(diagnosticKey(diagnostic), diagnostic);
  }
  return [...unique.values()].sort((left, right) =>
    compareText(diagnosticKey(left), diagnosticKey(right))
  );
}

function emptyUsageAnalysis(
  factorySymbolId: string,
  typeDiagnostics: readonly FactoryInputDiagnostic[],
  diagnostics: readonly FactoryInputUsageDiagnostic[]
): FactoryInputUsageAnalysis {
  return {
    factorySymbolId,
    coverage: "incomplete",
    properties: [],
    diagnostics,
    typeDiagnostics,
  };
}

export function analyzeFactoryInputUsages(
  input: AnalyzeFactoryInputUsagesInput
): FactoryInputUsageAnalysis {
  const typeAnalysis = analyzeFactoryInputTypes(input);
  const body = factoryBody(input.factoryDeclaration);
  if (body === undefined) {
    return emptyUsageAnalysis(
      typeAnalysis.factorySymbolId,
      typeAnalysis.diagnostics,
      [
        {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          reason: "unsupported-storage",
        },
      ]
    );
  }
  if (!ts.isIdentifier(body.parameter.name)) {
    return emptyUsageAnalysis(
      typeAnalysis.factorySymbolId,
      typeAnalysis.diagnostics,
      [
        {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          reason: "destructured-parameter",
        },
      ]
    );
  }
  const sourceFile = input.factoryDeclaration.getSourceFile();
  if (
    input.descriptor.program.getSourceFile(sourceFile.fileName) !==
      sourceFile ||
    typeAnalysis.properties.length === 0
  ) {
    return emptyUsageAnalysis(
      typeAnalysis.factorySymbolId,
      typeAnalysis.diagnostics,
      []
    );
  }
  const checker = input.descriptor.program.getTypeChecker();
  const parameterSymbol = canonicalSymbol(
    checker,
    checker.getSymbolAtLocation(body.parameter.name)
  );
  if (parameterSymbol === undefined) {
    return emptyUsageAnalysis(
      typeAnalysis.factorySymbolId,
      typeAnalysis.diagnostics,
      [
        {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          reason: "unsupported-storage",
        },
      ]
    );
  }
  const state = analyzeBodyUses(checker, body, parameterSymbol);
  const unattributedAmbiguity = state.diagnostics.some(
    ({ code, propertyKey }) =>
      code === "FACTORY_INPUT_USE_AMBIGUOUS" && propertyKey === undefined
  );
  const properties = typeAnalysis.properties.map((property) => {
    const uses = state.uses.get(property.key) ?? [];
    return {
      ...property,
      uses,
      materialization: propertyMaterialization(
        property,
        uses,
        unattributedAmbiguity
      ),
    };
  });
  for (const property of properties) {
    if (
      (property.expectedType.callSignatures?.length ?? 0) > 0 &&
      property.uses.some(
        ({ kind, reviewedStorage }) =>
          kind === "direct-escape" && reviewedStorage === false
      )
    ) {
      for (const use of property.uses) {
        if (use.kind !== "direct-escape" || use.reviewedStorage !== false) {
          continue;
        }
        addDiagnostic(state, {
          code: "FACTORY_INPUT_STORAGE_UNREVIEWED",
          propertyKey: property.key,
          ...(use.storagePath === undefined
            ? {}
            : { storagePath: use.storagePath }),
        });
      }
    }
  }
  for (const property of properties) {
    if (property.materialization === "explicit-value-required") {
      addDiagnostic(state, {
        code: "FACTORY_INPUT_VALUE_REQUIRED",
        propertyKey: property.key,
      });
    } else if (property.materialization === "explicit-binding-required") {
      addDiagnostic(state, {
        code: "FACTORY_INPUT_CAPABILITY_UNSUPPORTED",
        propertyKey: property.key,
      });
    }
  }
  const diagnostics = canonicalDiagnostics(state.diagnostics);
  const incompleteFlow = diagnostics.some(
    ({ code }) =>
      code === "FACTORY_INPUT_USE_AMBIGUOUS" ||
      code === "FACTORY_INPUT_STORAGE_UNREVIEWED"
  );
  return {
    factorySymbolId: typeAnalysis.factorySymbolId,
    coverage:
      typeAnalysis.coverage === "complete-supported-grammar" && !incompleteFlow
        ? "complete-supported-grammar"
        : "incomplete",
    properties,
    diagnostics,
    typeDiagnostics: typeAnalysis.diagnostics,
  };
}
