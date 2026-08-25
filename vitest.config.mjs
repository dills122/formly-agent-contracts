import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Test workspace consumers against package source without weakening the
  // published package's dist-only export boundary.
  // Source: https://vitest.dev/config/alias
  resolve: {
    alias: {
      '@formly-agent-contracts/contract-schema': fileURLToPath(
        new URL('./packages/contract-schema/src/index.ts', import.meta.url),
      ),
      '@formly-agent-contracts/formly-adapter': fileURLToPath(
        new URL('./packages/formly-adapter/src/index.ts', import.meta.url),
      ),
      '@formly-agent-contracts/synthetic-form': fileURLToPath(
        new URL('./fixtures/synthetic-form/src/index.ts', import.meta.url),
      ),
    },
  },
});
