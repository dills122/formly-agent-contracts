import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const virtualRoot = '/form-lineage-experiment';
const sources = new Map(
  Object.entries({
    [`${virtualRoot}/forms.ts`]: `
      export interface FormInstance { readonly fields: readonly object[]; }
      export function IndexingFormConfig(input: object): FormInstance {
        return { fields: [input] };
      }
      export function NigoAddFormConfig(input: object): FormInstance {
        return { fields: [input] };
      }
      export const ArrowFormConfig = (input: object): FormInstance => ({ fields: [input] });
      const ExportListOnlyFormConfig = (input: object): FormInstance => ({ fields: [input] });
      export { ExportListOnlyFormConfig };
      export class OrderEntryStepperForm implements FormInstance {
        readonly fields: readonly object[];
        constructor(readonly input: object) { this.fields = [input]; }
      }
      export function createContactFragment() { return []; }
      export function createZeroArgumentForm(): FormInstance { return { fields: [] }; }
      export function createIndexingDefinitionAdapter(): FormInstance {
        return IndexingFormConfig({ synthetic: true });
      }
    `,
    [`${virtualRoot}/authoring.ts`]: `
      import type { FormInstance } from './forms';
      type FormRootSymbol =
        | ((...args: never[]) => FormInstance | readonly object[])
        | (abstract new (...args: never[]) => FormInstance);
      interface Definition {
        readonly id: string;
        readonly create: () => FormInstance;
        readonly lineage?: { readonly rootSymbol: FormRootSymbol };
      }
      interface Fragment {
        readonly id: string;
        readonly create: () => readonly object[];
      }
      export function defineFormContractDefinition<T extends Definition>(definition: T): T {
        return definition;
      }
      export function defineFormContractFragment<T extends Fragment>(fragment: T): T {
        return fragment;
      }
    `,
    [`${virtualRoot}/router.ts`]: `
      export interface Route {
        readonly path: string;
        readonly component?: unknown;
        readonly children?: readonly Route[];
        readonly redirectTo?: string;
        readonly loadComponent?: () => Promise<unknown>;
      }
      export function provideRouter(routes: readonly Route[]) { return routes; }
    `,
    [`${virtualRoot}/barrel.ts`]: `
      export {
        IndexingFormConfig as BarrelIndexingForm,
        ArrowFormConfig,
        NigoAddFormConfig,
        OrderEntryStepperForm,
        createContactFragment,
        createIndexingDefinitionAdapter,
        createZeroArgumentForm,
      } from './forms';
    `,
    [`${virtualRoot}/catalog.ts`]: `
      import {
        defineFormContractDefinition,
        defineFormContractFragment,
      } from './authoring';
      import {
        ArrowFormConfig,
        IndexingFormConfig,
        NigoAddFormConfig,
        OrderEntryStepperForm,
        createContactFragment,
        createIndexingDefinitionAdapter,
        createZeroArgumentForm,
      } from './forms';

      export const descriptors = [
        defineFormContractDefinition({
          id: 'indexing.primary',
          create: createIndexingDefinitionAdapter,
          lineage: { rootSymbol: IndexingFormConfig },
        }),
        defineFormContractDefinition({
          id: 'indexing.secondary',
          create: () => IndexingFormConfig({ synthetic: true }),
          lineage: { rootSymbol: IndexingFormConfig },
        }),
        defineFormContractDefinition({
          id: 'arrow.primary',
          create: () => ArrowFormConfig({ synthetic: true }),
          lineage: { rootSymbol: ArrowFormConfig },
        }),
        defineFormContractDefinition({
          id: 'nigo.add',
          create: () => NigoAddFormConfig({ synthetic: true }),
          lineage: { rootSymbol: NigoAddFormConfig },
        }),
        defineFormContractDefinition({
          id: 'orders.entry',
          create: () => new OrderEntryStepperForm({ synthetic: true }),
          lineage: { rootSymbol: OrderEntryStepperForm },
        }),
        defineFormContractFragment({
          id: 'shared.contact',
          create: createContactFragment,
        }),
        defineFormContractDefinition({
          id: 'zero.argument',
          create: createZeroArgumentForm,
        }),
      ] as const;

      export const nearMiss = {
        id: 'ignored.near-miss',
        create: createZeroArgumentForm,
      };
    `,
    [`${virtualRoot}/wrappers.ts`]: `
      import { BarrelIndexingForm, NigoAddFormConfig } from './barrel';

      export function createIndexingWrapper() {
        return BarrelIndexingForm({ from: 'wrapper' });
      }

      export function createConditionalWrapper(flag: boolean) {
        return flag
          ? BarrelIndexingForm({ from: 'conditional-a' })
          : NigoAddFormConfig({ from: 'conditional-b' });
      }
    `,
    [`${virtualRoot}/pages.ts`]: `
      import {
        BarrelIndexingForm as LocalIndexing,
        ArrowFormConfig as LocalArrowForm,
        OrderEntryStepperForm as LocalOrderStepper,
        createContactFragment,
      } from './barrel';
      import * as FormBarrel from './barrel';
      import { createConditionalWrapper, createIndexingWrapper } from './wrappers';

      declare const chooseIndexing: boolean;

      export class IndexPageComponent {
        readonly direct = LocalIndexing({ from: 'renamed-import' });
        readonly namespace = FormBarrel.NigoAddFormConfig({ from: 'namespace' });
        readonly arrow = LocalArrowForm({ from: 'callable-variable-alias' });
        readonly step = this.buildStep('review', LocalIndexing({ from: 'step' }));
        readonly fragment = createContactFragment();
        readonly simpleWrapper = createIndexingWrapper();
        readonly conditionalWrapper = createConditionalWrapper(chooseIndexing);

        private buildStep(stepName: string, value: unknown) {
          return { stepName, value };
        }
      }

      export class OrderPageComponent {
        readonly form = new LocalOrderStepper({ from: 'constructor-alias' });
      }

      const selected = chooseIndexing
        ? LocalIndexing
        : FormBarrel.NigoAddFormConfig;
      export const selectedResult = selected({ from: 'conditional-alias' });

      function invoke(factory: (input: object) => object) {
        return factory({ from: 'higher-order-body' });
      }
      export const higherOrderA = invoke(LocalIndexing);
      export const higherOrderB = invoke(FormBarrel.NigoAddFormConfig);
    `,
    [`${virtualRoot}/usage-markers.ts`]: `
      import {
        BarrelIndexingForm as LocalIndexing,
        NigoAddFormConfig,
        OrderEntryStepperForm,
      } from './barrel';

      export class AnnotatedUsageComponent {
        /** @formlyContractUsage {"schemaVersion":"0.1.0","usageId":"property","formId":"indexing.primary"} */
        readonly propertyUsage = LocalIndexing({ from: 'annotated-property' });

        constructor() {
          /** @formlyContractUsage {"schemaVersion":"0.1.0","usageId":"variable","formId":"nigo.add"} */
          const variableUsage = NigoAddFormConfig({ from: 'annotated-variable' });
          void variableUsage;

          /** @formlyContractUsage {"schemaVersion":"0.1.0","usageId":"expression","formId":"orders.entry"} */
          new OrderEntryStepperForm({ from: 'annotated-expression' });
        }

        resolve() {
          /** @formlyContractUsage {"schemaVersion":"0.1.0","usageId":"return","formId":"indexing.secondary"} */
          return LocalIndexing({ from: 'annotated-return' });
        }

        /** @formlyContractUsage {"schemaVersion":"0.1.0","usageId":"multiple","formId":"indexing.primary"} */
        readonly multiple = [
          LocalIndexing({ from: 'annotated-multiple-a' }),
          LocalIndexing({ from: 'annotated-multiple-b' }),
        ];

        /** @formlyContractUsage {"schemaVersion":"0.1.0","usageId":"unsupported","formId":"indexing.primary"} */
        unsupportedMethod() {
          return LocalIndexing({ from: 'unsupported-method' });
        }
      }

      /** @formlyContractUsage {"schemaVersion":"0.1.0","usageId":"top-level","formId":"nigo.add"} */
      export const topLevelUsage = NigoAddFormConfig({ from: 'annotated-top-level' });

      /** @formlyContractUsage {"schemaVersion":"0.1.0","usageId":"orphan","formId":"nigo.add"} */
    `,
    [`${virtualRoot}/routes.ts`]: `
      import { provideRouter } from './router';
      import {
        IndexPageComponent as RenamedIndexPage,
        OrderPageComponent,
      } from './pages';

      export const routes = provideRouter([
        { path: 'index', component: RenamedIndexPage },
        { path: 'index-alias', component: RenamedIndexPage },
        { path: 'orders', component: OrderPageComponent },
        {
          path: 'parent',
          component: RenamedIndexPage,
          children: [{ path: 'child', component: OrderPageComponent }],
        },
        { path: 'old', redirectTo: 'index' },
        {
          path: 'lazy-index',
          loadComponent: () => import('./pages').then((module) => module.IndexPageComponent),
        },
        {
          path: getFeaturePath(),
          loadComponent: () => import('./pages').then((module) => module.IndexPageComponent),
        },
      ]);

      export const unrelated = { path: 'not-a-route', component: RenamedIndexPage };

      declare function getFeaturePath(): string;
    `,
  }),
);

