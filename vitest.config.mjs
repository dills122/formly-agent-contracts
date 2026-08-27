import { fileURLToPath, URL } from 'node:url';

import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
  // Test workspace consumers against package source without weakening the
  // published package's dist-only export boundary.
  // Source: https://vitest.dev/config/alias
  resolve: {
    alias: {
      '@formly-contract/schema': fileURLToPath(
        new URL('./packages/schema/src/index.ts', import.meta.url),
      ),
      '@formly-contract/compiler': fileURLToPath(
        new URL('./packages/compiler/src/index.ts', import.meta.url),
      ),
      '@formly-contract/workspace': fileURLToPath(
        new URL('./packages/workspace/src/index.ts', import.meta.url),
      ),
      '@formly-contract/synthetic-form': fileURLToPath(
        new URL('./fixtures/synthetic-form/src/index.ts', import.meta.url),
      ),
    },
  },
});
