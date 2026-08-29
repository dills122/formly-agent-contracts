import { isAbsolute, relative, resolve } from "node:path";

import ts from "typescript";

import type { WorkspaceSourceUsageProgramDescriptor } from "./source-usage.js";

const TYPE_FORMAT_FLAGS =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

const LIMITS = {
  depth: 8,
  displayCharacters: 240,
  literalCharacters: 120,
  nodes: 256,
  parameters: 16,
  properties: 64,
  signatures: 8,
  tupleElements: 32,
  unionMembers: 32,
} as const;

export type NormalizedTypeHazard =
  | "any"
  | "analysis-truncated"
  | "recursive"
  | "unknown"
  | "unresolved-generic"
  | "unsupported";

export type NormalizedTypeKind =
  | "any"
  | "array"
  | "bigint"
  | "boolean"
  | "callable"
  | "intersection"
  | "literal"
  | "never"
  | "null"
  | "number"
  | "object"
  | "recursive"
  | "string"
  | "symbol"
  | "tuple"
  | "type-parameter"
  | "undefined"
  | "union"
  | "unknown"
  | "unsupported"
  | "void";

export interface NormalizedTypeIdentity {
  readonly scope: "external" | "workspace";
  readonly symbol: string;
  readonly packageName?: string;
  readonly path?: string;
}

export interface NormalizedCallParameter {
  readonly name: string;
  readonly optional: boolean;
  readonly rest: boolean;
  readonly type: NormalizedTypeDescriptor;
}

export interface NormalizedCallSignature {
  readonly parameters: readonly NormalizedCallParameter[];
  readonly returnType: NormalizedTypeDescriptor;
}

export interface NormalizedTypeProperty {
  readonly key: string;
  readonly optional: boolean;
  readonly readonly: boolean;
  readonly type: NormalizedTypeDescriptor;
}

export interface NormalizedTypeDescriptor {
  readonly kind: NormalizedTypeKind;
  readonly display: string;
  readonly nullable: boolean;
  readonly hazards: readonly NormalizedTypeHazard[];
  readonly identity?: NormalizedTypeIdentity;
  readonly literal?: string | number | boolean;
  readonly members?: readonly NormalizedTypeDescriptor[];
  readonly elementType?: NormalizedTypeDescriptor;
  readonly elements?: readonly NormalizedTypeDescriptor[];
  readonly properties?: readonly NormalizedTypeProperty[];
  readonly typeArguments?: readonly NormalizedTypeDescriptor[];
  readonly callSignatures?: readonly NormalizedCallSignature[];
  readonly constructSignatures?: readonly NormalizedCallSignature[];
  readonly constraint?: NormalizedTypeDescriptor;
}

export type FactoryInputDiagnosticCode =
  | "FACTORY_OBSERVABLE_TYPE_UNRESOLVED"
  | "FACTORY_INPUT_GENERIC_UNRESOLVED"
  | "FACTORY_INPUT_PROGRAM_MISMATCH"
  | "FACTORY_INPUT_SIGNATURE_UNSUPPORTED"
  | "FACTORY_INPUT_TYPE_ANY"
  | "FACTORY_INPUT_TYPE_RECURSIVE"
  | "FACTORY_INPUT_TYPE_UNKNOWN"
  | "FACTORY_INPUT_TYPE_UNSUPPORTED"
  | "FACTORY_TYPESCRIPT_DIAGNOSTIC"
  | "FACTORY_TYPESCRIPT_SUPPRESSION"
  | "FACTORY_TYPE_ANALYSIS_TRUNCATED";

export interface FactoryInputDiagnostic {
  readonly code: FactoryInputDiagnosticCode;
  readonly path?: string;
  readonly propertyKey?: string;
}

export interface ObservableTypeAnalysis {
  readonly location:
    | { readonly kind: "property" }
    | { readonly kind: "call-return"; readonly signatureIndex: number };
  readonly emissionType: NormalizedTypeDescriptor;
  readonly precision:
    | "analysis-truncated"
    | "contains-any"
    | "contains-unknown"
    | "exact-type";
  readonly values: { readonly kind: "type-only" };
}

export interface FactoryInputPropertyTypeAnalysis {
  readonly key: string;
  readonly optional: boolean;
  readonly readonly: boolean;
  readonly expectedType: NormalizedTypeDescriptor;
  readonly observables: readonly ObservableTypeAnalysis[];
}

export interface FactoryInputTypeAnalysis {
  readonly factorySymbolId: string;
  readonly signatureKind: "call" | "construct" | "unsupported";
  readonly expectedType: NormalizedTypeDescriptor;
  readonly properties: readonly FactoryInputPropertyTypeAnalysis[];
  readonly coverage: "complete-supported-grammar" | "incomplete";
  readonly diagnostics: readonly FactoryInputDiagnostic[];
  readonly compatibility: {
    readonly typescript: string;
    readonly rxjs: "canonical-symbol" | "unavailable";
  };
}

export interface AnalyzeFactoryInputTypesInput {
  readonly workspaceRoot: string;
  readonly descriptor: WorkspaceSourceUsageProgramDescriptor;
  readonly factoryDeclaration: ts.Declaration;
}

interface NormalizationContext {
  readonly anchor: ts.Node;
  readonly checker: ts.TypeChecker;
  readonly workspaceRoot: string;
  readonly active: Set<ts.Type>;
  remaining: number;
}

interface ObservableResolution {
  readonly emissionTypes: readonly ts.Type[];
}