const options = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  noEmit: true,
  strict: true,
  target: ts.ScriptTarget.ES2022,
};

const host = ts.createCompilerHost(options, true);
const originalFileExists = host.fileExists.bind(host);
const originalReadFile = host.readFile.bind(host);
const originalDirectoryExists = host.directoryExists?.bind(host);
host.getCurrentDirectory = () => virtualRoot;
host.fileExists = (fileName) => sources.has(fileName) || originalFileExists(fileName);
host.readFile = (fileName) => sources.get(fileName) ?? originalReadFile(fileName);
host.directoryExists = (directoryName) =>
  directoryName === virtualRoot ||
  [...sources.keys()].some((fileName) => fileName.startsWith(`${directoryName}/`)) ||
  originalDirectoryExists?.(directoryName) === true;
host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
  const text = sources.get(fileName);
  if (text !== undefined) {
    return ts.createSourceFile(fileName, text, languageVersion, true);
  }
  const fallbackText = originalReadFile(fileName);
  if (fallbackText === undefined) {
    onError?.(`Unable to read ${fileName}`);
    return undefined;
  }
  return ts.createSourceFile(
    fileName,
    fallbackText,
    languageVersion,
    shouldCreateNewSourceFile ?? true,
  );
};

const program = ts.createProgram({
  rootNames: [...sources.keys()],
  options,
  host,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.deepEqual(
  diagnostics.map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  ),
  [],
);

const checker = program.getTypeChecker();

function canonicalSymbolAt(node) {
  let symbol = checker.getSymbolAtLocation(node);
  const seen = new Set();
  while (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    assert.ok(!seen.has(symbol), 'alias cycle encountered');
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol;
}

function symbolKey(symbol) {
  const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  assert.ok(symbol !== undefined && declaration !== undefined);
  return `${declaration.getSourceFile().fileName}:${declaration.pos}:${declaration.end}:${symbol.getName()}`;
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

const catalog = program.getSourceFile(`${virtualRoot}/catalog.ts`);
assert.ok(catalog !== undefined);
const anchors = new Map();
const definitionCreationScopes = [];

function declaredSymbol(fileName, declarationName) {
  const sourceFile = program.getSourceFile(fileName);
  assert.ok(sourceFile !== undefined);
  let result;
  walk(sourceFile, (node) => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isVariableDeclaration(node)) &&
      node.name?.text === declarationName
    ) {
      result = canonicalSymbolAt(node.name);
    }
  });
  assert.ok(result !== undefined);
  return result;
}

function hasExportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function isSupportedExportedRootDeclaration(declaration) {
  if (ts.isFunctionDeclaration(declaration) || ts.isClassDeclaration(declaration)) {
    return declaration.name !== undefined && hasExportModifier(declaration);
  }
  if (!ts.isVariableDeclaration(declaration) || !ts.isIdentifier(declaration.name)) return false;
  if (
    declaration.initializer === undefined ||
    (!ts.isArrowFunction(declaration.initializer) &&
      !ts.isFunctionExpression(declaration.initializer))
  ) {
    return false;
  }
  const declarationList = declaration.parent;
  const statement = declarationList.parent;
  return (
    ts.isVariableDeclarationList(declarationList) &&
    (declarationList.flags & ts.NodeFlags.Const) !== 0 &&
    ts.isVariableStatement(statement) &&
    hasExportModifier(statement)
  );
}

const definitionHelpers = new Map([
  [
    symbolKey(
      declaredSymbol(`${virtualRoot}/authoring.ts`, 'defineFormContractDefinition'),
    ),
    'form-root',
  ],
  [
    symbolKey(
      declaredSymbol(`${virtualRoot}/authoring.ts`, 'defineFormContractFragment'),
    ),
    'fragment',
  ],
]);

walk(catalog, (node) => {
  if (!ts.isCallExpression(node) || node.arguments.length !== 1) return;
  const helperSymbol = canonicalSymbolAt(calleeNode(node.expression));
  if (helperSymbol === undefined) return;
  const role = definitionHelpers.get(symbolKey(helperSymbol));
  const definition = node.arguments[0];
  if (role === undefined || !ts.isObjectLiteralExpression(definition)) return;
  const properties = new Map(
    definition.properties
      .filter(ts.isPropertyAssignment)
      .filter((property) => ts.isIdentifier(property.name))
      .map((property) => [property.name.text, property.initializer]),
  );
  const id = properties.get('id');
  const create = properties.get('create');
  const lineage = properties.get('lineage');
  if (id === undefined || create === undefined || !ts.isStringLiteral(id)) return;
  let anchor;
  if (lineage !== undefined && ts.isObjectLiteralExpression(lineage)) {
    const rootSymbolProperty = lineage.properties.find(
      (property) =>
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === 'rootSymbol',
    );
    if (rootSymbolProperty !== undefined && ts.isPropertyAssignment(rootSymbolProperty)) {
      anchor = rootSymbolProperty.initializer;
    }
  }
  if (
    anchor === undefined &&
    (ts.isIdentifier(create) || ts.isPropertyAccessExpression(create))
  ) {
    anchor = create;
  }
  assert.ok(anchor !== undefined, `definition ${id.text} must have an anchor`);
  const symbol = canonicalSymbolAt(anchor);
  assert.ok(symbol !== undefined);
  assert.ok(
    symbol.valueDeclaration !== undefined &&
      isSupportedExportedRootDeclaration(symbol.valueDeclaration),
    `definition ${id.text} must resolve to a supported exported declaration`,
  );
  const key = symbolKey(symbol);
  const records = anchors.get(key) ?? [];
  records.push({ formId: id.text, role });
  anchors.set(key, records);
  if (ts.isArrowFunction(create) || ts.isFunctionExpression(create)) {
    definitionCreationScopes.push(create.body);
  } else if (lineage !== undefined) {
    const createSymbol = canonicalSymbolAt(create);
    const createDeclaration = createSymbol?.valueDeclaration;
    if (createDeclaration !== undefined) {
      definitionCreationScopes.push(createDeclaration);
    }
  }
});
assert.equal(
  [...anchors.values()].flat().some((record) => record.formId === 'ignored.near-miss'),
  false,
);
assert.equal(
  [...anchors.keys()].includes(
    symbolKey(declaredSymbol(`${virtualRoot}/forms.ts`, 'createIndexingDefinitionAdapter')),
  ),
  false,
  'explicit rootSymbol must override a direct create adapter',
);
const exportListOnlySymbol = declaredSymbol(
  `${virtualRoot}/forms.ts`,
  'ExportListOnlyFormConfig',
);
assert.equal(
  exportListOnlySymbol.valueDeclaration !== undefined &&
    isSupportedExportedRootDeclaration(exportListOnlySymbol.valueDeclaration),
  false,
  'the first slice intentionally requires a declaration-level export modifier',
);

