import { defineFormContractProject } from '@formly-contract/workspace';
import {
  NX_MICROGRID_CROSS_FIELD_EFFECTS,
  NX_MICROGRID_SOURCE,
} from '@nx-fixture/feature-lib/contracts';
import { NX_FIELD_TYPE_PROFILES } from '@nx-fixture/forms-kit/contracts';

export default defineFormContractProject({
  projectId: 'fixture-nx-feature-lib',
  sources: [NX_MICROGRID_SOURCE],
  fieldTypeProfiles: NX_FIELD_TYPE_PROFILES,
  crossFieldEffects: NX_MICROGRID_CROSS_FIELD_EFFECTS,
});