interface TypeSafetyInspector {
  readonly hasIntersectingError: (node: ts.Node) => boolean;
  readonly hasSuppression: (node: ts.Node) => boolean;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isWithin(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function uniqueSorted<T>(
  values: readonly T[],
  key: (value: T) => string
): readonly T[] {
  const unique = new Map<string, T>();
  for (const value of values) unique.set(key(value), value);
  return [...unique.values()].sort((left, right) =>
    compareText(key(left), key(right))
  );
}

function canonicalSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol | undefined
): ts.Symbol | undefined {
  if (symbol === undefined) return undefined;
  return (symbol.flags & ts.SymbolFlags.Alias) === 0
    ? symbol
    : checker.getAliasedSymbol(symbol);
}

function symbolDeclaration(symbol: ts.Symbol): ts.Declaration | undefined {
  return symbol.valueDeclaration ?? symbol.declarations?.[0];
}

function packageNameFromPath(fileName: string): string | undefined {
  const normalized = fileName.replaceAll("\\", "/");
  const marker = "/node_modules/";
  const index = normalized.lastIndexOf(marker);
  if (index < 0) return undefined;
  const segments = normalized.slice(index + marker.length).split("/");
  const first = segments[0];
  if (first === undefined || first.length === 0) return undefined;
  return first.startsWith("@") && segments[1] !== undefined
    ? `${first}/${segments[1]}`
    : first;
}

function typeIdentity(
  context: NormalizationContext,
  type: ts.Type
): NormalizedTypeIdentity | undefined {
  const referenceTarget =
    (type.flags & ts.TypeFlags.Object) !== 0 &&
    (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference
      ? (type as ts.TypeReference).target
      : undefined;
  const symbol = canonicalSymbol(
    context.checker,
    type.aliasSymbol ?? type.symbol ?? referenceTarget?.symbol
  );
  if (symbol === undefined) return undefined;
  const declaration = symbolDeclaration(symbol);
  if (declaration === undefined) return undefined;
  const fileName = resolve(declaration.getSourceFile().fileName);
  const packageName = packageNameFromPath(fileName);
  if (packageName !== undefined) {
    return {
      scope: "external",
      packageName,
      symbol: symbol.getName(),
    };
  }
  if (!isWithin(context.workspaceRoot, fileName)) return undefined;
  return {
    scope: "workspace",
    path: relative(context.workspaceRoot, fileName).replaceAll("\\", "/"),
    symbol: symbol.getName(),
  };
}

function referenceTargetPackageName(
  checker: ts.TypeChecker,
  type: ts.Type
): string | undefined {
  if (
    (type.flags & ts.TypeFlags.Object) === 0 ||
    ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) === 0
  ) {
    return undefined;
  }
  const symbol = canonicalSymbol(
    checker,
    (type as ts.TypeReference).target.symbol
  );
  const declaration =
    symbol === undefined ? undefined : symbolDeclaration(symbol);
  return declaration === undefined
    ? undefined
    : packageNameFromPath(resolve(declaration.getSourceFile().fileName));
}

function typeArguments(
  checker: ts.TypeChecker,
  type: ts.Type
): readonly ts.Type[] {
  return (type.flags & ts.TypeFlags.Object) !== 0 &&
    ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
    ? checker.getTypeArguments(type as ts.TypeReference)
    : [];
}

function displayType(
  context: NormalizationContext,
  type: ts.Type
): { readonly display: string; readonly truncated: boolean } {
  const display = context.checker.typeToString(
    type,
    context.anchor,
    TYPE_FORMAT_FLAGS
  );
  return display.length <= LIMITS.displayCharacters
    ? { display, truncated: false }
    : {
        display: `${display.slice(0, LIMITS.displayCharacters - 1)}…`,
        truncated: true,
      };
}

function nullable(type: ts.Type): boolean {
  if ((type.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) !== 0) {
    return true;
  }
  return type.isUnion() && type.types.some(nullable);
}

function mergeHazards(
  groups: readonly (readonly NormalizedTypeHazard[])[]
): readonly NormalizedTypeHazard[] {
  return [...new Set(groups.flat())].sort(compareText);
}

function literalValue(type: ts.Type): string | number | boolean | undefined {
  if (type.isStringLiteral() || type.isNumberLiteral()) return type.value;
  if ((type.flags & ts.TypeFlags.BooleanLiteral) !== 0) {
    return (
      (type as ts.Type & { readonly intrinsicName?: string }).intrinsicName ===
      "true"
    );
  }
  return undefined;
}

function propertyReadonly(symbol: ts.Symbol): boolean {
  return (symbol.declarations ?? []).some((declaration) =>
    (ts.canHaveModifiers(declaration)
      ? ts.getModifiers(declaration)
      : undefined
    )?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)
  );
}

function normalizeSignature(
  context: NormalizationContext,
  signature: ts.Signature,
  depth: number
): NormalizedCallSignature {
  const declaration = signature.getDeclaration();
  const parameters = signature.parameters
    .slice(0, LIMITS.parameters)
    .map((parameter) => {
      const parameterDeclaration =
        parameter.valueDeclaration ?? parameter.declarations?.[0];
      const type = context.checker.getTypeOfSymbolAtLocation(
        parameter,
        parameterDeclaration ?? declaration
      );
      return {
        name: parameter.getName(),
        optional:
          (parameter.flags & ts.SymbolFlags.Optional) !== 0 ||
          (parameterDeclaration !== undefined &&
            ts.isParameter(parameterDeclaration) &&
            (parameterDeclaration.questionToken !== undefined ||
              parameterDeclaration.initializer !== undefined)),
        rest:
          parameterDeclaration !== undefined &&
          ts.isParameter(parameterDeclaration) &&
          parameterDeclaration.dotDotDotToken !== undefined,
        type: normalizeType(context, type, depth + 1),
      };
    });
  return {
    parameters,
    returnType: normalizeType(
      context,
      context.checker.getReturnTypeOfSignature(signature),
      depth + 1
    ),
  };
}