function nodeKey(node) {
  return `${node.getSourceFile().fileName}:${node.pos}:${node.end}`;
}

const definitionCreationInvocations = new Set();
for (const scope of definitionCreationScopes) {
  walk(scope, (node) => {
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return;
    const symbol = canonicalSymbolAt(calleeNode(node.expression));
    if (symbol !== undefined && anchors.has(symbolKey(symbol))) {
      definitionCreationInvocations.add(nodeKey(node));
    }
  });
}
assert.equal(definitionCreationInvocations.size, 5);

const nonCreationRootInvocations = [];
for (const sourceFile of program.getSourceFiles()) {
  if (!sourceFile.fileName.startsWith(`${virtualRoot}/`)) continue;
  walk(sourceFile, (node) => {
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return;
    const symbol = canonicalSymbolAt(calleeNode(node.expression));
    if (symbol === undefined) return;
    const candidates = anchors.get(symbolKey(symbol)) ?? [];
    if (!candidates.some((candidate) => candidate.role === 'form-root')) return;
    if (!definitionCreationInvocations.has(nodeKey(node))) {
      nonCreationRootInvocations.push(nodeKey(node));
    }
  });
}
assert.equal(
  nonCreationRootInvocations.some((key) => definitionCreationInvocations.has(key)),
  false,
);

const usageMarkerFile = program.getSourceFile(`${virtualRoot}/usage-markers.ts`);
assert.ok(usageMarkerFile !== undefined);
const usageMarkerText = usageMarkerFile.getFullText();
const usageMarkerPattern = /\/\*\*\s*@formlyContractUsage\s+(\{[^]*?\})\s*\*\//gu;
const allUsageMarkers = [...usageMarkerText.matchAll(usageMarkerPattern)].map((match) => ({
  end: (match.index ?? 0) + match[0].length,
  metadata: JSON.parse(match[1]),
  start: match.index ?? 0,
}));
const consumedUsageMarkers = new Set();
const usageMarkerResults = [];

function isSupportedUsageContainer(node) {
  return (
    ts.isVariableStatement(node) ||
    ts.isExpressionStatement(node) ||
    ts.isReturnStatement(node) ||
    (ts.isPropertyDeclaration(node) && node.initializer !== undefined)
  );
}

function usageContainerKind(node) {
  if (ts.isVariableStatement(node)) return 'VariableStatement';
  if (ts.isExpressionStatement(node)) return 'ExpressionStatement';
  if (ts.isReturnStatement(node)) return 'ReturnStatement';
  if (ts.isPropertyDeclaration(node)) return 'PropertyDeclaration';
  return ts.SyntaxKind[node.kind];
}

