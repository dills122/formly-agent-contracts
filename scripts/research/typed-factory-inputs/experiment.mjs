import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const experimentDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(experimentDirectory, "../../..");
const fixturePath = resolve(experimentDirectory, "fixture.ts");
const requireFromFormlyApp = createRequire(
  resolve(repositoryRoot, "apps/formly-test-app/package.json")
);

const formatFlags =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

function createExperimentProgram() {
  const options = {
    allowJs: false,
    baseUrl: repositoryRoot,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    paths: {
      rxjs: ["apps/formly-test-app/node_modules/rxjs/dist/types/index.d.ts"],
    },
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
  const program = ts.createProgram([fixturePath], options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => repositoryRoot,
        getNewLine: () => "\n",
      })
    );
  }
  const sourceFile = program.getSourceFile(fixturePath);
  if (sourceFile === undefined) {
    throw new Error(`Experiment fixture was not loaded: ${fixturePath}`);
  }
  return { checker: program.getTypeChecker(), sourceFile };
}

function exportedVariables(sourceFile) {
  const variables = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    );
    if (!exported) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        variables.set(declaration.name.text, declaration);
      }
    }
  }
  return variables;
}

function findFunction(sourceFile, name) {
  return sourceFile.statements.find(
    (statement) =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === name
  );
}

function rxjsExports(checker, sourceFile) {
  const declaration = sourceFile.statements.find(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === "rxjs"
  );
  if (declaration === undefined) {
    throw new Error("RxJS import was not found in the experiment fixture.");
  }
  const moduleSymbol = checker.getSymbolAtLocation(declaration.moduleSpecifier);
  if (moduleSymbol === undefined) {
    throw new Error("RxJS module symbol could not be resolved.");
  }
  return new Map(
    checker
      .getExportsOfModule(moduleSymbol)
      .map((symbol) => [symbol.getName(), canonicalSymbol(checker, symbol)])
  );
}

function canonicalSymbol(checker, symbol) {
  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    return checker.getAliasedSymbol(symbol);
  }
  return symbol;
}

function typeArguments(checker, type) {
  if (
    (type.flags & ts.TypeFlags.Object) !== 0 &&
    (type.objectFlags & ts.ObjectFlags.Reference) !== 0
  ) {
    return checker.getTypeArguments(type);
  }
  return [];
}

