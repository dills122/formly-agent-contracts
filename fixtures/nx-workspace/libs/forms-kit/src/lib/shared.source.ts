import {
  defineFormContractDefinition,
  defineFormContractSource,
} from "@formly-contract/workspace";

import type { NxFixtureFormInstance } from "./form-instance.js";
import { createNxContactFragment } from "./contact.fragment.js";

export function createNxSharedContactForm(): NxFixtureFormInstance {
  return {
    fields: createNxContactFragment(),
    model: {},
  };
}

const NX_SHARED_CONTACT_FORM = defineFormContractDefinition({
  id: "nx.shared.contact-preferences",
  create: createNxSharedContactForm,
});

export const NX_SHARED_FORMS_SOURCE = defineFormContractSource({
  sourceId: "fixture/nx-shared-forms",
  list: () => [NX_SHARED_CONTACT_FORM],
});
