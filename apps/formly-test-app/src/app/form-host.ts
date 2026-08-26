import { FormGroup } from '@angular/forms';
import type {
  FormlyFieldConfig,
  FormlyFormOptions,
} from '@ngx-formly/core';

import { DEMO_CONTRACTS } from './generated/demo-contracts.js';
import type {
  TestFormDefinition,
  TestFormInstance,
} from './form-registry/form-definition.js';

interface TestFormSource {
  list(): readonly TestFormDefinition[];
  create(id: string): TestFormInstance;
}

type DemoEvidence = 'declared' | 'resolved' | 'observed';
type DemoNodeKind = 'control' | 'group' | 'array' | 'display';
type DemoModelPathSegment = string | number;

interface DemoContractLocator {
  readonly accessibleName?: string;
  readonly attribute?: string;
  readonly confidence: 'exact' | 'derived';
  readonly evidence: DemoEvidence;
  readonly strategy: 'testId' | 'role' | 'label' | 'placeholder' | 'domId';
  readonly target: string;
  readonly value: string;
}

interface DemoContractNode {
  readonly arrayTemplate?: DemoContractNode;
  readonly children: readonly DemoContractNode[];
  readonly evidence: DemoEvidence;
  readonly formlyType?: string;
  readonly id: string;
  readonly kind: DemoNodeKind;
  readonly locators: readonly DemoContractLocator[];
  readonly modelPath: readonly DemoModelPathSegment[];
  readonly presentation?: { readonly label?: string };
  readonly semanticType?: string;
}

interface DemoFormContract {
  readonly contentHash: string;
  readonly diagnostics: readonly {
    readonly code: string;
    readonly message: string;
    readonly nodeId?: string;
  }[];
  readonly formId: string;
  readonly nodes: readonly DemoContractNode[];
  readonly schemaVersion: string;
}

export interface ContractNodeRow {
  readonly depth: number;
  readonly diagnosticCount: number;
  readonly exactLocatorCount: number;
  readonly id: string;
  readonly kind: DemoNodeKind;
  readonly label: string;
  readonly locators: readonly DemoContractLocator[];
  readonly locatorCount: number;
  readonly modelPath: string;
  readonly primaryLocator: DemoContractLocator | undefined;
  readonly semanticType: string;
}

export interface ContractMetrics {
  readonly controls: number;
  readonly diagnostics: number;
  readonly exactLocators: number;
  readonly nodes: number;
}

function formatModelPath(path: readonly DemoModelPathSegment[]): string {
  if (path.length === 0) {
    return 'structural';
  }

  return path.reduce<string>((formatted, segment) => {
    if (segment === '*') {
      return `${formatted}[*]`;
    }
    if (typeof segment === 'number') {
      return `${formatted}[${segment}]`;
    }

    return formatted.length === 0 ? segment : `${formatted}.${segment}`;
  }, '');
}

function flattenContractNodes(
  nodes: readonly DemoContractNode[],
  diagnosticsByNode: ReadonlyMap<string, number>,
  depth = 0,
): ContractNodeRow[] {
  return nodes.flatMap((node) => {
    const row: ContractNodeRow = {
      depth,
      diagnosticCount: diagnosticsByNode.get(node.id) ?? 0,
      exactLocatorCount: node.locators.filter(
        ({ confidence }) => confidence === 'exact',
      ).length,
      id: node.id,
      kind: node.kind,
      label:
        node.presentation?.label ??
        (node.kind === 'display' ? 'Display content' : node.formlyType ?? node.kind),
      locatorCount: node.locators.length,
      locators: node.locators,
      modelPath: formatModelPath(node.modelPath),
      primaryLocator: node.locators[0],
      semanticType: node.semanticType ?? node.formlyType ?? node.kind,
    };
    const nested = flattenContractNodes(
      node.arrayTemplate
        ? [...node.children, node.arrayTemplate]
        : node.children,
      diagnosticsByNode,
      depth + 1,
    );

    return [row, ...nested];
  });
}

interface LocatorDemo {
  readonly available: boolean;
  readonly declarationJson: string;
  readonly normalizedJson: string;
  readonly playwrightCode: string;
  readonly testIntentJson: string;
}

