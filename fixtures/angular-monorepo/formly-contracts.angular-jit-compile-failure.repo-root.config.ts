import { defineConfig } from '@formly-contract/workspace';

// The failure smoke runs from the repository root so generation observes the
// real workspace lockfile before the intentionally failing project is loaded.
export default defineConfig({
  projectConfigs: [
    'fixtures/angular-monorepo/angular-jit-compile-bad.project.ts',
  ],
  tsconfigPath: 'fixtures/angular-monorepo/tsconfig.json',
});
