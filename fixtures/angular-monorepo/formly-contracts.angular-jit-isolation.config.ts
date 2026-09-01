import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: [
    'angular-jit-proof.project.ts',
    'angular-jit-bad.project.ts',
  ],
  tsconfigPath: 'tsconfig.json',
});
