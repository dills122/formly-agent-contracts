import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: ['formly-contracts.project.ts'],
  tsconfigPath: 'tsconfig.json',
  output: { directory: 'dist/formly-contracts' },
  diagnostics: { failOn: ['error'] },
  plugins: [
    {
      id: 'fixture/angular-single-project',
      version: '1.0.0',
      configSchemaVersion: '1',
      options: { layout: 'single-project' },
    },
  ],
});
