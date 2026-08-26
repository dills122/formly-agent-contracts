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

export interface SyntheticBuildResult {
  readonly root: FormlyFieldConfig;
  readonly fields: readonly FormlyFieldConfig[];
}

let testEnvironmentInitialized = false;
let syntheticBuilder: FormlyFormBuilder | undefined;

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

function createSyntheticFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'profile',
      fieldGroup: [
        {
          key: 'displayName',
          type: 'input',
          props: {
            label: 'Display name',
            required: true,
          },
        },
      ],
    },
  ];
}

export function createSyntheticFormBuilder(): FormlyFormBuilder {
  if (syntheticBuilder !== undefined) {
    return syntheticBuilder;
  }

  ensureTestEnvironment();
  TestBed.resetTestingModule();

  // Formly's public integration boundary is FormlyModule.forRoot(). TestBed
  // gives this component-free spike an Angular injector without mounting UI.
  // Sources:
  // https://angular.dev/guide/testing/services#testing-services-with-the-testbed
  // https://github.com/ngx-formly/ngx-formly/blob/v6.1.8/src/core/src/lib/core.module.ts
  TestBed.configureTestingModule({
    imports: [
      FormlyModule.forRoot({
        types: [
          {
            name: 'input',
            defaultOptions: {
              props: {
                type: 'text',
              },
            },
          },
          { name: 'select' },
          { name: 'radio' },
        ],
      }),
    ],
  });

  syntheticBuilder = TestBed.inject(FormlyFormBuilder);
  return syntheticBuilder;
}

export function buildSyntheticForm(): SyntheticBuildResult {
  const builder = createSyntheticFormBuilder();
  const root: FormlyFieldConfig = {
    form: new FormGroup({}),
    model: {},
    options: {},
    fieldGroup: createSyntheticFields(),
  };

  builder.build(root);

  return {
    root,
    fields: root.fieldGroup ?? [],
  };
}