function rootInvocationsWithin(container) {
  const results = [];
  walk(container, (node) => {
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return;
    const symbol = canonicalSymbolAt(calleeNode(node.expression));
    if (symbol === undefined) return;
    const rootFormIds = (anchors.get(symbolKey(symbol)) ?? [])
      .filter((candidate) => candidate.role === 'form-root')
      .map((candidate) => candidate.formId)
      .sort(compareCodeUnits);
    if (rootFormIds.length > 0) results.push({ node, rootFormIds });
  });
  return results;
}

function inspectUsageContainer(container) {
  const leadingComments = ts.getLeadingCommentRanges(usageMarkerText, container.getFullStart()) ?? [];
  const markers = allUsageMarkers.filter((marker) =>
    leadingComments.some((comment) => comment.pos === marker.start && comment.end === marker.end),
  );
  for (const marker of markers) {
    consumedUsageMarkers.add(marker.start);
    if (!isSupportedUsageContainer(container)) {
      usageMarkerResults.push({
        attachmentKind: usageContainerKind(container),
        status: 'unsupported-container',
        usageId: marker.metadata.usageId,
      });
      continue;
    }
    const rootInvocations = rootInvocationsWithin(container);
    let status = 'exact';
    if (rootInvocations.length === 0) status = 'no-root-call';
    if (rootInvocations.length > 1) status = 'multiple-root-calls';
    if (
      rootInvocations.length === 1 &&
      !rootInvocations[0].rootFormIds.includes(marker.metadata.formId)
    ) {
      status = 'form-id-mismatch';
    }
    usageMarkerResults.push({
      attachmentKind: usageContainerKind(container),
      status,
      usageId: marker.metadata.usageId,
    });
  }
}

function inspectUsageLists(node) {
  if (ts.isSourceFile(node) || ts.isBlock(node)) {
    for (const statement of node.statements) inspectUsageContainer(statement);
  }
  if (ts.isClassDeclaration(node)) {
    for (const member of node.members) inspectUsageContainer(member);
  }
  ts.forEachChild(node, inspectUsageLists);
}

inspectUsageLists(usageMarkerFile);
for (const marker of allUsageMarkers) {
  if (!consumedUsageMarkers.has(marker.start)) {
    usageMarkerResults.push({ status: 'orphan', usageId: marker.metadata.usageId });
  }
}
usageMarkerResults.sort((left, right) => compareCodeUnits(left.usageId, right.usageId));
assert.deepEqual(usageMarkerResults, [
  { attachmentKind: 'ExpressionStatement', status: 'exact', usageId: 'expression' },
  { attachmentKind: 'PropertyDeclaration', status: 'multiple-root-calls', usageId: 'multiple' },
  { status: 'orphan', usageId: 'orphan' },
  { attachmentKind: 'PropertyDeclaration', status: 'exact', usageId: 'property' },
  { attachmentKind: 'ReturnStatement', status: 'exact', usageId: 'return' },
  { attachmentKind: 'VariableStatement', status: 'exact', usageId: 'top-level' },
  { attachmentKind: 'MethodDeclaration', status: 'unsupported-container', usageId: 'unsupported' },
  { attachmentKind: 'VariableStatement', status: 'exact', usageId: 'variable' },
]);

function sourceLocation(node) {
  const sourceFile = node.getSourceFile();
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    file: sourceFile.fileName.slice(virtualRoot.length + 1),
    line: start.line + 1,
    column: start.character + 1,
  };
}

function calleeNode(expression) {
  return ts.isPropertyAccessExpression(expression) ? expression.name : expression;
}

const pages = program.getSourceFile(`${virtualRoot}/pages.ts`);
assert.ok(pages !== undefined);
const invocations = [];

walk(pages, (node) => {
  if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return;
  const symbol = canonicalSymbolAt(calleeNode(node.expression));
  const candidates = symbol === undefined ? [] : (anchors.get(symbolKey(symbol)) ?? []);
  invocations.push({
    syntax: node.getText(pages).replace(/\s+/gu, ' '),
    kind: ts.isNewExpression(node) ? 'construct' : 'call',
    ...sourceLocation(node),
    rootFormIds: candidates
      .filter((candidate) => candidate.role === 'form-root')
      .map((candidate) => candidate.formId)
      .sort(),
    fragmentIds: candidates
      .filter((candidate) => candidate.role === 'fragment')
      .map((candidate) => candidate.formId)
      .sort(),
  });
});

function findInvocations(startsWith) {
  const matches = invocations.filter((invocation) => invocation.syntax.startsWith(startsWith));
  assert.ok(matches.length > 0, `expected an invocation starting with ${startsWith}`);
  return matches;
}

function findInvocation(startsWith) {
  const matches = findInvocations(startsWith);
  assert.equal(matches.length, 1, `expected one invocation starting with ${startsWith}`);
  return matches[0];
}

