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
        throw new TypeError(
          'Intentional retained Angular compile failure: ' +
            'path=\\\\corp-server\\Private Share\\source.ts; ' +
            'namespace=\\\\?\\C:\\Private\\worker.mjs',
        );
      },
    },
  ],
});

export default defineFormContractProject({
  projectId: 'fixture-angular-jit-compile-bad',
  sources: [source],
});