function createLocatorDemo(
  contract: DemoFormContract,
  rows: readonly ContractNodeRow[],
): LocatorDemo {
  const target = rows.find(({ locators }) =>
    locators.some(
      ({ confidence, strategy }) =>
        confidence === 'exact' && strategy === 'testId',
    ),
  );
  const locator = target?.locators.find(
    ({ confidence, strategy }) =>
      confidence === 'exact' && strategy === 'testId',
  );

  if (!target || !locator?.attribute) {
    return {
      available: false,
      declarationJson: '',
      normalizedJson: '',
      playwrightCode: '',
      testIntentJson: '',
    };
  }

  const role = target.locators.find(({ strategy }) => strategy === 'role');
  const label = target.locators.find(({ strategy }) => strategy === 'label');
  const placeholder = target.locators.find(
    ({ strategy }) => strategy === 'placeholder',
  );
  const domId = target.locators.find(({ strategy }) => strategy === 'domId');
  const value = 'Ada Example';

  const declaration = {
    ...(domId ? { id: domId.value } : {}),
    props: {
      ...(placeholder ? { placeholder: placeholder.value } : {}),
      attributes: {
        [locator.attribute]: locator.value,
        ...(role ? { role: role.value } : {}),
        ...(label ? { 'aria-label': label.value } : {}),
      },
    },
  };
  const testIntent = {
    formRef: { id: contract.formId, hash: contract.contentHash },
    steps: [
      { op: 'set', node: target.id, target: locator.target, value },
      { op: 'expectValue', node: target.id, target: locator.target, value },
    ],
  };
  const locatorExpression =
    locator.attribute === 'data-testid'
      ? `page.getByTestId(${JSON.stringify(locator.value)})`
      : `page.locator(${JSON.stringify(
          `[${locator.attribute}="${locator.value}"]`,
        )})`;

  return {
    available: true,
    declarationJson: JSON.stringify(declaration, null, 2),
    normalizedJson: JSON.stringify(
      {
        nodeId: target.id,
        modelPath: target.modelPath,
        locators: target.locators,
      },
      null,
      2,
    ),
    playwrightCode: [
      `const field = ${locatorExpression};`,
      `await field.fill(${JSON.stringify(value)});`,
      `await expect(field).toHaveValue(${JSON.stringify(value)});`,
    ].join('\n'),
    testIntentJson: JSON.stringify(testIntent, null, 2),
  };
}

function summarizeContract(
  contract: DemoFormContract,
  rows: readonly ContractNodeRow[],
): ContractMetrics {
  return {
    nodes: rows.length,
    controls: rows.filter(({ kind }) => kind === 'control').length,
    exactLocators: rows.reduce(
      (total, { exactLocatorCount }) => total + exactLocatorCount,
      0,
    ),
    diagnostics: contract.diagnostics.length,
  };
}

function createAgentHandoff(
  contract: DemoFormContract,
  rows: readonly ContractNodeRow[],
  metrics: ContractMetrics,
): string {
  const target = rows.find(({ primaryLocator }) => primaryLocator !== undefined);

  return JSON.stringify(
    {
      read: {
        formId: contract.formId,
        contentHash: contract.contentHash,
      },
      evidenceBoundary: 'declared configuration; not browser-observed',
      availableFacts: metrics,
      firstKnownTarget: target?.primaryLocator
        ? {
            nodeId: target.id,
            modelPath: target.modelPath,
            semanticType: target.semanticType,
            locator: target.primaryLocator,
          }
        : null,
      diagnostics: contract.diagnostics.map(({ code, nodeId, message }) => ({
        code,
        nodeId,
        message,
      })),
    },
    null,
    2,
  );
}

export class FormHost {
  readonly #source: TestFormSource;
  readonly #contracts: Readonly<Record<string, DemoFormContract>>;
  readonly definitions: readonly TestFormDefinition[];

  activeDefinition: TestFormDefinition | undefined;
  agentHandoff = '';
  contract: DemoFormContract | undefined;
  contractJson = '';
  contractMetrics: ContractMetrics = {
    controls: 0,
    diagnostics: 0,
    exactLocators: 0,
    nodes: 0,
  };
  contractRows: readonly ContractNodeRow[] = [];
  locatorDemo: LocatorDemo = {
    available: false,
    declarationJson: '',
    normalizedJson: '',
    playwrightCode: '',
    testIntentJson: '',
  };
  fields: FormlyFieldConfig[] = [];
  form = new FormGroup({});
  model: Record<string, unknown> = {};
  options: FormlyFormOptions = { formState: {} };

  constructor(
    source: TestFormSource,
    contracts: Readonly<Record<string, DemoFormContract>> = DEMO_CONTRACTS,
  ) {
    this.#source = source;
    this.#contracts = contracts;
    this.definitions = this.#source.list();
    const firstDefinition = this.definitions[0];
    if (firstDefinition) {
      this.select(firstDefinition.id);
    }
  }

  select(id: string): void {
    const definition = this.definitions.find((candidate) => candidate.id === id);
    if (!definition) {
      this.#source.create(id);
      return;
    }

    const instance = this.#source.create(id);
    const contract = this.#contracts[id];
    if (!contract) {
      throw new Error(`Missing generated contract for test form ID: ${id}`);
    }
    const diagnosticsByNode = new Map<string, number>();
    for (const diagnostic of contract.diagnostics) {
      if (diagnostic.nodeId) {
        diagnosticsByNode.set(
          diagnostic.nodeId,
          (diagnosticsByNode.get(diagnostic.nodeId) ?? 0) + 1,
        );
      }
    }
    const rows = flattenContractNodes(contract.nodes, diagnosticsByNode);
    const metrics = summarizeContract(contract, rows);

    this.activeDefinition = definition;
    this.contract = contract;
    this.contractRows = rows;
    this.contractMetrics = metrics;
    this.contractJson = JSON.stringify(contract, null, 2);
    this.agentHandoff = createAgentHandoff(contract, rows, metrics);
    this.locatorDemo = createLocatorDemo(contract, rows);
    this.fields = instance.fields;
    this.form = new FormGroup({});
    this.model = instance.model;
    this.options = { formState: instance.formState };
  }
}
