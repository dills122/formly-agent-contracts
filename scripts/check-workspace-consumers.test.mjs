import { describe, expect, it } from 'vitest';

import {
  createConsumerInstallArguments,
  createPackedConsumerManifest,
  verifyPackedWorkspaceManifest,
} from './check-workspace-consumers.mjs';

describe('workspace consumer smoke helpers', () => {
  it('allows missing registry metadata while preferring cached consumer packages', () => {
    const arguments_ = createConsumerInstallArguments('/tmp/consumer');

    expect(arguments_).toContain('--prefer-offline');
    expect(arguments_).not.toContain('--offline');
  });

  it('creates a consumer manifest with local package overrides', () => {
    expect(
      createPackedConsumerManifest([
        {
          name: '@formly-contract/schema',
          version: '0.4.0',
          tarballPath: '/tmp/schema.tgz',
        },
        {
          name: '@formly-contract/compiler',
          version: '0.4.0',
          tarballPath: '/tmp/compiler.tgz',
        },
        {
          name: '@formly-contract/workspace',
          version: '0.1.0',
          tarballPath: '/tmp/workspace.tgz',
        },
      ]),
    ).toMatchObject({
      private: true,
      dependencies: {
        '@formly-contract/schema': 'file:/tmp/schema.tgz',
        '@formly-contract/compiler': 'file:/tmp/compiler.tgz',
        '@formly-contract/workspace': 'file:/tmp/workspace.tgz',
        '@ngx-formly/core': '6.1.8',
        '@angular/common': '20.3.29',
        '@angular/core': '20.3.29',
        '@angular/forms': '20.3.29',
        rxjs: '7.8.2',
      },
      pnpm: {
        overrides: {
          '@formly-contract/schema@0.4.0': 'file:/tmp/schema.tgz',
          '@formly-contract/compiler@0.4.0': 'file:/tmp/compiler.tgz',
        },
      },
    });
  });

  it('accepts a packed workspace manifest with a runnable CLI and rewritten dependencies', () => {
    expect(() =>
      verifyPackedWorkspaceManifest({
        name: '@formly-contract/workspace',
        version: '0.1.0',
        bin: { 'formly-contracts': './dist/cli-main.js' },
        dependencies: {
          '@formly-contract/compiler': '0.4.0',
          '@formly-contract/schema': '0.4.0',
          jiti: '2.7.0',
        },
      }),
    ).not.toThrow();
  });

  it('rejects workspace protocol dependencies in a packed CLI manifest', () => {
    expect(() =>
      verifyPackedWorkspaceManifest({
        name: '@formly-contract/workspace',
        version: '0.1.0',
        bin: { 'formly-contracts': './dist/cli-main.js' },
        dependencies: {
          '@formly-contract/compiler': 'workspace:*',
        },
      }),
    ).toThrow('must not contain workspace: dependency ranges');
  });

  it('rejects a packed workspace package without its CLI entry', () => {
    expect(() =>
      verifyPackedWorkspaceManifest({
        name: '@formly-contract/workspace',
        version: '0.1.0',
        dependencies: {
          '@formly-contract/compiler': '0.4.0',
        },
      }),
    ).toThrow('must expose the formly-contracts binary');
  });
});