for (const invocation of findInvocations('LocalIndexing(')) {
  assert.deepEqual(invocation.rootFormIds, [
    'indexing.primary',
    'indexing.secondary',
  ]);
}
assert.deepEqual(findInvocation('FormBarrel.NigoAddFormConfig(').rootFormIds, [
  'nigo.add',
]);
assert.deepEqual(findInvocation('new LocalOrderStepper(').rootFormIds, [
  'orders.entry',
]);
assert.deepEqual(findInvocation('createContactFragment(').rootFormIds, []);
assert.deepEqual(findInvocation('createContactFragment(').fragmentIds, [
  'shared.contact',
]);
assert.deepEqual(findInvocation('createIndexingWrapper(').rootFormIds, []);
assert.deepEqual(findInvocation('createConditionalWrapper(').rootFormIds, []);
assert.deepEqual(findInvocation('selected(').rootFormIds, []);
assert.deepEqual(findInvocation('factory(').rootFormIds, []);

const routes = program.getSourceFile(`${virtualRoot}/routes.ts`);
assert.ok(routes !== undefined);
const componentToPaths = new Map();
const unknownRouteContexts = [];

function analyzeRouteArray(array, parentPath = '') {
  for (const node of array.elements) {
    if (!ts.isObjectLiteralExpression(node)) continue;
  const properties = new Map(
    node.properties
      .filter(ts.isPropertyAssignment)
      .filter((property) => ts.isIdentifier(property.name))
      .map((property) => [property.name.text, property.initializer]),
  );
  const path = properties.get('path');
  const component = properties.get('component');
  const loadComponent = properties.get('loadComponent');
    const children = properties.get('children');
    const redirectTo = properties.get('redirectTo');
    if (path === undefined) continue;
    if (!ts.isStringLiteral(path)) {
    unknownRouteContexts.push({
        reason: 'non-literal-path',
      ...sourceLocation(node),
    });
      continue;
    }
    const fullPath = [parentPath, path.text].filter(Boolean).join('/');
    let handled = false;
    if (component !== undefined) {
      const symbol = canonicalSymbolAt(component);
      assert.ok(symbol !== undefined);
      const key = symbolKey(symbol);
      const values = componentToPaths.get(key) ?? [];
      values.push(fullPath);
      componentToPaths.set(key, values);
      handled = true;
    }
    if (loadComponent !== undefined) {
      unknownRouteContexts.push({
        reason: 'lazy-loader-requires-analysis',
        ...sourceLocation(node),
      });
      handled = true;
    }
    if (children !== undefined && ts.isArrayLiteralExpression(children)) {
      analyzeRouteArray(children, fullPath);
      handled = true;
    }
    if (redirectTo !== undefined) {
      handled = true;
    }
    if (!handled) {
      unknownRouteContexts.push({
        reason: 'route-without-supported-target',
        ...sourceLocation(node),
      });
    }
  }
}

const provideRouterSymbol = declaredSymbol(`${virtualRoot}/router.ts`, 'provideRouter');
let analyzedRouterCalls = 0;
walk(routes, (node) => {
  if (!ts.isCallExpression(node) || node.arguments.length !== 1) return;
  const symbol = canonicalSymbolAt(calleeNode(node.expression));
  if (symbol === undefined || symbolKey(symbol) !== symbolKey(provideRouterSymbol)) return;
  const routesArgument = node.arguments[0];
  assert.ok(ts.isArrayLiteralExpression(routesArgument));
  analyzeRouteArray(routesArgument);
  analyzedRouterCalls += 1;
});
assert.equal(analyzedRouterCalls, 1);

function exportedClassSymbol(file, name) {
  let result;
  walk(file, (node) => {
    if (ts.isClassDeclaration(node) && node.name?.text === name) {
      result = canonicalSymbolAt(node.name);
    }
  });
  assert.ok(result !== undefined);
  return result;
}

assert.deepEqual(
  componentToPaths.get(symbolKey(exportedClassSymbol(pages, 'IndexPageComponent'))),
  ['index', 'index-alias', 'parent'],
);
assert.deepEqual(
  componentToPaths.get(symbolKey(exportedClassSymbol(pages, 'OrderPageComponent'))),
  ['orders', 'parent/child'],
);
assert.deepEqual(unknownRouteContexts.map((entry) => entry.reason), [
  'lazy-loader-requires-analysis',
  'non-literal-path',
]);

