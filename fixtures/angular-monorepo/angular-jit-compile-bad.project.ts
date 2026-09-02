import {
  defineFormContractProject,
  defineFormContractSource,
} from '@formly-contract/workspace';

const source = defineFormContractSource({
  sourceId: 'fixture-angular-jit-compile-bad/forms',
  list: () => [
    {
      id: 'fixture-angular-jit-compile-bad.form',
      create: () => {
        throw new TypeError('Intentional retained Angular compile failure.');
      },
    },
  ],
});

export default defineFormContractProject({
  projectId: 'fixture-angular-jit-compile-bad',
  sources: [source],
});
