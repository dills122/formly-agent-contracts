import type { TemplateRef } from '@angular/core';
import { defineFormContractDefinition } from '@formly-contract/workspace';
import { of } from 'rxjs';

import {
  IndexingFormConfig,
  type IndexingFormOptions,
} from './indexing-form.js';

function createReviewedIndexingContractAdapter() {
  const options: IndexingFormOptions = {
    mode: 'create',
    staticOptions: [{ label: 'Fixture product', value: 'fixture' }],
    service: { loadInitialCaseTypes: () => ['fixture'] },
    reviewFn: () => false,
    productChangeFn: () => undefined,
    productOptionsFn: () => of([]),
    loading$: of(false),
    cases$: of([]),
    panelHeaderTemplate: {} as TemplateRef<unknown>,
    caseColumns: ['id'],
    canAddCaseType: true,
    unsafeOwnerFilter: undefined,
  };
  return { fields: IndexingFormConfig(options), model: {} };
}

export const NX_WORKPLACE_INDEXING_CONTRACT = defineFormContractDefinition({
  id: 'nx.workplace.indexing',
  create: createReviewedIndexingContractAdapter,
  lineage: { rootSymbol: IndexingFormConfig },
});
