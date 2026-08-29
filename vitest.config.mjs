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
    alias: [
      {
        find: /^@formly-contract\/schema\/field-type-authoring$/u,
        replacement: fileURLToPath(
          new URL(
            './packages/schema/src/field-type-authoring.ts',
            import.meta.url,
          ),
        ),
      },
      {
        find: /^@formly-contract\/schema$/u,
        replacement: fileURLToPath(
          new URL('./packages/schema/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@formly-contract\/compiler$/u,
        replacement: fileURLToPath(
          new URL('./packages/compiler/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@formly-contract\/workspace$/u,
        replacement: fileURLToPath(
          new URL('./packages/workspace/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@formly-contract\/synthetic-form$/u,
        replacement: fileURLToPath(
          new URL('./fixtures/synthetic-form/src/index.ts', import.meta.url),
        ),
      },
    ],
  },
});
