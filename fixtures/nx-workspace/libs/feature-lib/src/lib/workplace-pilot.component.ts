import { Component } from '@angular/core';
import type { TemplateRef } from '@angular/core';
import {
  IndexingFormConfig,
  NigoAddFormConfig,
} from '@nx-fixture/forms-kit/forms';
import { of } from 'rxjs';

@Component({
  selector: 'nx-fixture-workplace-pilot',
  standalone: false,
  template: '',
})
export class WorkplacePilotComponent {
  readonly indexing = IndexingFormConfig({
    mode: 'create',
    staticOptions: [{ label: 'Product', value: 'product' }],
    service: { loadInitialCaseTypes: () => ['new-business'] },
    reviewFn: () => false,
    productChangeFn: () => undefined,
    productOptionsFn: () => of([]),
    loading$: of(false),
    cases$: of([]),
    panelHeaderTemplate: {} as TemplateRef<unknown>,
    caseColumns: ['caseNumber', 'status'],
    canAddCaseType: true,
    unsafeOwnerFilter: undefined,
  });

  readonly nigo = NigoAddFormConfig({
    caseTypeName: 'Document review',
    className: 'feature-layout',
    searchFn: () => of([]),
    uniqueRelatedForms: [{ label: 'Order entry', value: 'order-entry' }],
    customNigoReasons: [],
    isDialogForm: false,
    relatedFormsOptions: [],
    updateRelatedFormsOptions: () => undefined,
  });
}