const virtualReport = {
  environment: {
    node: process.version,
    typescript: ts.version,
  },
  assertions: {
    proposedDefinitionShapeTypeChecked: true,
    explicitLineageOverridesDirectCreate: true,
    unrecognizedDescriptorObjectIgnored: true,
    renamedImportAndBarrelCanonicalized: true,
    namespaceImportCanonicalized: true,
    constructorAliasCanonicalized: true,
    exportedCallableVariableCanonicalized: true,
    exportListOnlyCallableVariableRejected: true,
    oneSymbolToManyFormIdsIsAmbiguous: true,
    fragmentRoleDoesNotBecomeFormRoot: true,
    usageMarkerAttachmentContainersAreExplicit: true,
    usageMarkerOrphansAndMultipleCallsFailClosed: true,
    wrapperRequiresBodyAnalysisOrAnnotation: true,
    conditionalAliasIsNotDirectlyResolved: true,
    higherOrderBodyIsNotDirectlyResolved: true,
    eagerLiteralRouteMapsToComponent: true,
    recognizedRouterEntrypointRequired: true,
    componentRouteWithChildrenRecurses: true,
    dynamicRoutePathRemainsUnknown: true,
  },
  selectedInvocations: [
    ...findInvocations('LocalIndexing('),
    findInvocation('FormBarrel.NigoAddFormConfig('),
    findInvocation('LocalArrowForm('),
    findInvocation('new LocalOrderStepper('),
    findInvocation('createContactFragment('),
    findInvocation('createIndexingWrapper('),
    findInvocation('createConditionalWrapper('),
    findInvocation('selected('),
    findInvocation('factory('),
  ],
  eagerRoutes: [...componentToPaths.entries()]
    .map(([componentSymbol, paths]) => ({ componentSymbol, paths }))
    .sort((left, right) => compareCodeUnits(left.componentSymbol, right.componentSymbol)),
  definitionCreationProvenanceCount: definitionCreationInvocations.size,
  nonCreationRootInvocationCount: nonCreationRootInvocations.length,
  usageMarkerResults,
  unknownRouteContexts,
};

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
assert.equal(ts.version, '5.9.3');
const fixtureConfigPath = resolve(
  workspaceRoot,
  'fixtures/angular-monorepo/tsconfig.json',
);
const fixtureConfig = ts.readConfigFile(fixtureConfigPath, (fileName) =>
  readFileSync(fileName, 'utf8'),
);
assert.equal(fixtureConfig.error, undefined);
const fixtureParsedConfig = ts.parseJsonConfigFileContent(
  fixtureConfig.config,
  ts.sys,
  dirname(fixtureConfigPath),
  {},
  fixtureConfigPath,
);
assert.equal(fixtureParsedConfig.fileNames.length, 46);
assert.deepEqual(
  fixtureParsedConfig.errors.map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  ),
  [],
);
const fixtureProgram = ts.createProgram({
  rootNames: fixtureParsedConfig.fileNames,
  options: fixtureParsedConfig.options,
});
const fixtureDiagnostics = ts.getPreEmitDiagnostics(fixtureProgram);
assert.deepEqual(
  fixtureDiagnostics.map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  ),
  [],
);
const fixtureChecker = fixtureProgram.getTypeChecker();

function fixtureCanonicalSymbolAt(node) {
  let symbol = fixtureChecker.getSymbolAtLocation(node);
  const seen = new Set();
  while (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    assert.ok(!seen.has(symbol), 'fixture alias cycle encountered');
    seen.add(symbol);
    symbol = fixtureChecker.getAliasedSymbol(symbol);
  }
  return symbol;
}

const fixtureAnchors = new Map();
const fixtureUnanchoredDefinitions = [];
const fixtureRoot = resolve(workspaceRoot, 'fixtures/angular-monorepo');
const workspaceSourceHelperPath = resolve(
  workspaceRoot,
  'packages/workspace/src/source.ts',
);
const workspaceSourceHelperFile = fixtureProgram.getSourceFile(
  workspaceSourceHelperPath,
);
assert.ok(workspaceSourceHelperFile !== undefined);
let workspaceSourceHelperSymbol;
walk(workspaceSourceHelperFile, (node) => {
  if (
    ts.isFunctionDeclaration(node) &&
    node.name?.text === 'defineFormContractSource'
  ) {
    workspaceSourceHelperSymbol = fixtureCanonicalSymbolAt(node.name);
  }
});
assert.ok(workspaceSourceHelperSymbol !== undefined);
const workspaceSourceHelperKey = symbolKey(workspaceSourceHelperSymbol);
let recognizedFixtureSources = 0;

function objectProperties(object) {
  return new Map(
    object.properties
      .filter(ts.isPropertyAssignment)
      .filter((property) => ts.isIdentifier(property.name))
      .map((property) => [property.name.text, property.initializer]),
  );
}

