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
      id: 'fixture/nx-angular',
      version: '1.0.0',
      configSchemaVersion: '1',
      options: { application: 'fixture-nx-app', nxVersion: '23.1.1' },
    },
  ],
});