function normalizeType(
  context: NormalizationContext,
  type: ts.Type,
  depth = 0
): NormalizedTypeDescriptor {
  const { display, truncated: displayTruncated } = displayType(context, type);
  if (depth > LIMITS.depth || context.remaining <= 0) {
    return {
      kind: "unsupported",
      display,
      nullable: nullable(type),
      hazards: ["analysis-truncated"],
    };
  }
  context.remaining -= 1;
  if (context.active.has(type)) {
    return {
      kind: "recursive",
      display,
      nullable: nullable(type),
      hazards: ["recursive"],
    };
  }
  context.active.add(type);

  const finish = (descriptor: NormalizedTypeDescriptor) => {
    context.active.delete(type);
    return displayTruncated
      ? {
          ...descriptor,
          hazards: mergeHazards([descriptor.hazards, ["analysis-truncated"]]),
        }
      : descriptor;
  };
  const scalar = (
    kind: NormalizedTypeKind,
    hazards: readonly NormalizedTypeHazard[] = []
  ) => finish({ kind, display, nullable: nullable(type), hazards });

  if ((type.flags & ts.TypeFlags.Any) !== 0) return scalar("any", ["any"]);
  if ((type.flags & ts.TypeFlags.Unknown) !== 0)
    return scalar("unknown", ["unknown"]);
  if ((type.flags & ts.TypeFlags.Never) !== 0) return scalar("never");
  if ((type.flags & ts.TypeFlags.Void) !== 0) return scalar("void");
  if ((type.flags & ts.TypeFlags.Undefined) !== 0) return scalar("undefined");
  if ((type.flags & ts.TypeFlags.Null) !== 0) return scalar("null");
  if ((type.flags & ts.TypeFlags.TypeParameter) !== 0) {
    const constraint = context.checker.getBaseConstraintOfType(type);
    return finish({
      kind: "type-parameter",
      display,
      nullable: nullable(type),
      hazards: ["unresolved-generic"],
      ...(constraint === undefined || constraint === type
        ? {}
        : { constraint: normalizeType(context, constraint, depth + 1) }),
    });
  }
  if ((type.flags & ts.TypeFlags.Boolean) !== 0) return scalar("boolean");
  const literal = literalValue(type);
  if (literal !== undefined) {
    const literalTruncated =
      typeof literal === "string" && literal.length > LIMITS.literalCharacters;
    return finish({
      kind: "literal",
      display,
      nullable: false,
      hazards: literalTruncated ? ["analysis-truncated"] : [],
      ...(literalTruncated ? {} : { literal }),
    });
  }
  if (type.isUnionOrIntersection()) {
    const sourceMembers = type.types;
    const truncated = sourceMembers.length > LIMITS.unionMembers;
    const members = uniqueSorted(
      sourceMembers
        .slice(0, LIMITS.unionMembers)
        .map((member) => normalizeType(context, member, depth + 1)),
      (member) => member.display
    );
    return finish({
      kind: type.isUnion() ? "union" : "intersection",
      display,
      nullable: nullable(type),
      hazards: mergeHazards([
        ...members.map(({ hazards }) => hazards),
        ...(truncated ? [["analysis-truncated"] as const] : []),
      ]),
      members,
    });
  }
  if (context.checker.isTupleType(type)) {
    const sourceElements = typeArguments(context.checker, type);
    const truncated = sourceElements.length > LIMITS.tupleElements;
    const elements = sourceElements
      .slice(0, LIMITS.tupleElements)
      .map((element) => normalizeType(context, element, depth + 1));
    return finish({
      kind: "tuple",
      display,
      nullable: false,
      hazards: mergeHazards([
        ...elements.map(({ hazards }) => hazards),
        ...(truncated ? [["analysis-truncated"] as const] : []),
      ]),
      elements,
    });
  }
  if (context.checker.isArrayType(type)) {
    const element = typeArguments(context.checker, type)[0];
    const elementType =
      element === undefined
        ? {
            kind: "unsupported" as const,
            display: "unknown",
            nullable: false,
            hazards: ["unsupported" as const],
          }
        : normalizeType(context, element, depth + 1);
    return finish({
      kind: "array",
      display,
      nullable: false,
      hazards: elementType.hazards,
      elementType,
    });
  }
  if ((type.flags & ts.TypeFlags.StringLike) !== 0) return scalar("string");
  if ((type.flags & ts.TypeFlags.NumberLike) !== 0) return scalar("number");
  if ((type.flags & ts.TypeFlags.BooleanLike) !== 0) return scalar("boolean");
  if ((type.flags & ts.TypeFlags.BigIntLike) !== 0) return scalar("bigint");
  if ((type.flags & ts.TypeFlags.ESSymbolLike) !== 0) return scalar("symbol");

  if ((type.flags & ts.TypeFlags.Object) !== 0) {
    const identity = typeIdentity(context, type);
    const callSource = context.checker
      .getSignaturesOfType(type, ts.SignatureKind.Call)
      .slice(0, LIMITS.signatures);
    const constructSource = context.checker
      .getSignaturesOfType(type, ts.SignatureKind.Construct)
      .slice(0, LIMITS.signatures);
    const callSignatures = callSource.map((signature) =>
      normalizeSignature(context, signature, depth)
    );
    const constructSignatures = constructSource.map((signature) =>
      normalizeSignature(context, signature, depth)
    );
    const argumentsSource = typeArguments(context.checker, type);
    const genericArguments = argumentsSource
      .slice(0, LIMITS.unionMembers)
      .map((argument) => normalizeType(context, argument, depth + 1));
    const shouldExpandProperties =
      identity?.scope === "workspace" &&
      referenceTargetPackageName(context.checker, type) === undefined;
    const propertySource = shouldExpandProperties
      ? context.checker
          .getPropertiesOfType(type)
          .sort((left, right) => compareText(left.getName(), right.getName()))
      : [];
    const propertyTruncated = propertySource.length > LIMITS.properties;
    const properties = propertySource
      .slice(0, LIMITS.properties)
      .map((property) => {
        const declaration =
          property.valueDeclaration ?? property.declarations?.[0];
        return {
          key: property.getName(),
          optional: (property.flags & ts.SymbolFlags.Optional) !== 0,
          readonly: propertyReadonly(property),
          type: normalizeType(
            context,
            context.checker.getTypeOfSymbolAtLocation(
              property,
              declaration ?? context.anchor
            ),
            depth + 1
          ),
        };
      });
    const signatureTruncated =
      context.checker.getSignaturesOfType(type, ts.SignatureKind.Call).length >
        LIMITS.signatures ||
      context.checker.getSignaturesOfType(type, ts.SignatureKind.Construct)
        .length > LIMITS.signatures ||
      [...callSource, ...constructSource].some(
        (signature) => signature.parameters.length > LIMITS.parameters
      );
    const argumentTruncated = argumentsSource.length > LIMITS.unionMembers;
    const hazards = mergeHazards([
      ...genericArguments.map(({ hazards }) => hazards),
      ...properties.map(({ type: propertyType }) => propertyType.hazards),
      ...callSignatures.flatMap(({ parameters, returnType }) => [
        ...parameters.map(({ type: parameterType }) => parameterType.hazards),
        returnType.hazards,
      ]),
      ...constructSignatures.flatMap(({ parameters, returnType }) => [
        ...parameters.map(({ type: parameterType }) => parameterType.hazards),
        returnType.hazards,
      ]),
      ...(propertyTruncated || signatureTruncated || argumentTruncated
        ? [["analysis-truncated"] as const]
        : []),
    ]);
    return finish({
      kind: callSignatures.length > 0 ? "callable" : "object",
      display,
      nullable: false,
      hazards,
      ...(identity === undefined ? {} : { identity }),
      ...(genericArguments.length === 0
        ? {}
        : { typeArguments: genericArguments }),
      ...(properties.length === 0 ? {} : { properties }),
      ...(callSignatures.length === 0 ? {} : { callSignatures }),
      ...(constructSignatures.length === 0 ? {} : { constructSignatures }),
    });
  }
  return scalar("unsupported", ["unsupported"]);
}