for (const sourceFile of fixtureProgram.getSourceFiles()) {
  if (sourceFile.isDeclarationFile || !sourceFile.fileName.startsWith(`${fixtureRoot}/`)) {
    continue;
  }
  walk(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || node.arguments.length !== 1) return;
    const helper = fixtureCanonicalSymbolAt(calleeNode(node.expression));
    if (helper === undefined || symbolKey(helper) !== workspaceSourceHelperKey) {
      return;
    }
    const sourceArgument = node.arguments[0];
    assert.ok(ts.isObjectLiteralExpression(sourceArgument));
    const list = objectProperties(sourceArgument).get('list');
    assert.ok(list !== undefined && ts.isArrowFunction(list));
    assert.ok(ts.isArrayLiteralExpression(list.body));
    recognizedFixtureSources += 1;
    for (const definition of list.body.elements) {
      assert.ok(ts.isObjectLiteralExpression(definition));
      const properties = objectProperties(definition);
      const id = properties.get('id');
      const create = properties.get('create');
      assert.ok(id !== undefined && ts.isStringLiteral(id));
      assert.ok(create !== undefined);
      if (!ts.isIdentifier(create) && !ts.isPropertyAccessExpression(create)) {
        fixtureUnanchoredDefinitions.push(id.text);
        continue;
      }
      const symbol = fixtureCanonicalSymbolAt(create);
      assert.ok(symbol !== undefined);
      const key = symbolKey(symbol);
      const values = fixtureAnchors.get(key) ?? [];
      values.push(id.text);
      fixtureAnchors.set(key, values);
    }
  });
}
assert.equal(recognizedFixtureSources, 2);

const fixtureMatches = [];

for (const sourceFile of fixtureProgram.getSourceFiles()) {
  if (
    sourceFile.isDeclarationFile ||
    !sourceFile.fileName.startsWith(`${fixtureRoot}/`)
  ) {
    continue;
  }
  const usagePath = sourceFile.fileName.slice(workspaceRoot.length + 1);
  walk(sourceFile, (node) => {
    if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return;
    const symbol = fixtureCanonicalSymbolAt(calleeNode(node.expression));
    if (symbol === undefined) return;
    const formIds = fixtureAnchors.get(symbolKey(symbol));
    if (formIds === undefined) return;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    fixtureMatches.push({
      file: usagePath,
      line: start.line + 1,
      column: start.character + 1,
      syntax: node.getText(sourceFile).replace(/\s+/gu, ' '),
      formIds: [...formIds].sort(),
    });
  });
}

const expectedFixtureMatches = [
  {
    file: 'fixtures/angular-monorepo/libs/feature-lib/src/lib/claim-intake-page.component.ts',
    line: 29,
    column: 22,
    syntax: 'createClaimIntakeForm()',
    formIds: ['claims.intake'],
  },
  {
    file: 'fixtures/angular-monorepo/libs/feature-lib/src/lib/scenario-gallery-page.component.ts',
    line: 50,
    column: 7,
    syntax: 'createClaimsAssignmentForm()',
    formIds: ['claims.assignment'],
  },
  {
    file: 'fixtures/angular-monorepo/libs/feature-lib/src/lib/scenario-gallery-page.component.ts',
    line: 55,
    column: 7,
    syntax: 'createCustomerOnboardingForm()',
    formIds: ['customers.onboarding'],
  },
  {
    file: 'fixtures/angular-monorepo/libs/feature-lib/src/lib/scenario-gallery-page.component.ts',
    line: 60,
    column: 7,
    syntax: 'createIncidentForm()',
    formIds: ['operations.incident'],
  },
];
fixtureMatches.sort(
  (left, right) => compareCodeUnits(left.file, right.file) || left.line - right.line,
);
expectedFixtureMatches.sort(
  (left, right) => compareCodeUnits(left.file, right.file) || left.line - right.line,
);
assert.deepEqual(fixtureMatches, expectedFixtureMatches);

assert.deepEqual(fixtureUnanchoredDefinitions.sort(), [
  'shared.contact-preferences',
  'shared.customer-lookup',
]);

const report = {
  virtualProgram: virtualReport,
  repositoryAngularFixture: {
    tsconfig: 'fixtures/angular-monorepo/tsconfig.json',
    rootFileCount: fixtureParsedConfig.fileNames.length,
    diagnosticCount: fixtureDiagnostics.length,
    exactDirectUsageMatches: fixtureMatches,
    recognizedSourceCount: recognizedFixtureSources,
    inlineFactoryDefinitionsWithoutExplicitRootAnchor:
      fixtureUnanchoredDefinitions,
    assertions: {
      workspaceTsconfigAliasesLoaded: true,
      fourDirectFactoryUsagesResolvedExactly: true,
      inlineFragmentAdaptersNeedExplicitRootAnchor: true,
    },
  },
};

console.log(JSON.stringify(report, null, 2));
