import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';

import { describe, expect, it, vi } from 'vitest';

import { publishReleaseTarball } from './publish-release.mjs';

const manifest = {
  name: '@formly-contract/contract-schema',
  version: '0.4.0',
};
const tarball = Buffer.from('deterministic package bytes');
const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`;

describe('publishReleaseTarball', () => {
  it('publishes a package version that is not in the registry', async () => {
    const publish = vi.fn();

    const status = await publishReleaseTarball({
      getRegistryIntegrity: async () => undefined,
      manifest,
      npmTag: 'latest',
      publish,
      tarball,
      tarballPath: '/tmp/contract-schema.tgz',
    });

    expect(status).toBe('published');
    expect(publish).toHaveBeenCalledWith({
      npmTag: 'latest',
      tarballPath: '/tmp/contract-schema.tgz',
    });
  });

  it('skips an existing package version with identical integrity', async () => {
    const publish = vi.fn();

    const status = await publishReleaseTarball({
      getRegistryIntegrity: async () => integrity,
      manifest,
      npmTag: 'latest',
      publish,
      tarball,
      tarballPath: '/tmp/contract-schema.tgz',
    });

    expect(status).toBe('existing');
    expect(publish).not.toHaveBeenCalled();
  });

  it('rejects an existing version whose integrity differs', async () => {
    await expect(
      publishReleaseTarball({
        getRegistryIntegrity: async () => 'sha512-different',
        manifest,
        npmTag: 'latest',
        publish: vi.fn(),
        tarball,
        tarballPath: '/tmp/contract-schema.tgz',
      }),
    ).rejects.toThrow(
      '@formly-contract/contract-schema@0.4.0 already exists with different integrity',
    );
  });
});