function normalize(
  checker: ts.TypeChecker,
  workspaceRoot: string,
  anchor: ts.Node,
  type: ts.Type
): NormalizedTypeDescriptor {
  return normalizeType(
    {
      active: new Set(),
      anchor,
      checker,
      remaining: LIMITS.nodes,
      workspaceRoot,
    },
    type
  );
}

function moduleExportSymbol(
  program: ts.Program,
  checker: ts.TypeChecker,
  moduleId: string,
  exportName: string
): ts.Symbol | undefined {
  for (const sourceFile of program.getSourceFiles()) {
    for (const statement of sourceFile.statements) {
      if (
        (!ts.isImportDeclaration(statement) &&
          !ts.isExportDeclaration(statement)) ||
        statement.moduleSpecifier === undefined ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== moduleId
      ) {
        continue;
      }
      const moduleSymbol = checker.getSymbolAtLocation(
        statement.moduleSpecifier
      );
      const exported =
        moduleSymbol === undefined
          ? undefined
          : checker
              .getExportsOfModule(moduleSymbol)
              .find((symbol) => symbol.getName() === exportName);
      const canonical = canonicalSymbol(checker, exported);
      const declaration =
        canonical === undefined ? undefined : symbolDeclaration(canonical);
      if (
        canonical !== undefined &&
        declaration !== undefined &&
        packageNameFromPath(resolve(declaration.getSourceFile().fileName)) ===
          moduleId
      ) {
        return canonical;
      }
    }
  }
  return undefined;
}

function derivesFromObservable(
  checker: ts.TypeChecker,
  observableSymbol: ts.Symbol,
  type: ts.Type,
  seen: Set<ts.Type>
): boolean {
  const target =
    (type.flags & ts.TypeFlags.Object) !== 0 &&
    ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
      ? (type as ts.TypeReference).target
      : type;
  if (seen.has(target)) return false;
  seen.add(target);
  const symbol = canonicalSymbol(
    checker,
    target.symbol ?? type.symbol ?? type.aliasSymbol
  );
  if (symbol === observableSymbol) return true;
  if (
    (target.flags & ts.TypeFlags.Object) === 0 ||
    ((target as ts.ObjectType).objectFlags &
      ts.ObjectFlags.ClassOrInterface) ===
      0
  ) {
    return false;
  }
  return checker
    .getBaseTypes(target as ts.InterfaceType)
    .some((base) =>
      derivesFromObservable(checker, observableSymbol, base, seen)
    );
}