function observableEmissions(checker, observableSymbol, inputType) {
  const nestedHazards = (
    type,
    seen = new Set(),
    depth = 0,
    budget = { remaining: 256 }
  ) => {
    if (seen.has(type)) {
      return new Set();
    }
    if (depth > 8 || budget.remaining <= 0) {
      return new Set(["analysis-truncated"]);
    }
    budget.remaining -= 1;
    seen.add(type);
    const hazards = new Set();
    if ((type.flags & ts.TypeFlags.Any) !== 0) {
      hazards.add("contains-any");
      return hazards;
    }
    if ((type.flags & ts.TypeFlags.Unknown) !== 0) {
      hazards.add("contains-unknown");
      return hazards;
    }
    const children = [
      ...(type.isUnionOrIntersection() ? type.types : []),
      ...typeArguments(checker, type),
      ...(type.aliasTypeArguments ?? []),
    ];
    const declarations = [
      ...(type.symbol?.declarations ?? []),
      ...(type.aliasSymbol?.declarations ?? []),
    ];
    if (
      declarations.some(
        (declaration) => declaration.getSourceFile().fileName === fixturePath
      )
    ) {
      for (const property of checker.getPropertiesOfType(type)) {
        const declaration =
          property.valueDeclaration ?? property.declarations?.[0];
        if (declaration !== undefined) {
          children.push(
            checker.getTypeOfSymbolAtLocation(property, declaration)
          );
        }
      }
    }
    for (const child of children) {
      for (const hazard of nestedHazards(child, seen, depth + 1, budget)) {
        hazards.add(hazard);
      }
    }
    return hazards;
  };

  const resolvedResult = (emissionTypes) => {
    const emissions = [
      ...new Set(
        emissionTypes.map((emission) =>
          checker.typeToString(emission, undefined, formatFlags)
        )
      ),
    ].sort();
    const hazards = [
      ...new Set(
        emissionTypes.flatMap((emission) => [...nestedHazards(emission)])
      ),
    ].sort();
    return hazards.length === 0
      ? { status: "resolved", emissions }
      : { status: "resolved", emissions, hazards };
  };

  const derivesFromObservable = (type, seen) => {
    const target = type.target ?? type;
    if (seen.has(target)) {
      return false;
    }
    seen.add(target);
    const symbol = target.aliasSymbol ?? target.symbol;
    if (symbol === observableSymbol) {
      return true;
    }
    if (
      (target.flags & ts.TypeFlags.Object) === 0 ||
      (target.objectFlags & ts.ObjectFlags.ClassOrInterface) === 0
    ) {
      return false;
    }
    return checker
      .getBaseTypes(target)
      .some((base) => derivesFromObservable(base, seen));
  };

  const callbackParameterTypes = (type, seen) => {
    if (seen.has(type)) {
      return [];
    }
    seen.add(type);
    if (type.isUnion()) {
      return type.types.flatMap((member) =>
        callbackParameterTypes(member, new Set(seen))
      );
    }
    const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    if (signatures.length > 0) {
      return signatures.flatMap((signature) => {
        const parameter = signature.parameters[0];
        if (parameter === undefined) {
          return [];
        }
        const declaration =
          parameter.valueDeclaration ?? parameter.declarations?.[0];
        return [
          checker.getTypeOfSymbolAtLocation(
            parameter,
            declaration ?? inputType.symbol?.valueDeclaration
          ),
        ];
      });
    }
    const next = checker.getPropertyOfType(type, "next");
    if (next === undefined) {
      return [];
    }
    const declaration = next.valueDeclaration ?? next.declarations?.[0];
    return callbackParameterTypes(
      checker.getTypeOfSymbolAtLocation(
        next,
        declaration ?? inputType.symbol?.valueDeclaration
      ),
      new Set(seen)
    );
  };

  const concreteSubscribeEmissions = (type) => {
    if (!derivesFromObservable(type, new Set())) {
      return [];
    }
    const subscribe = checker.getPropertyOfType(type, "subscribe");
    if (subscribe === undefined) {
      return [];
    }
    const declaration =
      subscribe.valueDeclaration ?? subscribe.declarations?.[0];
    const subscribeType = checker.getTypeOfSymbolAtLocation(
      subscribe,
      declaration ?? inputType.symbol?.valueDeclaration
    );
    return checker
      .getSignaturesOfType(subscribeType, ts.SignatureKind.Call)
      .flatMap((signature) => {
        const observer = signature.parameters[0];
        if (observer === undefined) {
          return [];
        }
        const observerDeclaration =
          observer.valueDeclaration ?? observer.declarations?.[0];
        const observerType = checker.getTypeOfSymbolAtLocation(
          observer,
          observerDeclaration ?? declaration
        );
        return callbackParameterTypes(observerType, new Set());
      });
  };

  const visit = (type, seen) => {
    if ((type.flags & ts.TypeFlags.Any) !== 0) {
      return { status: "unsafe-any", emissions: [] };
    }
    if ((type.flags & ts.TypeFlags.Unknown) !== 0) {
      return { status: "unknown", emissions: [] };
    }
    if (type.isUnion()) {
      const members = type.types.map((member) => visit(member, new Set(seen)));
      if (members.every((member) => member.status === "not-rxjs-observable")) {
        return { status: "not-rxjs-observable", emissions: [] };
      }
      if (members.some((member) => member.status !== "resolved")) {
        return { status: "ambiguous-union", emissions: [] };
      }
      return {
        status: "resolved",
        emissions: [
          ...new Set(members.flatMap((member) => member.emissions)),
        ].sort(),
        ...(members.some((member) => member.hazards !== undefined)
          ? {
              hazards: [
                ...new Set(members.flatMap((member) => member.hazards ?? [])),
              ].sort(),
            }
          : {}),
      };
    }
    if (seen.has(type)) {
      return { status: "not-rxjs-observable", emissions: [] };
    }
    seen.add(type);

    const target = type.target ?? type;
    const symbol =
      target.aliasSymbol ?? target.symbol ?? type.aliasSymbol ?? type.symbol;
    if (symbol === observableSymbol) {
      const [emission] = typeArguments(checker, type);
      if (emission === undefined) {
        return { status: "unresolved-generic", emissions: [] };
      }
      if ((emission.flags & ts.TypeFlags.Any) !== 0) {
        return { status: "unsafe-any", emissions: [] };
      }
      if ((emission.flags & ts.TypeFlags.Unknown) !== 0) {
        return { status: "unknown", emissions: [] };
      }
      return resolvedResult([emission]);
    }

    if (
      (type.flags & ts.TypeFlags.Object) !== 0 &&
      derivesFromObservable(type, new Set())
    ) {
      const emissionTypes = concreteSubscribeEmissions(type).filter(
        (emission) =>
          (emission.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) === 0
      );
      if (emissionTypes.length > 0) {
        return resolvedResult(emissionTypes);
      }
    }
    return { status: "not-rxjs-observable", emissions: [] };
  };
  return visit(inputType, new Set());
}

