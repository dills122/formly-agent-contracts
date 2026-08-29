import type { TemplateRef } from '@angular/core';
import type { FormlyFieldConfig } from '@ngx-formly/core';
import type { Observable } from 'rxjs';

import { rejectUnexpectedWorkplaceExecution } from './execution-sentinel.js';

export interface WorkplaceOption<TValue> {
  readonly label: string;
  readonly value: TValue;
}

export interface WorkplaceIndexingService {
  loadInitialCaseTypes(): readonly string[];
}

export interface IndexingFormOptions {
  readonly mode: 'create' | 'review';
  readonly staticOptions: readonly WorkplaceOption<string>[];
  readonly service: WorkplaceIndexingService;
  readonly reviewFn: () => boolean;
  readonly productChangeFn: (field: FormlyFieldConfig) => void;
  readonly productOptionsFn: (
    field: FormlyFieldConfig,
  ) => Observable<readonly WorkplaceOption<string>[]>;
  readonly loading$: Observable<boolean>;
  readonly cases$: Observable<readonly { readonly id: string }[]>;
  readonly panelHeaderTemplate: TemplateRef<unknown>;
  readonly caseColumns: readonly string[];
  readonly canAddCaseType: boolean;
  readonly unsafeOwnerFilter: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- retained fail-closed fixture
}

const PRIVATE_FIXTURE_SENTINEL = 'WORKPLACE-CUSTOMER-SECRET';

export function IndexingFormConfig(
  options: IndexingFormOptions,
): FormlyFieldConfig[] {
  rejectUnexpectedWorkplaceExecution('IndexingFormConfig');
  const availableOptions = options.staticOptions.filter(
    ({ value }) => value.length > 0,
  );
  const initialCaseTypes = options.service.loadInitialCaseTypes();

  return [
    {
      key: 'product',
      type: 'select',
      props: {
        label: 'Choose Product',
        required: true,
        options: availableOptions,
        change: (field) => options.productChangeFn(field),
      },
      expressions: {
        'props.disabled': () => options.reviewFn(),
        'props.options': (field) => options.productOptionsFn(field),
      },
    },
    {
      key: 'caseResults',
      type: 'input',
      props: {
        label: 'Cases',
        loading$: options.loading$,
        cases$: options.cases$,
        panelHeaderTemplate: options.panelHeaderTemplate,
        caseColumns: options.caseColumns,
        initialCaseTypes,
        canAddCaseType: options.canAddCaseType,
        mode: options.mode,
        unsafeOwnerFilter: options.unsafeOwnerFilter,
        privateFixtureSentinel: PRIVATE_FIXTURE_SENTINEL,
      },
    },
  ];
}
