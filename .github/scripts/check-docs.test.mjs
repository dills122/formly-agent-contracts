import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { validateDocumentation } from './check-docs.mjs';

const temporaryDirectories = [];

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'formly-contract-docs-'));
  temporaryDirectories.push(root);
  return root;
}

async function writeFixture(root, path, contents) {
  const target = join(root, path);
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});
describe('validateDocumentation', () => {
  it('accepts local files, heading fragments, repository links, and site routes', async () => {
    const root = await createFixture();
    await writeFixture(root, 'README.md', '# Project root\n');
    await writeFixture(
      root,
      'guide.md',
      [
        '# Guide',
        '[Root](./README.md#project-root)',
        '[Repository root](https://github.com/dills122/formly-contract/blob/main/README.md#project-root)',
        '',
      ].join('\n'),
    );
    await writeFixture(
      root,
      'apps/docs/src/content/docs/index.md',
      [
        '# Home',
        '<a href="./start/">Start</a>',
        '<a href="./reference/api/">API</a>',
        '',
      ].join('\n'),
    );
    await writeFixture(
      root,
      'apps/docs/src/content/docs/start/index.md',
      '# Start\n',
    );
    await writeFixture(
      root,
      'apps/docs/src/content/docs/reference/api.md',
      '# API\n',
    );

    expect(validateDocumentation(root)).toEqual([]);
  });

  it('reports broken files, fragments, repository paths, site routes, and whitespace', async () => {
    const root = await createFixture();
    await writeFixture(root, 'README.md', '# Project root\n');
    await writeFixture(
      root,
      'guide.md',
      [
        '# Guide',
        '[Missing file](./missing.md)',
        '[Missing fragment](./README.md#missing-heading)',
        '[Missing repository path](https://github.com/dills122/formly-contract/blob/main/docs/missing.md)',
        'Trailing space. ',
        '',
      ].join('\n'),
    );
    await writeFixture(
      root,
      'apps/docs/src/content/docs/index.md',
      '# Home\n<a href="./missing-route/">Missing route</a>\n',
    );

    const failures = validateDocumentation(root).join('\n');

    expect(failures).toContain('broken local link: ./missing.md');
    expect(failures).toContain('missing heading fragment: #missing-heading');
    expect(failures).toContain(
      'broken repository link: https://github.com/dills122/formly-contract/blob/main/docs/missing.md',
    );
    expect(failures).toContain('broken site route: ./missing-route/');
    expect(failures).toContain('trailing whitespace');
  });
});
