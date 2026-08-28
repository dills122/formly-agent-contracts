import 'zone.js';
import 'zone.js/testing';
import '@angular/compiler';

import { getTestBed, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import {
  FormlyFormBuilder,
  FormlyModule,
  type FormlyFieldConfig,
} from '@ngx-formly/core';
import { beforeAll, describe, expect, it } from 'vitest';

import { NativeFormlyFieldsModule } from '../../formly-types/native-formly-fields.module.js';
import {
  observeControlledScenarioDelta,
  type ScenarioFieldObservation,
} from './cross-field-effects.spike.js';

let testEnvironmentInitialized = false;

function ensureTestEnvironment(): void {
  if (testEnvironmentInitialized) {
    return;
  }
  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
  );
  testEnvironmentInitialized = true;
}

function createFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'product',
      type: 'select',
      props: {
        options: [
          { label: 'Alpha product', value: 'alpha' },
          { label: 'Beta product', value: 'beta' },
        ],
      },
    },
    {
      key: 'caseType',
      type: 'select',
      expressions: {
        hide: "model.product !== 'beta'",
        'props.options': (field) => {
          const model = field.model as { product?: unknown };
          return model.product === 'beta'
            ? [{ label: 'Beta case', value: 'beta-case' }]
            : [{ label: 'Alpha case', value: 'alpha-case' }];
        },
      },
    },
  ];
}

function buildScenario(product: string): ScenarioFieldObservation[] {
  const fields = createFields();
  const root: FormlyFieldConfig = {
    form: new FormGroup({}),
    model: { product },
    options: { formState: {} },
    fieldGroup: fields,
  };
  TestBed.inject(FormlyFormBuilder).build(root);
  const caseType = root.fieldGroup?.[1];
  return [
    {
      nodeId: 'caseType',
      visible: caseType?.hide !== true,
      options: caseType?.props?.options,
    },
  ];
}

describe('cross-field effects Formly scenario observation', () => {
  beforeAll(() => {
    ensureTestEnvironment();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [FormlyModule.forRoot(), NativeFormlyFieldsModule],
    });
  });

  it('observes an option-set delta from two isolated Formly builds without claiming filters versus loads', () => {
    const alpha = buildScenario('alpha');
    const beta = buildScenario('beta');

    expect(alpha[0]?.options).toEqual([
      { label: 'Alpha case', value: 'alpha-case' },
    ]);
    expect(beta[0]?.options).toEqual([
      { label: 'Beta case', value: 'beta-case' },
    ]);
    const result = observeControlledScenarioDelta({
        changedSource: { scope: 'model', path: ['product'] },
        before: alpha,
        after: beta,
      });
    expect(result.unknowns).toEqual([]);
    expect(result.deltas).toEqual([
      {
        source: { scope: 'model', path: ['product'] },
        target: { nodeId: 'caseType', property: 'options' },
        effectKind: 'options-state',
        evidence: 'controlled-scenario-delta',
        authority: 'candidate',
      },
      {
        source: { scope: 'model', path: ['product'] },
        target: { nodeId: 'caseType', property: 'visibility' },
        effectKind: 'visibility-state',
        evidence: 'controlled-scenario-delta',
        authority: 'candidate',
      },
    ]);
  });
});