function callbackParameterTypes(
  checker: ts.TypeChecker,
  type: ts.Type,
  fallback: ts.Node,
  seen: Set<ts.Type>
): readonly ts.Type[] {
  if (seen.has(type)) return [];
  seen.add(type);
  if (type.isUnion()) {
    return type.types.flatMap((member) =>
      callbackParameterTypes(checker, member, fallback, new Set(seen))
    );
  }
  const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
  if (signatures.length > 0) {
    return signatures.flatMap((signature) => {
      const parameter = signature.parameters[0];
      if (parameter === undefined) return [];
      const declaration =
        parameter.valueDeclaration ?? parameter.declarations?.[0];
      return [
        checker.getTypeOfSymbolAtLocation(parameter, declaration ?? fallback),
      ];
    });
  }
  const next = checker.getPropertyOfType(type, "next");
  if (next === undefined) return [];
  const declaration = next.valueDeclaration ?? next.declarations?.[0];
  return callbackParameterTypes(
    checker,
    checker.getTypeOfSymbolAtLocation(next, declaration ?? fallback),
    fallback,
    new Set(seen)
  );
}

function concreteSubscribeEmissions(
  checker: ts.TypeChecker,
  observableSymbol: ts.Symbol,
  type: ts.Type,
  fallback: ts.Node
): readonly ts.Type[] {
  if (!derivesFromObservable(checker, observableSymbol, type, new Set())) {
    return [];
  }
  const subscribe = checker.getPropertyOfType(type, "subscribe");
  if (subscribe === undefined) return [];
  const declaration = subscribe.valueDeclaration ?? subscribe.declarations?.[0];
  const subscribeType = checker.getTypeOfSymbolAtLocation(
    subscribe,
    declaration ?? fallback
  );
  return checker
    .getSignaturesOfType(subscribeType, ts.SignatureKind.Call)
    .flatMap((signature) => {
      const observer = signature.parameters[0];
      if (observer === undefined) return [];
      const observerDeclaration =
        observer.valueDeclaration ?? observer.declarations?.[0];
      return callbackParameterTypes(
        checker,
        checker.getTypeOfSymbolAtLocation(
          observer,
          observerDeclaration ?? declaration ?? fallback
        ),
        fallback,
        new Set()
      );
    });
}

function observableEmissions(
  checker: ts.TypeChecker,
  observableSymbol: ts.Symbol,
  type: ts.Type,
  fallback: ts.Node,
  seen = new Set<ts.Type>()
): ObservableResolution | undefined {
  if (seen.has(type)) return undefined;
  seen.add(type);
  if (type.isUnion()) {
    const members = type.types.map((member) =>
      observableEmissions(
        checker,
        observableSymbol,
        member,
        fallback,
        new Set(seen)
      )
    );
    return members.every(
      (member): member is ObservableResolution => member !== undefined
    )
      ? { emissionTypes: members.flatMap(({ emissionTypes }) => emissionTypes) }
      : undefined;
  }
  const target =
    (type.flags & ts.TypeFlags.Object) !== 0 &&
    ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
      ? (type as ts.TypeReference).target
      : type;
  const symbol = canonicalSymbol(
    checker,
    target.symbol ?? type.symbol ?? type.aliasSymbol
  );
  if (symbol === observableSymbol) {
    const emission = typeArguments(checker, type)[0];
    return emission === undefined ? undefined : { emissionTypes: [emission] };
  }
  const emissions = concreteSubscribeEmissions(
    checker,
    observableSymbol,
    type,
    fallback
  );
  return emissions.length === 0 ? undefined : { emissionTypes: emissions };
}

function containsCanonicalObservable(
  checker: ts.TypeChecker,
  observableSymbol: ts.Symbol,
  type: ts.Type
): boolean {
  if (type.isUnionOrIntersection()) {
    return type.types.some((member) =>
      containsCanonicalObservable(checker, observableSymbol, member)
    );
  }
  return derivesFromObservable(checker, observableSymbol, type, new Set());
}

function combinedEmissionDescriptor(
  checker: ts.TypeChecker,
  workspaceRoot: string,
  anchor: ts.Node,
  emissionTypes: readonly ts.Type[]
): NormalizedTypeDescriptor {
  const truncated = emissionTypes.length > LIMITS.unionMembers;
  const members = uniqueSorted(
    emissionTypes
      .slice(0, LIMITS.unionMembers)
      .map((type) => normalize(checker, workspaceRoot, anchor, type)),
    ({ display }) => display
  );
  if (members.length === 1) {
    const member = members[0]!;
    return truncated
      ? {
          ...member,
          hazards: mergeHazards([member.hazards, ["analysis-truncated"]]),
        }
      : member;
  }
  const unboundedDisplay = members.map(({ display }) => display).join(" | ");
  const displayTruncated = unboundedDisplay.length > LIMITS.displayCharacters;
  return {
    kind: "union",
    display: displayTruncated
      ? `${unboundedDisplay.slice(0, LIMITS.displayCharacters - 1)}…`
      : unboundedDisplay,
    nullable: members.some(({ nullable: isNullable }) => isNullable),
    hazards: mergeHazards([
      ...members.map(({ hazards }) => hazards),
      ...(truncated || displayTruncated
        ? [["analysis-truncated"] as const]
        : []),
    ]),
    members,
  };
}

