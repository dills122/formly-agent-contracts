import { defineFormContractDefinition } from '@formly-contract/workspace';
import { of } from 'rxjs';

import { NigoAddFormConfig, type NigoAddFormOptions } from './nigo-add-form.js';

function createReviewedNigoContractAdapter() {
  const options: NigoAddFormOptions = {
    caseTypeName: 'Fixture case type',
    className: 'fixture-layout',
    searchFn: () => of([]),
    uniqueRelatedForms: [{ label: 'Fixture form', value: 'fixture' }],
    customNigoReasons: [],
    isDialogForm: false,
    relatedFormsOptions: [],
    updateRelatedFormsOptions: () => undefined,
  };
  return { fields: NigoAddFormConfig(options), model: {} };
}

export const NX_WORKPLACE_NIGO_CONTRACT = defineFormContractDefinition({
  id: 'nx.workplace.nigo-add',
  create: createReviewedNigoContractAdapter,
  lineage: { rootSymbol: NigoAddFormConfig },
});