function optionsPropertyAccess(node, parameterName) {
  let current = node;
  const segments = [];
  while (ts.isPropertyAccessExpression(current)) {
    segments.unshift(current.name.text);
    current = current.expression;
  }
  if (!ts.isIdentifier(current) || current.text !== parameterName) {
    return undefined;
  }
  return segments[0];
}

function containingNestedFunction(node, rootFunction) {
  for (
    let current = node.parent;
    current !== undefined;
    current = current.parent
  ) {
    if (current === rootFunction) {
      return undefined;
    }
    if (ts.isFunctionLike(current)) {
      return current;
    }
  }
  return undefined;
}

const synchronousCollectionMethods = new Set([
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

function unwrapOutward(node) {
  let current = node;
  while (
    current.parent !== undefined &&
    ((ts.isParenthesizedExpression(current.parent) &&
      current.parent.expression === current) ||
      (ts.isAsExpression(current.parent) &&
        current.parent.expression === current) ||
      (ts.isSatisfiesExpression(current.parent) &&
        current.parent.expression === current))
  ) {
    current = current.parent;
  }
  return current;
}

function classifyNestedFunction(functionNode) {
  const boundary = unwrapOutward(functionNode);
  const parent = boundary.parent;
  if (ts.isCallExpression(parent) && parent.expression === boundary) {
    return "construction";
  }
  if (ts.isCallExpression(parent) && parent.arguments.includes(boundary)) {
    if (
      ts.isPropertyAccessExpression(parent.expression) &&
      synchronousCollectionMethods.has(parent.expression.name.text)
    ) {
      return "construction";
    }
    return "lexically-nested-ambiguous";
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === boundary) {
    return "inside-stored-function";
  }
  return "lexically-nested-ambiguous";
}

function classifyImmediateUse(node) {
  const parent = node.parent;
  if (ts.isCallExpression(parent) && parent.expression === node) {
    return "construction-call";
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    return "escape";
  }
  return "construction";
}

function analyzeUsage(checker, sourceFile, functionName) {
  const factory = findFunction(sourceFile, functionName);
  if (factory === undefined || factory.body === undefined) {
    throw new Error(`${functionName} was not found.`);
  }
  const parameter = factory.parameters[0];
  if (parameter === undefined || !ts.isIdentifier(parameter.name)) {
    throw new Error(`${functionName} must have one identifier parameter.`);
  }

  const parameterName = parameter.name.text;
  const uses = new Map();
  const diagnostics = new Set();
  const addUse = (property, classification) => {
    const classifications = uses.get(property) ?? new Set();
    classifications.add(classification);
    uses.set(property, classifications);
  };

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer !== undefined &&
      ts.isIdentifier(unwrapExpression(node.initializer)) &&
      unwrapExpression(node.initializer).text === parameterName
    ) {
      diagnostics.add(
        ts.isObjectBindingPattern(node.name) ||
          ts.isArrayBindingPattern(node.name)
          ? "unsupported-destructuring"
          : "unsupported-parameter-alias"
      );
      if ((node.parent.flags & ts.NodeFlags.Let) !== 0) {
        diagnostics.add("unsupported-mutable-alias");
      }
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isPropertyAccessExpression(unwrapExpression(node.initializer)) &&
      optionsPropertyAccess(
        unwrapExpression(node.initializer),
        parameterName
      ) !== undefined
    ) {
      diagnostics.add("unsupported-property-alias");
    }
    if (ts.isElementAccessExpression(node)) {
      let target = unwrapExpression(node.expression);
      while (ts.isPropertyAccessExpression(target)) {
        target = target.expression;
      }
      if (ts.isIdentifier(target) && target.text === parameterName) {
        diagnostics.add("unsupported-computed-access");
      }
    }
    if (ts.isPropertyAccessExpression(node)) {
      if (
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.expression === node
      ) {
        ts.forEachChild(node, visit);
        return;
      }
      const property = optionsPropertyAccess(node, parameterName);
      if (property !== undefined) {
        const nestedFunction = containingNestedFunction(node, factory);
        addUse(
          property,
          nestedFunction === undefined
            ? classifyImmediateUse(node)
            : classifyNestedFunction(nestedFunction)
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(factory.body);

  const sortedDiagnostics = [...diagnostics].sort();
  return {
    coverage:
      sortedDiagnostics.length === 0 &&
      [...uses.values()].every(
        (classifications) => !classifications.has("lexically-nested-ambiguous")
      )
        ? "complete-demonstrated-direct-grammar"
        : "incomplete",
    diagnostics: sortedDiagnostics,
    uses: Object.fromEntries(
      [...uses.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([property, classifications]) => [
          property,
          [...classifications].sort(),
        ])
    ),
  };
}

function analyzeFactory(checker, sourceFile, rxjsObservableSymbol) {
  const factory = findFunction(sourceFile, "IndexingFormConfig");
  if (factory === undefined || factory.body === undefined) {
    throw new Error("IndexingFormConfig was not found.");
  }
  const parameter = factory.parameters[0];
  if (parameter === undefined || !ts.isIdentifier(parameter.name)) {
    throw new Error("Expected one identifier parameter.");
  }
  const parameterType = checker.getTypeAtLocation(parameter);
  const usage = analyzeUsage(checker, sourceFile, "IndexingFormConfig");

  return checker.getPropertiesOfType(parameterType).map((property) => {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    const type = checker.getTypeOfSymbolAtLocation(
      property,
      declaration ?? parameter
    );
    const callSignatures = checker.getSignaturesOfType(
      type,
      ts.SignatureKind.Call
    );
    const observable = observableEmissions(checker, rxjsObservableSymbol, type);
    return {
      name: property.getName(),
      type: checker.typeToString(type, declaration, formatFlags),
      callSignatures: callSignatures.map((signature) =>
        checker.signatureToString(signature, declaration, formatFlags)
      ),
      callReturns: callSignatures.map((signature) => {
        const returnType = checker.getReturnTypeOfSignature(signature);
        return {
          type: checker.typeToString(returnType, declaration, formatFlags),
          observable: observableEmissions(
            checker,
            rxjsObservableSymbol,
            returnType
          ),
        };
      }),
      observable,
      uses: usage.uses[property.getName()] ?? [],
    };
  });
}

function analyzeContextualCallsite(checker, variables) {
  const declaration = variables.get("contextualCallsite");
  const call = declaration?.initializer;
  const argument = ts.isCallExpression(call) ? call.arguments[0] : undefined;
  if (argument === undefined || !ts.isObjectLiteralExpression(argument)) {
    throw new Error("The contextual factory callsite was not found.");
  }
  return argument.properties.flatMap((property) => {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
      return [];
    }
    const contextualType = checker.getContextualType(property.initializer);
    return [
      {
        name: property.name.text,
        contextualType:
          contextualType === undefined
            ? undefined
            : checker.typeToString(
                contextualType,
                property.initializer,
                formatFlags
              ),
      },
    ];
  });
}

function unwrapExpression(expression) {
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

function literalValue(expression) {
  const node = unwrapExpression(expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return { accepted: true, value: node.text };
  }
  if (ts.isNumericLiteral(node)) {
    const value = Number(node.text);
    return Number.isFinite(value) && !Object.is(value, -0)
      ? { accepted: true, value }
      : { accepted: false };
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return { accepted: true, value: true };
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return { accepted: true, value: false };
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return { accepted: true, value: null };
  }
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
    if (node.operator === ts.SyntaxKind.MinusToken) {
      const value = -Number(node.operand.text);
      return Number.isFinite(value) && !Object.is(value, -0)
        ? { accepted: true, value }
        : { accepted: false };
    }
  }
  if (ts.isArrayLiteralExpression(node)) {
    const values = [];
    for (const element of node.elements) {
      if (ts.isSpreadElement(element)) {
        return { accepted: false };
      }
      const parsed = literalValue(element);
      if (!parsed.accepted) {
        return { accepted: false };
      }
      values.push(parsed.value);
    }
    return { accepted: true, value: values };
  }
  if (ts.isObjectLiteralExpression(node)) {
    const entries = [];
    const names = new Set();
    for (const property of node.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name))
      ) {
        return { accepted: false };
      }
      const propertyName = property.name.text;
      if (propertyName === "__proto__") {
        return { accepted: false };
      }
      const parsed = literalValue(property.initializer);
      if (!parsed.accepted) {
        return { accepted: false };
      }
      if (names.has(propertyName)) {
        return { accepted: false };
      }
      names.add(propertyName);
      entries.push([propertyName, parsed.value]);
    }
    return { accepted: true, value: Object.fromEntries(entries) };
  }
  return { accepted: false };
}

