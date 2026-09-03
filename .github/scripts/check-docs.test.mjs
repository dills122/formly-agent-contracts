import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { validateDocumentation } from './check-docs.mjs';

const temporaryDirectories = [];
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

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
  it('teaches paired custom-field authoring as the primary supported flow', async () => {
    const guide = await readFile(
      join(repositoryRoot, 'apps/docs/src/content/docs/start/end-to-end.md'),
      'utf8',
    );
    const definition = guide.indexOf(
      'export const FIXTURE_COOL_RADIO_TYPE = defineContractedFormlyType({',
    );

    expect(definition).toBeGreaterThan(-1);
    expect(guide.indexOf('FormlyModule.forChild({')).toBeGreaterThan(
      definition,
    );
    expect(guide.indexOf('buildFieldTypeProfileRegistry({')).toBeGreaterThan(
      definition,
    );
    expect(guide).toContain('toFormlyTypeRegistration(');
    expect(guide).toContain('defineContractedFormlyWrapper({');
    expect(guide).not.toContain('For a new standalone Formly v7 application');
    expect(guide).not.toContain('predates the compact contracted-type helper');
    expect(guide).not.toContain(
      'Wrapper profiles still use the explicit registry surface today',
    );
  });

  it('keeps custom-field capabilities and compatibility claims consistent', async () => {
    const [reference, installation, readme] = await Promise.all([
      readFile(
        join(
          repositoryRoot,
          'apps/docs/src/content/docs/reference/field-profiles.md',
        ),
        'utf8',
      ),
      readFile(
        join(
          repositoryRoot,
          'apps/docs/src/content/docs/start/installation.md',
        ),
        'utf8',
      ),
      readFile(join(repositoryRoot, 'README.md'), 'utf8'),
    ]);

    for (const helper of [
      'radioChoice(options?)',
      'choiceControl(options?)',
      'typedInput(options)',
      'autocompleteChoice(options?)',
      'rowSelection(options?)',
      'repeater(options?)',
      'stepper(options?)',
    ]) {
      expect(reference).toContain(helper);
    }

    expect(reference).toContain(
      "Formly's `{ name, component }` registration alone cannot generate",
    );
    expect(reference).toContain('defineContractedFormlyWrapper({');
    expect(installation).toContain(
      'Angular 20.x for `@formly-contract/angular`',
    );
    expect(readme).not.toContain('Angular 20 or newer');
    expect(readme).not.toContain('beyond the current radio-choice path');
  });

  it('validates rendered site routes instead of source markdown paths', async () => {
    const root = await createFixture();
    await writeFixture(
      root,
      'apps/docs/src/content/docs/start/index.md',
      '# Start\n\n[Installation](./installation/)\n',
    );
    await writeFixture(
      root,
      'apps/docs/src/content/docs/start/installation.md',
      '# Installation\n',
    );

    expect(validateDocumentation(root)).toEqual([]);

    await writeFixture(
      root,
      'apps/docs/src/content/docs/start/index.md',
      '# Start\n\n[Installation](./installation.md)\n',
    );

    expect(validateDocumentation(root)).toContainEqual(
      expect.stringContaining('broken site route: ./installation.md'),
    );
  });

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
