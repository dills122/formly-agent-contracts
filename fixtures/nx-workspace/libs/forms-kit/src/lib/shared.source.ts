import {
  defineFormContractDefinition,
  defineFormContractSource,
} from "@formly-contract/workspace";

import type { NxFixtureFormInstance } from "./form-instance.js";
import { createNxSiteContactFragment } from "./contact.fragment.js";
import { createNxOrganizationFragment } from "./organization.fragment.js";

export function createNxSharedContactForm(): NxFixtureFormInstance {
  return {
    fields: createNxSiteContactFragment(),
    model: { contact: { preference: "portal" } },
  };
}

export function createNxSharedOrganizationForm(): NxFixtureFormInstance {
  return {
    fields: createNxOrganizationFragment(),
    model: { organization: { kind: "cooperative" } },
  };
}

const NX_SHARED_CONTACT_FORM = defineFormContractDefinition({
  id: "microgrid.shared.site-contact",
  create: createNxSharedContactForm,
});

const NX_SHARED_ORGANIZATION_FORM = defineFormContractDefinition({
  id: "microgrid.shared.organization-profile",
  create: createNxSharedOrganizationForm,
});

export const NX_SHARED_FORMS_SOURCE = defineFormContractSource({
  sourceId: "fixture/nx-microgrid-shared",
  list: () => [NX_SHARED_CONTACT_FORM, NX_SHARED_ORGANIZATION_FORM],
});
