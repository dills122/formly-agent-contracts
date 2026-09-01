import { defineFormContractProject } from '@formly-contract/workspace';
import { FormlyKitModule } from './libs/formly-kit/src/index.js';

if (typeof FormlyKitModule !== 'function') {
  throw new TypeError('Angular browser barrel did not expose FormlyKitModule.');
}

export default defineFormContractProject({
  projectId: 'fixture-angular-jit-proof',
});
