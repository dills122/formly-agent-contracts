import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Test workspace consumers against package source without weakening the
  // published package's dist-only export boundary.
  // Source: https://vitest.dev/config/alias
  resolve: {
    alias: {
      '@formly-contract/contract-schema': fileURLToPath(
        new URL('./packages/contract-schema/src/index.ts', import.meta.url),
      ),
      '@formly-contract/formly-adapter': fileURLToPath(
        new URL('./packages/formly-adapter/src/index.ts', import.meta.url),
      ),
      '@formly-agent-contracts/workspace': fileURLToPath(
        new URL('./packages/workspace/src/index.ts', import.meta.url),
      ),
      '@formly-contract/synthetic-form': fileURLToPath(
        new URL('./fixtures/synthetic-form/src/index.ts', import.meta.url),
      ),
    },
  },
});