function parsedInitializer(expressionText) {
  const sourceFile = ts.createSourceFile(
    "literal-edge.ts",
    `const value = ${expressionText};`,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );
  const statement = sourceFile.statements[0];
  const declaration =
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations[0];
  if (declaration === false || declaration?.initializer === undefined) {
    throw new Error(`Literal edge fixture did not parse: ${expressionText}`);
  }
  return declaration.initializer;
}

export function runLiteralObjectKeyExperiment() {
  return Object.fromEntries(
    [
      ["safeIdentifier", "{ label: 'Safe' }"],
      ["protoIdentifier", "{ __proto__: null }"],
      ["protoString", "{ '__proto__': null }"],
      ["numeric", "{ 1: 'one' }"],
      ["numericExponent", "{ 1e2: 'one-hundred' }"],
      ["numericStringDuplicate", "{ 1: 'one', '1': 'string-one' }"],
    ].map(([name, expressionText]) => [
      name,
      literalValue(parsedInitializer(expressionText)),
    ])
  );
}

function expressionSymbol(checker, expression) {
  const node = unwrapExpression(expression);
  const symbol = checker.getSymbolAtLocation(node);
  return symbol === undefined ? undefined : canonicalSymbol(checker, symbol);
}

function enumerateStaticObservable(checker, rxjs, initializer) {
  const node = unwrapExpression(initializer);
  if (ts.isCallExpression(node)) {
    const symbol = expressionSymbol(checker, node.expression);
    if (symbol === rxjs.get("of")) {
      const emissions = [];
      for (const argument of node.arguments) {
        const parsed = literalValue(argument);
        if (!parsed.accepted) {
          return { status: "unknown", reason: "non-literal-of-argument" };
        }
        emissions.push(parsed.value);
      }
      return { status: "finite-complete", source: "rxjs.of", emissions };
    }
    if (symbol === rxjs.get("from")) {
      if (node.arguments.length !== 1) {
        return { status: "unknown", reason: "unsupported-from-arguments" };
      }
      const input = unwrapExpression(node.arguments[0]);
      if (!ts.isArrayLiteralExpression(input)) {
        return { status: "unknown", reason: "from-input-not-literal-array" };
      }
      const parsed = literalValue(input);
      if (!parsed.accepted) {
        return { status: "unknown", reason: "from-array-not-json-literal" };
      }
      return {
        status: "finite-complete",
        source: "rxjs.from-literal-array",
        emissions: parsed.value,
      };
    }
    return { status: "unknown", reason: "operator-or-call-not-allowlisted" };
  }
  if (ts.isNewExpression(node)) {
    const symbol = expressionSymbol(checker, node.expression);
    if (symbol === rxjs.get("BehaviorSubject")) {
      const initial = node.arguments?.[0];
      if (initial === undefined) {
        return { status: "unknown", reason: "missing-behavior-initial-value" };
      }
      const parsed = literalValue(initial);
      return parsed.accepted
        ? {
            status: "initial-only",
            source: "rxjs.BehaviorSubject",
            initialValue: parsed.value,
          }
        : { status: "unknown", reason: "non-literal-behavior-initial-value" };
    }
    return { status: "unknown", reason: "constructor-not-allowlisted" };
  }
  return { status: "unknown", reason: "source-expression-not-allowlisted" };
}