function observablePrecision(
  descriptor: NormalizedTypeDescriptor
): ObservableTypeAnalysis["precision"] {
  if (descriptor.hazards.includes("analysis-truncated")) {
    return "analysis-truncated";
  }
  if (descriptor.hazards.includes("any")) return "contains-any";
  if (descriptor.hazards.includes("unknown")) return "contains-unknown";
  return "exact-type";
}

function diagnosticsForDescriptor(
  descriptor: NormalizedTypeDescriptor,
  propertyKey: string,
  path: string
): readonly FactoryInputDiagnostic[] {
  const diagnostics: FactoryInputDiagnostic[] = [];
  const visit = (
    current: NormalizedTypeDescriptor,
    currentPath: string,
    active: Set<NormalizedTypeDescriptor>
  ) => {
    if (active.has(current)) return;
    active.add(current);
    if (current.kind === "any") {
      diagnostics.push({
        code: "FACTORY_INPUT_TYPE_ANY",
        path: currentPath,
        propertyKey,
      });
      return;
    }
    if (current.kind === "unknown") {
      diagnostics.push({
        code: "FACTORY_INPUT_TYPE_UNKNOWN",
        path: currentPath,
        propertyKey,
      });
      return;
    }
    if (current.kind === "recursive") {
      diagnostics.push({
        code: "FACTORY_INPUT_TYPE_RECURSIVE",
        path: currentPath,
        propertyKey,
      });
      return;
    }
    if (current.kind === "type-parameter") {
      diagnostics.push({
        code: "FACTORY_INPUT_GENERIC_UNRESOLVED",
        path: currentPath,
        propertyKey,
      });
    }
    if (current.hazards.includes("analysis-truncated")) {
      diagnostics.push({
        code: "FACTORY_TYPE_ANALYSIS_TRUNCATED",
        path: currentPath,
        propertyKey,
      });
    }
    if (current.kind === "unsupported") {
      diagnostics.push({
        code: "FACTORY_INPUT_TYPE_UNSUPPORTED",
        path: currentPath,
        propertyKey,
      });
    }
    for (const member of current.members ?? []) {
      visit(member, currentPath, new Set(active));
    }
    if (current.elementType !== undefined) {
      visit(current.elementType, `${currentPath}[]`, new Set(active));
    }
    for (const [index, element] of (current.elements ?? []).entries()) {
      visit(element, `${currentPath}[${index}]`, new Set(active));
    }
    for (const property of current.properties ?? []) {
      visit(property.type, `${currentPath}.${property.key}`, new Set(active));
    }
    for (const [index, argument] of (current.typeArguments ?? []).entries()) {
      visit(argument, `${currentPath}<${index}>`, new Set(active));
    }
    active.delete(current);
  };
  visit(descriptor, path, new Set());
  return diagnostics;
}

function declarationNameNode(
  declaration: ts.Declaration
): ts.DeclarationName | undefined {
  const name = (declaration as ts.NamedDeclaration).name;
  return name ?? undefined;
}

function factorySymbolId(
  workspaceRoot: string,
  descriptor: WorkspaceSourceUsageProgramDescriptor,
  declaration: ts.Declaration,
  signatureKind: FactoryInputTypeAnalysis["signatureKind"]
): string {
  const fileName = resolve(declaration.getSourceFile().fileName);
  const path = isWithin(workspaceRoot, fileName)
    ? relative(workspaceRoot, fileName).replaceAll("\\", "/")
    : "outside-workspace";
  const name = declarationNameNode(declaration);
  const symbolName =
    name !== undefined && ts.isIdentifier(name) ? name.text : "anonymous";
  return `${descriptor.programId}:${path}:${symbolName}:${
    signatureKind === "construct" ? "class" : "function"
  }`;
}

function emptyAnalysis(
  input: AnalyzeFactoryInputTypesInput,
  code: FactoryInputDiagnosticCode
): FactoryInputTypeAnalysis {
  return {
    factorySymbolId: factorySymbolId(
      resolve(input.workspaceRoot),
      input.descriptor,
      input.factoryDeclaration,
      "unsupported"
    ),
    signatureKind: "unsupported",
    expectedType: {
      kind: "unsupported",
      display: "unsupported",
      nullable: false,
      hazards: ["unsupported"],
    },
    properties: [],
    coverage: "incomplete",
    diagnostics: [{ code }],
    compatibility: {
      typescript: ts.version,
      rxjs: "unavailable",
    },
  };
}

function createTypeSafetyInspector(program: ts.Program): TypeSafetyInspector {
  const diagnostics = new Map<ts.SourceFile, readonly ts.Diagnostic[]>();
  const suppressions = new Map<ts.SourceFile, boolean>();
  return {
    hasIntersectingError: (node) => {
      const sourceFile = node.getSourceFile();
      let sourceDiagnostics = diagnostics.get(sourceFile);
      if (sourceDiagnostics === undefined) {
        sourceDiagnostics = [
          ...program.getSyntacticDiagnostics(sourceFile),
          ...program.getSemanticDiagnostics(sourceFile),
        ];
        diagnostics.set(sourceFile, sourceDiagnostics);
      }
      const nodeStart = node.getStart(sourceFile);
      const nodeEnd = node.end;
      return sourceDiagnostics.some((diagnostic) => {
        if (
          diagnostic.category !== ts.DiagnosticCategory.Error ||
          diagnostic.file !== sourceFile
        ) {
          return false;
        }
        if (diagnostic.start === undefined) return true;
        const diagnosticEnd = diagnostic.start + (diagnostic.length ?? 0);
        return diagnostic.start < nodeEnd && diagnosticEnd > nodeStart;
      });
    },
    hasSuppression: (node) => {
      const sourceFile = node.getSourceFile();
      let suppressed = suppressions.get(sourceFile);
      if (suppressed === undefined) {
        suppressed = /@ts-(?:expect-error|ignore|nocheck)\b/u.test(
          sourceFile.text
        );
        suppressions.set(sourceFile, suppressed);
      }
      return suppressed;
    },
  };
}

