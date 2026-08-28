import { Buffer } from 'node:buffer';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import ts from 'typescript';

export const REQUIRED_CHECK_IDS = Object.freeze([
  'bundle-source-isolation',
  'cross-program-ordering-overlap',
  'declaration-source-redirects',
  'lazy-feature-topology',
  'leaf-tsconfig-selection',
  'privacy-disclosure',
  'project-references',
  'scale-budgets',
  'symbol-conventions',
]);

const CHECK_STATUSES = new Set(['fail', 'missing', 'pass']);
const DISALLOWED_RETAINED_FIELDS = new Set([
  'absolutePath',
  'callArguments',
  'credentials',
  'environment',
  'hostPath',
  'observedUrls',
  'remoteUrl',
  'routeTemplates',
  'runtimeValues',
  'sourcePath',
  'sourceText',
  'username',
]);

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort(compareCodeUnits);
}

function normalizeForCanonicalJson(value) {
  if (Array.isArray(value)) {
    const normalized = value.map((entry) => normalizeForCanonicalJson(entry));
    return normalized.sort((left, right) => {
      if (
        left !== null &&
        right !== null &&
        typeof left === 'object' &&
        typeof right === 'object' &&
        typeof left.id === 'string' &&
        typeof right.id === 'string'
      ) {
        return compareCodeUnits(left.id, right.id);
      }
      return compareCodeUnits(JSON.stringify(left), JSON.stringify(right));
    });
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareCodeUnits)
        .map((key) => [key, normalizeForCanonicalJson(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(normalizeForCanonicalJson(value), null, 2)}\n`;
}

function normalizedChecks(checks) {
  const byId = new Map();
  for (const check of checks) {
    if (
      check === null ||
      typeof check !== 'object' ||
      typeof check.id !== 'string' ||
      !CHECK_STATUSES.has(check.status) ||
      !Array.isArray(check.reasons) ||
      !check.reasons.every((reason) => typeof reason === 'string')
    ) {
      throw new TypeError('Every LIN-0 check must have an id, status, and reason array.');
    }
    if (byId.has(check.id)) {
      throw new TypeError(`Duplicate LIN-0 check id: ${check.id}`);
    }
    byId.set(check.id, {
      ...check,
      reasons: uniqueSorted(check.reasons),
    });
  }
  return byId;
}

export function decideGate({ slice, checks }) {
  if (
    slice === null ||
    typeof slice !== 'object' ||
    (slice.kind !== 'public-anchor' &&
      slice.kind !== 'representative-workplace') ||
    typeof slice.sanitized !== 'boolean'
  ) {
    throw new TypeError('LIN-0 slice must declare kind and sanitized status.');
  }

  const byId = normalizedChecks(checks);
  const failedChecks = uniqueSorted(
    REQUIRED_CHECK_IDS.filter((id) => byId.get(id)?.status === 'fail'),
  );
  const missingChecks = uniqueSorted(
    REQUIRED_CHECK_IDS.filter((id) => {
      const status = byId.get(id)?.status;
      return status === undefined || status === 'missing';
    }),
  );
  const failureReasons = uniqueSorted(
    failedChecks.flatMap((id) => {
      const reasons = byId.get(id)?.reasons ?? [];
      return reasons.length === 0 ? [`CHECK_FAILED:${id}`] : reasons;
    }),
  );

  if (slice.kind !== 'representative-workplace') {
    return {
      status: 'inconclusive',
      failedChecks,
      missingChecks,
      reasons: uniqueSorted([
        'REPRESENTATIVE_WORKPLACE_SLICE_REQUIRED',
        ...failureReasons,
      ]),
    };
  }
  if (!slice.sanitized) {
    return {
      status: 'inconclusive',
      failedChecks,
      missingChecks,
      reasons: uniqueSorted([
        'SANITIZED_REPRESENTATIVE_SLICE_REQUIRED',
        ...failureReasons,
      ]),
    };
  }
  if (failedChecks.length > 0) {
    return {
      status: 'no-go',
      failedChecks,
      missingChecks,
      reasons: failureReasons,
    };
  }
  if (missingChecks.length > 0) {
    return {
      status: 'inconclusive',
      failedChecks,
      missingChecks,
      reasons: ['REQUIRED_EVIDENCE_MISSING'],
    };
  }
  return {
    status: 'go',
    failedChecks: [],
    missingChecks: [],
    reasons: [],
  };
}

function walkObject(value, visit, path = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkObject(entry, visit, [...path, index]));
    return;
  }
  if (value === null || typeof value !== 'object') {
    visit(value, path);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    visit(child, [...path, key], key);
    walkObject(child, visit, [...path, key]);
  }
}

function retainedFieldPath(path) {
  return path.map(String).join('.');
}

function looksLikeAbsolutePath(value) {
  return (
    isAbsolute(value) ||
    /^[A-Za-z]:[\\/]/u.test(value) ||
    /^\\\\/u.test(value) ||
    value.startsWith('file://')
  );
}

export function auditRetainedReport(report) {
  const disallowedFields = [];
  const absolutePaths = [];
  walkObject(report, (value, path, key) => {
    if (key !== undefined && DISALLOWED_RETAINED_FIELDS.has(key)) {
      disallowedFields.push(
        `DISALLOWED_RETAINED_FIELD:${retainedFieldPath(path)}`,
      );
    }
    if (typeof value === 'string' && looksLikeAbsolutePath(value)) {
      absolutePaths.push(`ABSOLUTE_PATH_RETAINED:${retainedFieldPath(path)}`);
    }
  });
  return [
    ...uniqueSorted(disallowedFields),
    ...uniqueSorted(absolutePaths),
  ];
}

const STABLE_ID = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/u;
const REQUIRED_IMPORT_CONVENTIONS = [
  'aliased-import',
  'barrel',
  'namespace-import',
  'path-alias',
];
const REQUIRED_DECLARATION_KINDS = ['callable-const', 'class', 'function'];
const ALLOWED_PROGRAM_PURPOSES = new Set([
  'anchor',
  'application',
  'library',
  'other',
  'test',
  'tooling',
]);
const REQUIRED_BUNDLE_PROBE_KINDS = [
  'root-anchor',
  'source-location',
  'usage-annotation',
];
const CONVENTION_COUNT_KEYS = [
  'directExportCallableConst',
  'directExportClass',
  'directExportFunction',
  'exportListOnly',
  'inlineOrWrapper',
  'other',
];

function requireStableId(value, label) {
  if (typeof value !== 'string' || !STABLE_ID.test(value)) {
    throw new TypeError(`${label} must be a lowercase stable id.`);
  }
  return value;
}

export function requireUniqueIds(entries, label) {
  const ids = new Set();
  for (const entry of entries) {
    const id = requireStableId(entry?.id, `${label} id`);
    if (ids.has(id)) throw new TypeError(`Duplicate ${label} id: ${id}`);
    ids.add(id);
  }
}

export function requireNonEmptyStrings(values, label) {
  if (
    !Array.isArray(values) ||
    values.length === 0 ||
    !values.every((value) => typeof value === 'string' && value.length > 0)
  ) {
    throw new TypeError(`${label} must contain non-empty strings.`);
  }
}

function requireRelativeInputPath(value, label) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    isAbsolute(value) ||
    value.includes('\\') ||
    value.split('/').some((segment) => segment === '' || segment === '..')
  ) {
    throw new TypeError(`${label} must be a contained relative POSIX path.`);
  }
  return value;
}

function isContained(root, candidate) {
  const relation = relative(root, candidate);
  return relation === '' || (!relation.startsWith(`..${sep}`) && relation !== '..');
}

async function resolveContainedPath(root, inputPath, label) {
  const relativePath = requireRelativeInputPath(inputPath, label);
  const candidate = await realpath(resolve(root, relativePath));
  if (!isContained(root, candidate)) {
    throw new TypeError(`${label} resolves outside the declared slice root.`);
  }
  return candidate;
}

function sourceFileWithin(program, fileName) {
  return (
    program.getSourceFile(fileName) ??
    program
      .getSourceFiles()
      .find((sourceFile) => resolve(sourceFile.fileName) === resolve(fileName))
  );
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function calleeNode(expression) {
  return ts.isPropertyAccessExpression(expression) ? expression.name : expression;
}

function canonicalSymbol(checker, node) {
  let symbol = checker.getSymbolAtLocation(node);
  const seen = new Set();
  while (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    if (seen.has(symbol)) return undefined;
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol;
}

function declarationKind(declaration) {
  if (ts.isFunctionDeclaration(declaration)) return 'function';
  if (ts.isClassDeclaration(declaration)) return 'class';
  if (
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer !== undefined &&
    (ts.isArrowFunction(declaration.initializer) ||
      ts.isFunctionExpression(declaration.initializer))
  ) {
    return 'callable-const';
  }
  return 'other';
}

function declarationName(declaration, symbol) {
  if (
    (ts.isFunctionDeclaration(declaration) ||
      ts.isClassDeclaration(declaration) ||
      ts.isVariableDeclaration(declaration)) &&
    declaration.name !== undefined &&
    ts.isIdentifier(declaration.name)
  ) {
    return declaration.name.text;
  }
  return symbol.getName();
}

function importContext(checker, expression, declaration, compilerOptions) {
  const conventions = new Set();
  let aliasDeclaration;
  let moduleSpecifier;

  if (ts.isPropertyAccessExpression(expression)) {
    const namespaceSymbol = checker.getSymbolAtLocation(expression.expression);
    aliasDeclaration = namespaceSymbol?.declarations?.find(ts.isNamespaceImport);
    if (aliasDeclaration !== undefined) conventions.add('namespace-import');
  } else {
    const aliasSymbol = checker.getSymbolAtLocation(expression);
    aliasDeclaration = aliasSymbol?.declarations?.find(
      (candidate) =>
        ts.isImportSpecifier(candidate) ||
        ts.isImportClause(candidate) ||
        ts.isNamespaceImport(candidate),
    );
    if (
      aliasDeclaration !== undefined &&
      ts.isImportSpecifier(aliasDeclaration) &&
      aliasDeclaration.propertyName !== undefined
    ) {
      conventions.add('aliased-import');
    }
  }

  let current = aliasDeclaration;
  while (current !== undefined && !ts.isImportDeclaration(current)) {
    current = current.parent;
  }
  if (
    current !== undefined &&
    ts.isImportDeclaration(current) &&
    ts.isStringLiteral(current.moduleSpecifier)
  ) {
    moduleSpecifier = current.moduleSpecifier;
    const specifier = moduleSpecifier.text;
    if (specifier.startsWith('.')) {
      conventions.add('relative-import');
    } else {
      const pathKeys = Object.keys(compilerOptions.paths ?? {});
      if (
        pathKeys.some((pattern) => {
          const [prefix, suffix = ''] = pattern.split('*');
          return specifier.startsWith(prefix) && specifier.endsWith(suffix);
        })
      ) {
        conventions.add('path-alias');
      }
    }
    const moduleSymbol = checker.getSymbolAtLocation(moduleSpecifier);
    const moduleDeclaration = moduleSymbol?.declarations?.[0];
    if (
      moduleDeclaration !== undefined &&
      resolve(moduleDeclaration.getSourceFile().fileName) !==
        resolve(declaration.getSourceFile().fileName)
    ) {
      conventions.add('barrel');
    }
  }

  return { conventions: [...conventions].sort(compareCodeUnits) };
}

function invocationCandidates(sourceFile, invocation) {
  const matches = [];
  walk(sourceFile, (node) => {
    const expectedKind = invocation.kind === 'construct' ? 'construct' : 'call';
    const actualKind = ts.isNewExpression(node)
      ? 'construct'
      : ts.isCallExpression(node)
        ? 'call'
        : undefined;
    if (
      actualKind === expectedKind &&
      node.expression.getText(sourceFile) === invocation.callee
    ) {
      matches.push(node);
    }
  });
  return matches;
}

function referenceSourceFiles(parsedConfig) {
  const sources = new Set();
  for (const reference of parsedConfig.projectReferences ?? []) {
    const referenced = ts.getParsedCommandLineOfConfigFile(reference.path, {}, ts.sys);
    for (const fileName of referenced?.fileNames ?? []) sources.add(resolve(fileName));
  }
  return sources;
}

function resolutionMechanism(declaration, referencedSources, sourceRedirectEnabled) {
  const fileName = resolve(declaration.getSourceFile().fileName);
  if (fileName.endsWith('.d.ts')) return 'declaration-output';
  if (sourceRedirectEnabled && referencedSources.has(fileName)) {
    return 'source-redirect';
  }
  return 'source';
}

function privateDeclarationIdentity(symbol, declaration) {
  return [
    resolve(declaration.getSourceFile().fileName),
    declaration.pos,
    declaration.end,
    declarationKind(declaration),
    symbol.getName(),
  ].join(':');
}

async function inspectSymbolProbe(probe, state, root) {
  requireStableId(probe.id, 'symbol probe id');
  requireStableId(probe.observationId, 'symbol observation id');
  if (probe.expected?.resolution !== 'exact') {
    throw new TypeError(`symbol probe ${probe.id} must expect exact resolution.`);
  }
  if (probe.invocation?.kind !== 'call' && probe.invocation?.kind !== 'construct') {
    throw new TypeError(`symbol probe ${probe.id} invocation kind is unsupported.`);
  }
  if (typeof probe.invocation.callee !== 'string' || probe.invocation.callee.length === 0) {
    throw new TypeError(`symbol probe ${probe.id} callee must be non-empty.`);
  }
  if (!REQUIRED_DECLARATION_KINDS.includes(probe.expected.declaration?.kind)) {
    throw new TypeError(`symbol probe ${probe.id} declaration kind is unsupported.`);
  }
  for (const convention of probe.expected.conventions ?? []) {
    if (
      ![
        'aliased-import',
        'barrel',
        'namespace-import',
        'path-alias',
        'relative-import',
      ].includes(convention)
    ) {
      throw new TypeError(`symbol probe ${probe.id} convention is unsupported.`);
    }
  }
  const portableAnchorId =
    probe.expected.portableAnchorId === undefined
      ? undefined
      : requireStableId(
          probe.expected.portableAnchorId,
          `symbol probe ${probe.id} portable anchor id`,
        );
  const sourcePath = await resolveContainedPath(
    root,
    probe.invocation.file,
    `symbol probe ${probe.id} invocation file`,
  );
  const sourceFile = sourceFileWithin(state.program, sourcePath);
  if (sourceFile === undefined) {
    return {
      retained: {
        id: probe.id,
        observationId: probe.observationId,
        outcome: 'unresolved',
        reasons: ['INVOCATION_FILE_NOT_IN_PROGRAM'],
      },
    };
  }
  const matches = invocationCandidates(sourceFile, probe.invocation);
  const occurrence = probe.invocation.occurrence;
  if (!Number.isSafeInteger(occurrence) || occurrence < 1) {
    throw new TypeError(`symbol probe ${probe.id} occurrence must be positive.`);
  }
  const invocation = matches[occurrence - 1];
  if (invocation === undefined) {
    return {
      retained: {
        id: probe.id,
        observationId: probe.observationId,
        outcome: 'unresolved',
        reasons: ['INVOCATION_NOT_FOUND'],
      },
    };
  }
  const symbol = canonicalSymbol(state.checker, calleeNode(invocation.expression));
  const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  if (symbol === undefined || declaration === undefined) {
    return {
      retained: {
        id: probe.id,
        observationId: probe.observationId,
        outcome: 'unresolved',
        reasons: ['SYMBOL_UNRESOLVED'],
      },
    };
  }

  const expectedDeclaration = probe.expected.declaration;
  const expectedPath = await resolveContainedPath(
    root,
    expectedDeclaration.file,
    `symbol probe ${probe.id} expected declaration file`,
  );
  const actualKind = declarationKind(declaration);
  const context = importContext(
    state.checker,
    invocation.expression,
    declaration,
    state.parsed.options,
  );
  const mechanism = resolutionMechanism(
    declaration,
    state.referencedSources,
    state.input.useSourceOfProjectReferenceRedirect === true,
  );
  const reasons = [];
  if (
    resolve(declaration.getSourceFile().fileName) !== expectedPath ||
    declarationName(declaration, symbol) !== expectedDeclaration.name ||
    actualKind !== expectedDeclaration.kind
  ) {
    reasons.push('WRONG_UNIQUE_SYMBOL_MATCH');
  }
  for (const convention of probe.expected.conventions ?? []) {
    if (!context.conventions.includes(convention)) {
      reasons.push('EXPECTED_CONVENTION_NOT_OBSERVED');
    }
  }

  return {
    retained: {
      id: probe.id,
      observationId: probe.observationId,
      outcome: reasons.length === 0 ? 'exact' : 'mismatch',
      conventions: context.conventions,
      declarationKind: actualKind,
      resolutionMechanism: mechanism,
      reasons: uniqueSorted(reasons),
    },
    declarationIdentity: privateDeclarationIdentity(symbol, declaration),
    callsiteIdentity: [
      sourcePath,
      invocation.pos,
      invocation.end,
      probe.invocation.kind,
    ].join(':'),
    portableAnchorId,
    programId: state.id,
  };
}

function isIgnoredSemanticFile(fileName) {
  return [
    `${sep}node_modules${sep}`,
    `${sep}dist${sep}`,
    `${sep}.angular${sep}`,
    `${sep}.nx${sep}`,
  ].some((segment) => fileName.includes(segment));
}

function containsLiteralImport(node) {
  let found = false;
  walk(node, (candidate) => {
    if (
      ts.isCallExpression(candidate) &&
      candidate.expression.kind === ts.SyntaxKind.ImportKeyword &&
      candidate.arguments.length === 1 &&
      ts.isStringLiteral(candidate.arguments[0])
    ) {
      found = true;
    }
  });
  return found;
}

function routeArray(checker, node) {
  if (ts.isArrayLiteralExpression(node)) return node;
  if (!ts.isIdentifier(node)) return undefined;
  const symbol = canonicalSymbol(checker, node);
  const declaration = symbol?.valueDeclaration;
  return declaration !== undefined &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer !== undefined &&
    ts.isArrayLiteralExpression(declaration.initializer)
    ? declaration.initializer
    : undefined;
}

function analyzeRouteArray(checker, array, counts, visited) {
  const identity = `${array.getSourceFile().fileName}:${array.pos}:${array.end}`;
  if (visited.has(identity)) return;
  visited.add(identity);
  for (const element of array.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    for (const property of element.properties) {
      if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
        continue;
      }
      if (
        property.name.text === 'loadChildren' ||
        property.name.text === 'loadComponent'
      ) {
        if (containsLiteralImport(property.initializer)) {
          counts.literalLazyRouteCount += 1;
        } else {
          counts.dynamicLazyRouteCount += 1;
        }
      }
      if (property.name.text === 'children') {
        const children = routeArray(checker, property.initializer);
        if (children !== undefined) {
          analyzeRouteArray(checker, children, counts, visited);
        }
      }
    }
  }
}

async function scanLazyRoutes(programStates, routeScan, root) {
  const files = new Map();
  const routeProgramIds = new Set(routeScan?.programIds ?? []);
  for (const programId of routeProgramIds) {
    const state = programStates.get(programId);
    if (state === undefined) {
      throw new TypeError(`Unknown route-scan program id: ${programId}`);
    }
    for (const sourceFile of state.program.getSourceFiles()) {
      const fileName = resolve(sourceFile.fileName);
      if (
        !sourceFile.isDeclarationFile &&
        isContained(root, fileName) &&
        !isIgnoredSemanticFile(fileName)
      ) {
        files.set(fileName, sourceFile);
      }
    }
  }
  const counts = {
    dynamicLazyRouteCount: 0,
    literalLazyRouteCount: 0,
    registrationExactCount: 0,
    registrationMismatchCount: 0,
    registrationUnresolvedCount: 0,
  };
  const visited = new Set();
  const registrations = routeScan?.registrations ?? [];
  requireUniqueIds(registrations, 'route registration');
  for (const registration of registrations) {
    requireStableId(registration.id, 'route registration id');
    if (!routeProgramIds.has(registration.programId)) {
      throw new TypeError(
        `route registration ${registration.id} is outside the declared scan scope.`,
      );
    }
    const state = programStates.get(registration.programId);
    if (state === undefined) {
      throw new TypeError(`Unknown route registration program id: ${registration.programId}`);
    }
    const fileName = await resolveContainedPath(
      root,
      registration.file,
      `route registration ${registration.id} file`,
    );
    const sourceFile = sourceFileWithin(state.program, fileName);
    if (sourceFile === undefined) {
      counts.registrationUnresolvedCount += 1;
      continue;
    }
    const matches = invocationCandidates(sourceFile, {
      callee: registration.callee,
      kind: 'call',
    });
    const occurrence = registration.occurrence;
    if (!Number.isSafeInteger(occurrence) || occurrence < 1) {
      throw new TypeError(`route registration ${registration.id} occurrence is invalid.`);
    }
    const call = matches[occurrence - 1];
    if (call === undefined || !ts.isCallExpression(call)) {
      counts.registrationUnresolvedCount += 1;
      continue;
    }
    const symbol = canonicalSymbol(state.checker, calleeNode(call.expression));
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    const expectedPath = await resolveContainedPath(
      root,
      registration.expectedDeclaration.file,
      `route registration ${registration.id} helper declaration`,
    );
    if (
      symbol === undefined ||
      declaration === undefined ||
      resolve(declaration.getSourceFile().fileName) !== expectedPath ||
      declarationName(declaration, symbol) !== registration.expectedDeclaration.name
    ) {
      counts.registrationMismatchCount += 1;
      continue;
    }
    const array = call.arguments[0] === undefined
      ? undefined
      : routeArray(state.checker, call.arguments[0]);
    if (array === undefined) {
      counts.registrationUnresolvedCount += 1;
      continue;
    }
    counts.registrationExactCount += 1;
    analyzeRouteArray(state.checker, array, counts, visited);
  }
  return {
    complete: routeScan?.complete === true,
    scannedFileCount: files.size,
    scannedProgramCount: routeProgramIds.size,
    ...counts,
  };
}

function sumConventionInventory(inventory) {
  const counts = inventory?.counts ?? {};
  return CONVENTION_COUNT_KEYS.reduce((total, key) => {
    const count = counts[key];
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new TypeError(`convention inventory count ${key} is invalid.`);
    }
    return total + count;
  }, 0);
}

function inspectOverlapCases(cases, privateProbeResults) {
  const overlapCases = cases ?? [];
  requireUniqueIds(overlapCases, 'overlap case');
  return overlapCases.map((overlap) => {
    requireStableId(overlap.id, 'overlap case id');
    if (overlap.expected !== 'deduplicated' && overlap.expected !== 'conflict') {
      throw new TypeError(`overlap case ${overlap.id} outcome is unsupported.`);
    }
    const observations = overlap.probeIds.map((id) => privateProbeResults.get(id));
    const exact = observations.every(
      (observation) => observation?.retained.outcome === 'exact',
    );
    const programCount = new Set(
      observations.map((observation) => observation?.programId),
    ).size;
    const callsites = new Set(
      observations.map((observation) => observation?.callsiteIdentity),
    );
    const declarationIdentities = new Set(
      observations.map((observation) => observation?.declarationIdentity),
    );
    const observationIds = new Set(
      observations.map((observation) => observation?.retained.observationId),
    );
    const actual =
      exact && programCount >= 2 && callsites.size === 1 && observationIds.size === 1
        ? declarationIdentities.size === 1
          ? 'deduplicated'
          : 'conflict'
        : 'unresolved';
    return {
      id: overlap.id,
      expected: overlap.expected,
      observed: actual,
      outcome:
        actual === 'unresolved'
          ? 'unresolved'
          : actual === overlap.expected
            ? 'exact'
            : 'mismatch',
      contributingProgramCount: programCount,
    };
  });
}

function inspectCrossProgramJoins(cases, privateProbeResults, programStates) {
  const joins = cases ?? [];
  requireUniqueIds(joins, 'cross-program join');
  return joins.map((join) => {
    requireStableId(join.id, 'cross-program join id');
    const observations = join.probeIds.map((id) => privateProbeResults.get(id));
    const mechanisms = uniqueSorted(
      observations
        .map((observation) => observation?.retained.resolutionMechanism)
        .filter((value) => value !== undefined),
    );
    const programIds = uniqueSorted(
      observations
        .map((observation) => observation?.programId)
        .filter((value) => value !== undefined),
    );
    for (const mechanism of join.requiredMechanisms ?? []) {
      if (mechanism !== 'declaration-output' && mechanism !== 'source-redirect') {
        throw new TypeError(`cross-program join ${join.id} mechanism is unsupported.`);
      }
    }
    const portableAnchorIds = new Set(
      observations.map((observation) => observation?.portableAnchorId),
    );
    const hasUnresolvedObservation = observations.some(
      (observation) =>
        observation === undefined || observation.retained.outcome === 'unresolved',
    );
    const hasMismatchedObservation = observations.some(
      (observation) => observation?.retained.outcome === 'mismatch',
    );
    const exact =
      programIds.length >= 2 &&
      portableAnchorIds.size === 1 &&
      !portableAnchorIds.has(undefined) &&
      observations.every(
        (observation) => observation?.retained.outcome === 'exact',
      ) &&
      (join.requiredMechanisms ?? []).every((mechanism) =>
        mechanisms.includes(mechanism),
      ) &&
      programIds.some(
        (programId) =>
          (programStates.get(programId)?.parsed.projectReferences?.length ?? 0) > 0,
      );
    return {
      id: join.id,
      contributingProgramCount: programIds.length,
      mechanisms,
      outcome: hasUnresolvedObservation
        ? 'unresolved'
        : exact && !hasMismatchedObservation
          ? 'exact'
          : 'mismatch',
    };
  });
}

async function inspectBundle(bundle, root) {
  if (bundle === undefined) return undefined;
  const contents = [];
  for (const [index, file] of bundle.files.entries()) {
    const path = await resolveContainedPath(root, file, `bundle file ${index}`);
    contents.push(await readFile(path, 'utf8'));
  }
  const forbiddenProbes = bundle.forbiddenProbes ?? [];
  requireUniqueIds(forbiddenProbes, 'bundle probe');
  const probes = forbiddenProbes.map((probe) => {
    if (!REQUIRED_BUNDLE_PROBE_KINDS.includes(probe.kind)) {
      throw new TypeError(`bundle probe ${probe.id} kind is unsupported.`);
    }
    requireNonEmptyStrings(probe.literals, `bundle probe ${probe.id} literals`);
    return {
      id: requireStableId(probe.id, 'bundle probe id'),
      kind: probe.kind,
      matchCount: probe.literals.reduce(
      (total, literal) =>
        total +
        contents.reduce(
          (fileTotal, contents_) =>
            fileTotal + contents_.split(literal).length - 1,
          0,
        ),
      0,
    ),
    };
  });
  return {
    scannedByteCount: contents.reduce(
      (total, contents_) => total + Buffer.byteLength(contents_),
      0,
    ),
    scannedFileCount: contents.length,
    runtimeCycleCheckPassed: bundle.runtimeCycleCheckPassed === true,
    probes,
  };
}

function inspectPerformance(performance) {
  if (performance === undefined) return undefined;
  const metricNames = [
    'artifactBytes',
    'coldMs',
    'incrementalMs',
    'peakRssMiB',
  ];
  const samples = performance.samples ?? [];
  if (performance.protocol !== 'lin-0-program-probe-v1') {
    throw new TypeError('LIN-0 performance protocol is unsupported.');
  }
  if (!Array.isArray(samples)) {
    throw new TypeError('LIN-0 performance samples must be an array.');
  }
  requireUniqueIds(samples, 'performance sample');
  for (const metric of metricNames) {
    const value = performance.budgets?.[metric];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`LIN-0 performance budget ${metric} is invalid.`);
    }
  }
  for (const sample of samples) {
    requireStableId(sample.id, 'performance sample id');
    for (const metric of metricNames) {
      const value = sample[metric];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new TypeError(`performance sample ${sample.id} metric is invalid.`);
      }
    }
  }
  const retainedSamples = samples.map((sample) => ({
    id: sample.id,
    artifactBytes: sample.artifactBytes,
    coldMs: sample.coldMs,
    incrementalMs: sample.incrementalMs,
    peakRssMiB: sample.peakRssMiB,
  }));
  const budgets = Object.fromEntries(
    metricNames.map((metric) => [metric, performance.budgets?.[metric]]),
  );
  const maxima = Object.fromEntries(
    metricNames.map((metric) => [
      metric,
      retainedSamples.length === 0
        ? undefined
        : Math.max(...retainedSamples.map((sample) => sample[metric])),
    ]),
  );
  return {
    protocol: performance.protocol,
    budgetsApproved: performance.budgetsApproved === true,
    budgets,
    samples: retainedSamples,
    sampleCount: retainedSamples.length,
    maxima,
  };
}

function gateCheck(id, status, reasons = [], evidence = {}) {
  return { id, status, reasons: uniqueSorted(reasons), evidence };
}

export function deriveGateChecks(input, measurements) {
  const programs = measurements.programs;
  const leafPrograms = programs.filter((program) => program.leaf);
  const diagnosticCount = programs.reduce(
    (total, program) => total + program.diagnosticCount,
    0,
  );
  const leafSelectionPass =
    input.programSelection?.inventoryComplete === true &&
    leafPrograms.length >= 3 &&
    measurements.programTopology.distinctLeafConfigCount >= 3 &&
    measurements.programTopology.distinctLeafProjectCount >= 3 &&
    diagnosticCount === 0;
  const leafSelectionReasons = [];
  if (input.programSelection?.inventoryComplete !== true) {
    leafSelectionReasons.push('LEAF_TSCONFIG_INVENTORY_NOT_COMPLETE');
  }
  if (leafPrograms.length < 3) leafSelectionReasons.push('THREE_LEAF_PROGRAMS_REQUIRED');
  if (measurements.programTopology.distinctLeafConfigCount < 3) {
    leafSelectionReasons.push('THREE_DISTINCT_LEAF_CONFIGS_REQUIRED');
  }
  if (measurements.programTopology.distinctLeafProjectCount < 3) {
    leafSelectionReasons.push('THREE_DISTINCT_LEAF_PROJECTS_REQUIRED');
  }
  if (diagnosticCount > 0) {
    leafSelectionReasons.push('PROGRAM_DIAGNOSTICS_PREVENT_COMPLETE_COVERAGE');
  }

  const referenceCount = programs.reduce(
    (total, program) => total + program.projectReferenceCount,
    0,
  );
  const probeFailures = measurements.symbolProbes.filter(
    (probe) => probe.outcome === 'mismatch',
  );
  const unresolvedProbes = measurements.symbolProbes.filter(
    (probe) => probe.outcome === 'unresolved',
  );
  const joinFailures = measurements.crossProgramJoins.filter(
    (join) => join.outcome === 'mismatch',
  );
  const exactJoins = measurements.crossProgramJoins.filter(
    (join) => join.outcome === 'exact',
  );
  const declarationCoverage =
    measurements.crossProgramJoins.some(
      (join) =>
        join.outcome === 'exact' &&
        join.mechanisms.includes('declaration-output') &&
        join.mechanisms.includes('source-redirect'),
    );

  const exactProbes = measurements.symbolProbes.filter(
    (probe) => probe.outcome === 'exact',
  );
  const conventions = new Set(exactProbes.flatMap((probe) => probe.conventions));
  const declarationKinds = new Set(
    exactProbes.map((probe) => probe.declarationKind),
  );
  const inventory = measurements.conventionInventory;
  const conventionCoverage =
    inventory.complete &&
    inventory.countedRootCount === inventory.enumeratedRootCount &&
    REQUIRED_IMPORT_CONVENTIONS.every((value) => conventions.has(value)) &&
    REQUIRED_DECLARATION_KINDS.every((value) => declarationKinds.has(value));

  const overlapFailures = measurements.overlapCases.filter(
    (overlap) => overlap.outcome === 'mismatch',
  );
  const overlapOutcomes = new Set(
    measurements.overlapCases
      .filter((overlap) => overlap.outcome === 'exact')
      .map((overlap) => overlap.observed),
  );
  const overlapCoverage =
    overlapOutcomes.has('deduplicated') && overlapOutcomes.has('conflict');

  const privacyPass =
    input.privacy?.disclosureMode === 'module-only' &&
    input.privacy.retainCallArguments === false &&
    input.privacy.retainEnvironment === false &&
    input.privacy.retainObservedUrls === false &&
    input.privacy.retainRouteTemplates === false &&
    input.privacy.retainSourceText === false;

  const bundle = measurements.bundle;
  const bundleKinds = new Set(bundle?.probes.map((probe) => probe.kind) ?? []);
  const bundleHits = bundle?.probes.reduce(
    (total, probe) => total + probe.matchCount,
    0,
  );
  const bundleComplete =
    bundle !== undefined &&
    bundle.scannedFileCount > 0 &&
    bundle.runtimeCycleCheckPassed &&
    REQUIRED_BUNDLE_PROBE_KINDS.every((kind) => bundleKinds.has(kind));

  const performance = measurements.performance;
  const performanceComplete =
    performance !== undefined &&
    performance.protocol === 'lin-0-program-probe-v1' &&
    performance.budgetsApproved &&
    performance.sampleCount >= 3 &&
    ['artifactBytes', 'coldMs', 'incrementalMs', 'peakRssMiB'].every(
      (metric) => {
        const budget = performance.budgets?.[metric];
        const maximum = performance.maxima?.[metric];
        return (
          typeof budget === 'number' &&
          Number.isFinite(budget) &&
          budget >= 0 &&
          typeof maximum === 'number' &&
          Number.isFinite(maximum) &&
          maximum >= 0
        );
      },
    );
  const performanceExceeded =
    performanceComplete &&
    Object.entries(performance.maxima).some(
      ([metric, maximum]) => maximum > performance.budgets[metric],
    );

  return [
    gateCheck(
      'bundle-source-isolation',
      bundleHits > 0 ? 'fail' : bundleComplete ? 'pass' : 'missing',
      bundleHits > 0
        ? ['AUTHORING_METADATA_OR_SOURCE_LOCATION_RETAINED_IN_BUNDLE']
        : bundleComplete
          ? []
          : ['BUNDLE_AND_CYCLE_EVIDENCE_REQUIRED'],
      {
        scannedByteCount: bundle?.scannedByteCount ?? 0,
        scannedFileCount: bundle?.scannedFileCount ?? 0,
      },
    ),
    gateCheck(
      'cross-program-ordering-overlap',
      overlapFailures.length > 0
        ? 'fail'
        : overlapCoverage
          ? 'pass'
          : 'missing',
      overlapFailures.length > 0
        ? ['OVERLAP_OUTCOME_MISMATCH']
        : overlapCoverage
          ? []
          : ['DEDUPLICATION_AND_CONFLICT_CASES_REQUIRED'],
      { caseCount: measurements.overlapCases.length },
    ),
    gateCheck(
      'declaration-source-redirects',
      joinFailures.length > 0
        ? 'fail'
        : declarationCoverage
          ? 'pass'
          : 'missing',
      joinFailures.length > 0
        ? ['CROSS_PROGRAM_JOIN_MISMATCH']
        : declarationCoverage
          ? []
          : ['DECLARATION_OUTPUT_AND_SOURCE_REDIRECT_EVIDENCE_REQUIRED'],
      { exactJoinCount: exactJoins.length },
    ),
    gateCheck(
      'lazy-feature-topology',
      measurements.lazyRoutes.registrationMismatchCount > 0
        ? 'fail'
        : measurements.lazyRoutes.complete &&
            measurements.lazyRoutes.scannedProgramCount > 0 &&
            measurements.lazyRoutes.registrationExactCount > 0 &&
            measurements.lazyRoutes.registrationUnresolvedCount === 0 &&
            measurements.lazyRoutes.literalLazyRouteCount > 0
          ? 'pass'
          : 'missing',
      measurements.lazyRoutes.registrationMismatchCount > 0
        ? ['ROUTE_REGISTRATION_MISMATCH']
        : measurements.lazyRoutes.complete &&
            measurements.lazyRoutes.scannedProgramCount > 0 &&
            measurements.lazyRoutes.registrationExactCount > 0 &&
            measurements.lazyRoutes.registrationUnresolvedCount === 0 &&
            measurements.lazyRoutes.literalLazyRouteCount > 0
          ? []
          : ['REGISTERED_LITERAL_LAZY_FEATURE_EVIDENCE_REQUIRED'],
      measurements.lazyRoutes,
    ),
    gateCheck(
      'leaf-tsconfig-selection',
      leafSelectionPass ? 'pass' : 'missing',
      leafSelectionReasons,
      { leafProgramCount: leafPrograms.length, diagnosticCount },
    ),
    gateCheck(
      'privacy-disclosure',
      privacyPass ? 'pass' : 'missing',
      privacyPass ? [] : ['STRICT_DISCLOSURE_INPUT_REQUIRED'],
      { disclosureMode: input.privacy?.disclosureMode ?? 'unspecified' },
    ),
    gateCheck(
      'project-references',
      referenceCount > 0 ? 'pass' : 'missing',
      referenceCount > 0 ? [] : ['PROJECT_REFERENCE_REQUIRED'],
      { projectReferenceCount: referenceCount },
    ),
    gateCheck(
      'scale-budgets',
      performanceExceeded ? 'fail' : performanceComplete ? 'pass' : 'missing',
      performanceExceeded
        ? ['PERFORMANCE_BUDGET_EXCEEDED']
        : performanceComplete
          ? []
          : ['APPROVED_BUDGETS_AND_THREE_MEASURED_SAMPLES_REQUIRED'],
      {
        configuredRootFileCount: programs.reduce(
          (total, program) => total + program.configuredRootFileCount,
          0,
        ),
        semanticInputBytes: programs.reduce(
          (total, program) => total + program.semanticInputBytes,
          0,
        ),
        semanticFileCount: programs.reduce(
          (total, program) => total + program.semanticFileCount,
          0,
        ),
        sampleCount: performance?.sampleCount ?? 0,
      },
    ),
    gateCheck(
      'symbol-conventions',
      probeFailures.length > 0
        ? 'fail'
        : unresolvedProbes.length > 0
          ? 'missing'
        : conventionCoverage
          ? 'pass'
          : 'missing',
      probeFailures.length > 0
        ? uniqueSorted(probeFailures.flatMap((probe) => probe.reasons))
        : unresolvedProbes.length > 0
          ? ['REQUIRED_SYMBOL_PROBE_UNRESOLVED']
        : conventionCoverage
          ? []
          : ['REQUIRED_SYMBOL_AND_IMPORT_CONVENTIONS_NOT_ALL_MEASURED'],
      {
        exactProbeCount: exactProbes.length,
        enumeratedRootCount: inventory.enumeratedRootCount,
      },
    ),
  ].sort((left, right) => compareCodeUnits(left.id, right.id));
}

async function loadProgramState(programInput, root) {
  const id = requireStableId(programInput.id, 'program id');
  requireStableId(programInput.projectId, 'program project id');
  if (!ALLOWED_PROGRAM_PURPOSES.has(programInput.purpose)) {
    throw new TypeError(`program ${id} purpose is unsupported.`);
  }
  const configPath = await resolveContainedPath(
    root,
    programInput.tsconfig,
    `program ${id} tsconfig`,
  );
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error !== undefined) {
    throw new TypeError(`Unable to read tsconfig for program ${id}.`);
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    dirname(configPath),
    {},
    configPath,
  );
  if (parsed.errors.length > 0) {
    throw new TypeError(`Unable to parse tsconfig for program ${id}.`);
  }
  const host = ts.createCompilerHost(parsed.options, true);
  if (programInput.useSourceOfProjectReferenceRedirect === true) {
    host.useSourceOfProjectReferenceRedirect = () => true;
  }
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
    projectReferences: parsed.projectReferences,
    host,
  });
  const sourceFiles = program.getSourceFiles();
  return {
    id,
    input: programInput,
    parsed,
    program,
    checker: program.getTypeChecker(),
    referencedSources: referenceSourceFiles(parsed),
    retained: {
      id,
      projectId: programInput.projectId,
      purpose: programInput.purpose,
      leaf: programInput.leaf === true,
      sourceRedirectEnabled:
        programInput.useSourceOfProjectReferenceRedirect === true,
      configuredRootFileCount: parsed.fileNames.length,
      semanticFileCount: sourceFiles.length,
      declarationFileCount: sourceFiles.filter((file) => file.isDeclarationFile)
        .length,
      semanticInputBytes: sourceFiles.reduce(
        (total, file) => total + Buffer.byteLength(file.text),
        0,
      ),
      projectReferenceCount: parsed.projectReferences?.length ?? 0,
      diagnosticCount: ts.getPreEmitDiagnostics(program).length,
    },
    configPath,
  };
}

function inputPathFromUrl(input) {
  return input instanceof URL ? fileURLToPath(input) : resolve(input);
}

async function readGateInput(inputPath) {
  const path = inputPathFromUrl(inputPath);
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  if (parsed.schemaVersion !== '1.0.0') {
    throw new TypeError('LIN-0 input schemaVersion must be 1.0.0.');
  }
  requireStableId(parsed.slice?.id, 'slice id');
  if (
    parsed.slice.kind !== 'public-anchor' &&
    parsed.slice.kind !== 'representative-workplace'
  ) {
    throw new TypeError('LIN-0 slice kind is unsupported.');
  }
  if (typeof parsed.slice.sanitized !== 'boolean') {
    throw new TypeError('LIN-0 slice must declare whether it is sanitized.');
  }
  if (
    typeof parsed.slice.snapshotId !== 'string' ||
    (parsed.slice.kind === 'representative-workplace'
      ? !/^[a-f0-9]{40,64}$/u.test(parsed.slice.snapshotId)
      : !STABLE_ID.test(parsed.slice.snapshotId))
  ) {
    throw new TypeError('LIN-0 slice snapshotId is not a pinned safe identifier.');
  }
  if (
    parsed.privacy?.disclosureMode !== undefined &&
    !['module-only', 'project-relative', 'workspace-relative'].includes(
      parsed.privacy.disclosureMode,
    )
  ) {
    throw new TypeError('LIN-0 disclosure mode is unsupported.');
  }
  const rootCandidate = resolve(dirname(path), parsed.slice.root);
  const root = await realpath(rootCandidate);
  return { input: parsed, root };
}

export async function buildGateReport(inputPath) {
  const { input, root } = await readGateInput(inputPath);
  const programStates = new Map();
  for (const programInput of input.programs ?? []) {
    const state = await loadProgramState(programInput, root);
    if (programStates.has(state.id)) {
      throw new TypeError(`Duplicate program id: ${state.id}`);
    }
    programStates.set(state.id, state);
  }

  const privateProbeResults = new Map();
  for (const probe of input.symbolProbes ?? []) {
    const state = programStates.get(probe.programId);
    if (state === undefined) {
      throw new TypeError(`Unknown symbol-probe program id: ${probe.programId}`);
    }
    const result = await inspectSymbolProbe(probe, state, root);
    if (privateProbeResults.has(probe.id)) {
      throw new TypeError(`Duplicate symbol probe id: ${probe.id}`);
    }
    privateProbeResults.set(probe.id, result);
  }

  const enumeratedRootCount = input.conventionInventory?.enumeratedRootCount;
  if (!Number.isSafeInteger(enumeratedRootCount) || enumeratedRootCount < 0) {
    throw new TypeError('convention inventory enumeratedRootCount is invalid.');
  }
  const conventionInventory = {
    complete: input.conventionInventory?.complete === true,
    counts: Object.fromEntries(
      CONVENTION_COUNT_KEYS.map((key) => [
        key,
        input.conventionInventory?.counts?.[key],
      ]),
    ),
    enumeratedRootCount,
    countedRootCount: sumConventionInventory(input.conventionInventory),
  };
  const measurements = {
    programs: [...programStates.values()].map((state) => state.retained),
    programTopology: {
      distinctLeafConfigCount: new Set(
        [...programStates.values()]
          .filter((state) => state.retained.leaf)
          .map((state) => state.configPath),
      ).size,
      distinctLeafProjectCount: new Set(
        [...programStates.values()]
          .filter((state) => state.retained.leaf)
          .map((state) => state.retained.projectId),
      ).size,
    },
    symbolProbes: [...privateProbeResults.values()].map(
      (result) => result.retained,
    ),
    crossProgramJoins: inspectCrossProgramJoins(
      input.crossProgramJoins,
      privateProbeResults,
      programStates,
    ),
    overlapCases: inspectOverlapCases(input.overlapCases, privateProbeResults),
    lazyRoutes: await scanLazyRoutes(programStates, input.routeScan, root),
    conventionInventory,
    bundle: await inspectBundle(input.bundle, root),
    performance: inspectPerformance(input.performance),
  };
  const checks = deriveGateChecks(input, measurements);
  const decision = decideGate({
    slice: input.slice,
    checks,
  });
  const report = {
    schemaVersion: '1.0.0',
    slice: {
      id: input.slice.id,
      kind: input.slice.kind,
      sanitized: input.slice.sanitized,
      snapshotId: input.slice.snapshotId,
    },
    toolchain: {
      nodeVersion: process.version,
      typescriptVersion: ts.version,
    },
    measurements,
    checks,
    decision,
  };
  const privacyFailures = auditRetainedReport(report);
  if (privacyFailures.length > 0) {
    const privacyCheck = report.checks.find(
      (check) => check.id === 'privacy-disclosure',
    );
    privacyCheck.status = 'fail';
    privacyCheck.reasons = privacyFailures;
    report.decision = decideGate({ slice: input.slice, checks: report.checks });
  }
  return normalizeForCanonicalJson(report);
}