export function runStaticExperiment() {
  const { checker, sourceFile } = createExperimentProgram();
  const variables = exportedVariables(sourceFile);
  const rxjs = rxjsExports(checker, sourceFile);
  const observableSymbol = rxjs.get("Observable");
  if (observableSymbol === undefined) {
    throw new Error("RxJS Observable export was not resolved.");
  }

  const observableNames = [
    "aliased$",
    "subject$",
    "subclass$",
    "union$",
    "nullable$",
    "literalChoiceArray$",
    "unknown$",
    "any$",
    "objectNestedAny$",
    "observableLike",
    "genericResult$",
    "mapped$",
    "directOf$",
    "barrelOf$",
  ];
  const observableTypes = Object.fromEntries(
    observableNames.map((name) => {
      const declaration = variables.get(name);
      if (declaration === undefined) {
        throw new Error(`Missing Observable fixture: ${name}`);
      }
      return [
        name,
        observableEmissions(
          checker,
          observableSymbol,
          checker.getTypeAtLocation(declaration.name)
        ),
      ];
    })
  );

  const staticNames = [
    "directOf$",
    "barrelOf$",
    "wholeArrayOf$",
    "fromTuple$",
    "identifierOf$",
    "promiseFrom$",
    "iterableFrom$",
    "scheduledOf$",
    "subject$",
    "nonJsonNumberOf$",
    "protoKeyOf$",
    "numericKeyOf$",
    "numericExponentKeyOf$",
    "mappedFinite$",
    "initialBehavior$",
    "opaqueProducer$",
    "sameSpellingButNotRxjs",
  ];
  const staticSources = Object.fromEntries(
    staticNames.map((name) => {
      const declaration = variables.get(name);
      if (declaration?.initializer === undefined) {
        throw new Error(`Missing static-source fixture: ${name}`);
      }
      return [
        name,
        enumerateStaticObservable(checker, rxjs, declaration.initializer),
      ];
    })
  );

  return {
    typescriptVersion: ts.version,
    factoryInputs: analyzeFactory(checker, sourceFile, observableSymbol),
    factoryUsage: analyzeUsage(checker, sourceFile, "IndexingFormConfig"),
    adversarialUsage: analyzeUsage(checker, sourceFile, "UsageBoundaryFixture"),
    contextualCallsite: analyzeContextualCallsite(checker, variables),
    observableTypes,
    staticSources,
  };
}

