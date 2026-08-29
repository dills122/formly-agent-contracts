import type { FormlyFieldConfig } from '@ngx-formly/core';
import type { Observable } from 'rxjs';

import { rejectUnexpectedWorkplaceExecution } from './execution-sentinel.js';
import type { WorkplaceOption } from './indexing-form.js';

export interface WorkplaceNigoReason {
  readonly description: string;
  readonly relatedForms: readonly string[];
  readonly type: 'standard' | 'other' | 'system';
}

export interface NigoAddFormOptions {
  readonly caseTypeName: string;
  readonly className: string;
  readonly searchFn: (
    term: string,
    field: FormlyFieldConfig,
  ) => Observable<readonly WorkplaceNigoReason[]>;
  readonly uniqueRelatedForms: readonly WorkplaceOption<string>[];
  readonly customNigoReasons: readonly WorkplaceNigoReason[];
  readonly isDialogForm: boolean;
  readonly relatedFormsOptions: readonly WorkplaceOption<string>[];
  readonly updateRelatedFormsOptions: (
    options: readonly WorkplaceOption<string>[],
  ) => void;
}

export function NigoAddFormConfig(
  options: NigoAddFormOptions,
): FormlyFieldConfig[] {
  rejectUnexpectedWorkplaceExecution('NigoAddFormConfig');
  const selectableReasons = options.customNigoReasons.filter(
    ({ type }) => type !== 'system',
  );
  const relatedForms = options.uniqueRelatedForms.filter(
    ({ value }) => value.length > 0,
  );

  return [
    {
      template: `<p class="case-type-name">Case Type: ${options.caseTypeName}</p>`,
    },
    {
      key: 'reason',
      type: 'autocomplete',
      className: `reason-field ${options.className}`,
      props: {
        label: 'Select NIGO Reason',
        required: true,
        filter: options.searchFn,
        options: selectableReasons,
        optionSelected: (selected: WorkplaceNigoReason) => {
          options.updateRelatedFormsOptions(
            relatedForms.filter(({ value }) =>
              selected.relatedForms.includes(value),
            ),
          );
        },
      },
    },
    {
      key: 'relatedForm',
      type: 'select',
      hide: options.isDialogForm,
      expressions: {
        'props.options': () => [
          { label: 'Show All Related Forms', value: '' },
          ...options.relatedFormsOptions,
        ],
      },
      props: { label: 'Related form' },
    },
  ];
}
