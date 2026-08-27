import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: [
    'apps/**/formly-contracts.project.ts',
    'libs/**/formly-contracts.project.ts',
  ],
  tsconfigPath: 'tsconfig.json',
  output: { directory: 'dist/formly-contracts' },
  diagnostics: { failOn: ['error'] },
  plugins: [
    {
      id: 'fixture/angular',
      version: '1.0.0',
      configSchemaVersion: '1',
      options: {
        application: 'fixture-app',
        projectLayout: 'apps-and-libs',
      },
    },
  ],
});