function isSupportedOptionsObject(type: ts.Type): boolean {
  if ((type.flags & ts.TypeFlags.Object) !== 0) return true;
  return type.isIntersection() && type.types.every(isSupportedOptionsObject);
}

export function analyzeFactoryInputTypes(
  input: AnalyzeFactoryInputTypesInput
): FactoryInputTypeAnalysis {
  const workspaceRoot = resolve(input.workspaceRoot);
  const sourceFile = input.factoryDeclaration.getSourceFile();
  if (
    input.descriptor.program.getSourceFile(sourceFile.fileName) !== sourceFile
  ) {
    return emptyAnalysis(input, "FACTORY_INPUT_PROGRAM_MISMATCH");
  }
  const typeSafety = createTypeSafetyInspector(input.descriptor.program);
  if (typeSafety.hasSuppression(input.factoryDeclaration)) {
    return emptyAnalysis(input, "FACTORY_TYPESCRIPT_SUPPRESSION");
  }
  if (typeSafety.hasIntersectingError(input.factoryDeclaration)) {
    return emptyAnalysis(input, "FACTORY_TYPESCRIPT_DIAGNOSTIC");
  }
  const checker = input.descriptor.program.getTypeChecker();
  const name = declarationNameNode(input.factoryDeclaration);
  const symbol =
    name === undefined ? undefined : checker.getSymbolAtLocation(name);
  if (symbol === undefined || name === undefined) {
    return emptyAnalysis(input, "FACTORY_INPUT_SIGNATURE_UNSUPPORTED");
  }
  const signatureKind = ts.isClassDeclaration(input.factoryDeclaration)
    ? "construct"
    : "call";
  const factoryType = checker.getTypeOfSymbolAtLocation(symbol, name);
  const signatures = checker.getSignaturesOfType(
    factoryType,
    signatureKind === "construct"
      ? ts.SignatureKind.Construct
      : ts.SignatureKind.Call
  );
  if (signatures.length !== 1 || signatures[0]?.parameters.length !== 1) {
    return emptyAnalysis(input, "FACTORY_INPUT_SIGNATURE_UNSUPPORTED");
  }
  const signature = signatures[0];
  const parameter = signature.parameters[0]!;
  const parameterDeclaration =
    parameter.valueDeclaration ?? parameter.declarations?.[0];
  const inputType = checker.getTypeOfSymbolAtLocation(
    parameter,
    parameterDeclaration ?? input.factoryDeclaration
  );
  const expectedType = normalize(
    checker,
    workspaceRoot,
    input.factoryDeclaration,
    inputType
  );
  const observableSymbol = moduleExportSymbol(
    input.descriptor.program,
    checker,
    "rxjs",
    "Observable"
  );
  const diagnostics: FactoryInputDiagnostic[] = [];
  if (expectedType.kind === "any") {
    diagnostics.push({ code: "FACTORY_INPUT_TYPE_ANY", path: "$input" });
  } else if (expectedType.kind === "unknown") {
    diagnostics.push({ code: "FACTORY_INPUT_TYPE_UNKNOWN", path: "$input" });
  } else if (expectedType.kind === "type-parameter") {
    diagnostics.push({
      code: "FACTORY_INPUT_GENERIC_UNRESOLVED",
      path: "$input",
    });
  } else if (!isSupportedOptionsObject(inputType)) {
    return {
      ...emptyAnalysis(input, "FACTORY_INPUT_SIGNATURE_UNSUPPORTED"),
      expectedType,
      compatibility: {
        typescript: ts.version,
        rxjs:
          observableSymbol === undefined ? "unavailable" : "canonical-symbol",
      },
    };
  }
  const propertySymbols = checker
    .getPropertiesOfType(inputType)
    .sort((left, right) => compareText(left.getName(), right.getName()));
  if (propertySymbols.length > LIMITS.properties) {
    diagnostics.push({
      code: "FACTORY_TYPE_ANALYSIS_TRUNCATED",
      path: "$input",
    });
  }
  const properties = propertySymbols
    .slice(0, LIMITS.properties)
    .map((property): FactoryInputPropertyTypeAnalysis => {
      const declaration =
        property.valueDeclaration ?? property.declarations?.[0];
      const propertyType = checker.getTypeOfSymbolAtLocation(
        property,
        declaration ?? parameterDeclaration ?? input.factoryDeclaration
      );
      const expectedPropertyType = normalize(
        checker,
        workspaceRoot,
        declaration ?? input.factoryDeclaration,
        propertyType
      );
      if (
        declaration !== undefined &&
        (typeSafety.hasSuppression(declaration) ||
          typeSafety.hasIntersectingError(declaration))
      ) {
        diagnostics.push({
          code: typeSafety.hasSuppression(declaration)
            ? "FACTORY_TYPESCRIPT_SUPPRESSION"
            : "FACTORY_TYPESCRIPT_DIAGNOSTIC",
          path: property.getName(),
          propertyKey: property.getName(),
        });
        return {
          key: property.getName(),
          optional: (property.flags & ts.SymbolFlags.Optional) !== 0,
          readonly: propertyReadonly(property),
          expectedType: expectedPropertyType,
          observables: [],
        };
      }
      const observables: ObservableTypeAnalysis[] = [];
      const callSignatures = checker.getSignaturesOfType(
        propertyType,
        ts.SignatureKind.Call
      );
      if (observableSymbol !== undefined) {
        const direct = observableEmissions(
          checker,
          observableSymbol,
          propertyType,
          declaration ?? input.factoryDeclaration
        );
        if (direct !== undefined) {
          const emissionType = combinedEmissionDescriptor(
            checker,
            workspaceRoot,
            declaration ?? input.factoryDeclaration,
            direct.emissionTypes
          );
          observables.push({
            location: { kind: "property" },
            emissionType,
            precision: observablePrecision(emissionType),
            values: { kind: "type-only" },
          });
          diagnostics.push(
            ...diagnosticsForDescriptor(
              emissionType,
              property.getName(),
              `${property.getName()}.emission`
            )
          );
        } else if (
          containsCanonicalObservable(checker, observableSymbol, propertyType)
        ) {
          diagnostics.push({
            code: "FACTORY_OBSERVABLE_TYPE_UNRESOLVED",
            path: property.getName(),
            propertyKey: property.getName(),
          });
        }
      }
      if (callSignatures.length > LIMITS.signatures) {
        diagnostics.push({
          code: "FACTORY_TYPE_ANALYSIS_TRUNCATED",
          path: property.getName(),
          propertyKey: property.getName(),
        });
      }
      callSignatures
        .slice(0, LIMITS.signatures)
        .forEach((callSignature, signatureIndex) => {
          if (callSignature.parameters.length > LIMITS.parameters) {
            diagnostics.push({
              code: "FACTORY_TYPE_ANALYSIS_TRUNCATED",
              path: `${property.getName()}.call[${signatureIndex}]`,
              propertyKey: property.getName(),
            });
          }
          callSignature.parameters
            .slice(0, LIMITS.parameters)
            .forEach((callParameter, parameterIndex) => {
              const callParameterDeclaration =
                callParameter.valueDeclaration ??
                callParameter.declarations?.[0];
              const parameterType = normalize(
                checker,
                workspaceRoot,
                callParameterDeclaration ??
                  declaration ??
                  input.factoryDeclaration,
                checker.getTypeOfSymbolAtLocation(
                  callParameter,
                  callParameterDeclaration ??
                    declaration ??
                    input.factoryDeclaration
                )
              );
              diagnostics.push(
                ...diagnosticsForDescriptor(
                  parameterType,
                  property.getName(),
                  `${property.getName()}.call[${signatureIndex}].parameter[${parameterIndex}]`
                )
              );
            });
          const returnType = checker.getReturnTypeOfSignature(callSignature);
          const resolution =
            observableSymbol === undefined
              ? undefined
              : observableEmissions(
                  checker,
                  observableSymbol,
                  returnType,
                  declaration ?? input.factoryDeclaration
                );
          if (resolution !== undefined) {
            const emissionType = combinedEmissionDescriptor(
              checker,
              workspaceRoot,
              declaration ?? input.factoryDeclaration,
              resolution.emissionTypes
            );
            observables.push({
              location: { kind: "call-return", signatureIndex },
              emissionType,
              precision: observablePrecision(emissionType),
              values: { kind: "type-only" },
            });
            diagnostics.push(
              ...diagnosticsForDescriptor(
                emissionType,
                property.getName(),
                `${property.getName()}.call[${signatureIndex}].emission`
              )
            );
            return;
          }
          if (
            observableSymbol !== undefined &&
            containsCanonicalObservable(checker, observableSymbol, returnType)
          ) {
            diagnostics.push({
              code: "FACTORY_OBSERVABLE_TYPE_UNRESOLVED",
              path: `${property.getName()}.call[${signatureIndex}].return`,
              propertyKey: property.getName(),
            });
            return;
          }
          const normalizedReturn = normalize(
            checker,
            workspaceRoot,
            declaration ?? input.factoryDeclaration,
            returnType
          );
          diagnostics.push(
            ...diagnosticsForDescriptor(
              normalizedReturn,
              property.getName(),
              `${property.getName()}.call[${signatureIndex}].return`
            )
          );
        });
      if (observables.length === 0 && callSignatures.length === 0) {
        diagnostics.push(
          ...diagnosticsForDescriptor(
            expectedPropertyType,
            property.getName(),
            property.getName()
          )
        );
      }
      return {
        key: property.getName(),
        optional: (property.flags & ts.SymbolFlags.Optional) !== 0,
        readonly: propertyReadonly(property),
        expectedType: expectedPropertyType,
        observables,
      };
    });
  const sortedDiagnostics = uniqueSorted(diagnostics, (diagnostic) =>
    [diagnostic.propertyKey ?? "", diagnostic.path ?? "", diagnostic.code].join(
      "\0"
    )
  );
  return {
    factorySymbolId: factorySymbolId(
      workspaceRoot,
      input.descriptor,
      input.factoryDeclaration,
      signatureKind
    ),
    signatureKind,
    expectedType,
    properties,
    coverage:
      sortedDiagnostics.length === 0
        ? "complete-supported-grammar"
        : "incomplete",
    diagnostics: sortedDiagnostics,
    compatibility: {
      typescript: ts.version,
      rxjs: observableSymbol === undefined ? "unavailable" : "canonical-symbol",
    },
  };
}