function observeWithLimit(source, timeoutMilliseconds = 20) {
  return new Promise((resolveObservation) => {
    const observation = {
      values: [],
      completed: false,
      error: undefined,
      timedOut: false,
    };
    let settled = false;
    let subscription;
    const settle = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolveObservation(observation);
    };
    const timer = setTimeout(() => {
      observation.timedOut = true;
      subscription?.unsubscribe();
      settle();
    }, timeoutMilliseconds);
    subscription = source.subscribe({
      next: (value) => observation.values.push(value),
      error: (error) => {
        observation.error =
          error instanceof Error ? error.message : String(error);
        settle();
      },
      complete: () => {
        observation.completed = true;
        settle();
      },
    });
  });
}

export async function runRuntimeExperiment() {
  const { BehaviorSubject, NEVER, Observable, delay, of, throwError } =
    requireFromFormlyApp("rxjs");

  let coldExecutions = 0;
  const cold$ = new Observable((subscriber) => {
    coldExecutions += 1;
    subscriber.next("cold-value");
    subscriber.complete();
  });
  const coldBeforeSubscribe = coldExecutions;
  const coldObservation = await observeWithLimit(cold$);

  const behavior$ = new BehaviorSubject("declared-initial");
  behavior$.next("changed-before-subscribe");
  const behaviorObservation = await observeWithLimit(behavior$);

  return {
    cold: {
      executionsBeforeSubscribe: coldBeforeSubscribe,
      executionsAfterSubscribe: coldExecutions,
      observation: coldObservation,
    },
    behavior: behaviorObservation,
    finiteSynchronous: await observeWithLimit(of("one", "two")),
    finiteAsynchronous: await observeWithLimit(of("later").pipe(delay(0))),
    error: await observeWithLimit(
      throwError(() => new Error("producer-failed"))
    ),
    never: await observeWithLimit(NEVER),
  };
}
