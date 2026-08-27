import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const workspaceDirectory = fileURLToPath(
  new URL('../../packages/workspace/', import.meta.url),
);
const workspacePackagePath = fileURLToPath(
  new URL('../../packages/workspace/package.json', import.meta.url),
);
const angularConfigPath = fileURLToPath(
  new URL(
    '../../fixtures/angular-monorepo/formly-contracts.config.ts',
    import.meta.url,
  ),
);
const angularBarrelPath = fileURLToPath(
  new URL(
    '../../fixtures/angular-monorepo/libs/formly-kit/src/index.ts',
    import.meta.url,
  ),
);
const nxConfigPath = fileURLToPath(
  new URL(
    '../../fixtures/nx-workspace/formly-contracts.config.ts',
    import.meta.url,
  ),
);
const nxBarrelPath = fileURLToPath(
  new URL(
    '../../fixtures/nx-workspace/libs/forms-kit/src/index.ts',
    import.meta.url,
  ),
);
const nxTsconfigPath = fileURLToPath(
  new URL('../../fixtures/nx-workspace/tsconfig.json', import.meta.url),
);

function childOutput(result) {
  return [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
}

function formatFailure(label, expectation, result) {
  const output = childOutput(result);
  return `${label}: ${expectation}\n${output || '(child produced no output)'}`;
}

function runFreshNode(source, cwd = repositoryRoot) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', source],
    {
      cwd,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status === null) {
    throw new Error(
      `${cwd}: child process ended without an exit status (${result.signal ?? 'unknown signal'})`,
    );
  }
  return result;
}

function requireSuccess(label, result) {
  if (result.status !== 0) {
    throw new Error(
      formatFailure(label, `expected exit 0, received ${result.status}`, result),
    );
  }
  process.stdout.write(`PASS ${label}\n`);
}

function requireFailure(label, result, patterns) {
  if (result.status === 0) {
    throw new Error(formatFailure(label, 'expected a nonzero exit', result));
  }

  const output = childOutput(result);
  for (const pattern of patterns) {
    if (!pattern.test(output)) {
      throw new Error(
        formatFailure(label, `expected output matching ${pattern}`, result),
      );
    }
  }
  process.stdout.write(`PASS ${label}\n`);
}

function readPackageVersion(require_, packageName) {
  const packagePath = require_.resolve(`${packageName}/package.json`);
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (typeof manifest.version !== 'string') {
    throw new Error(`${packagePath} does not declare a package version`);
  }
  return manifest.version;
}

function readPnpmVersion() {
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const result = spawnSync(command, ['--version'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      formatFailure(
        'pnpm environment check',
        `expected exit 0, received ${result.status ?? 'no status'}`,
        result,
      ),
    );
  }
  return result.stdout.trim();
}

function main() {
  const workspaceRequire = createRequire(workspacePackagePath);
  const fixtureRequire = createRequire(angularConfigPath);
  const jitiEntryUrl = pathToFileURL(
    workspaceRequire.resolve('jiti'),
  ).href;

  const versions = {
    angular: readPackageVersion(fixtureRequire, '@angular/compiler'),
    formly: readPackageVersion(fixtureRequire, '@ngx-formly/core'),
    jiti: readPackageVersion(workspaceRequire, 'jiti'),
    node: process.versions.node,
    pnpm: readPnpmVersion(),
  };
  process.stdout.write(
    `Environment Node ${versions.node} | pnpm ${versions.pnpm} | Jiti ${versions.jiti} | Angular ${versions.angular} | Formly ${versions.formly}\n`,
  );

  const angularWithoutCompiler = runFreshNode(`
    const { createJiti } = await import(${JSON.stringify(jitiEntryUrl)});
    const configPath = ${JSON.stringify(angularConfigPath)};
    const barrelPath = ${JSON.stringify(angularBarrelPath)};
    const loader = createJiti(configPath, {
      fsCache: false,
      interopDefault: false,
      moduleCache: false,
      tsconfigPaths: false,
    });
    await loader.import(barrelPath);
  `);
  requireFailure(
    'Angular barrel reports the partial-compilation JIT error without a compiler',
    angularWithoutCompiler,
    [
      /JIT compilation failed for injectable \[class PlatformLocation\]/u,
      /needs to be compiled using the JIT compiler/u,
      /partially compiled/u,
      /'@angular\/compiler' is not available/u,
    ],
  );

  const angularWithCompiler = runFreshNode(`
    const { createJiti } = await import(${JSON.stringify(jitiEntryUrl)});
    const configPath = ${JSON.stringify(angularConfigPath)};
    const barrelPath = ${JSON.stringify(angularBarrelPath)};
    const resolver = createJiti(configPath, {
      fsCache: false,
      interopDefault: false,
      moduleCache: false,
      tsconfigPaths: false,
    });
    const compilerUrl = resolver.esmResolve('@angular/compiler');
    if (!compilerUrl.startsWith('file:')) {
      throw new Error('Expected a config-relative file URL for @angular/compiler');
    }
    await import(compilerUrl);

    const loader = createJiti(configPath, {
      fsCache: false,
      interopDefault: false,
      moduleCache: false,
      tsconfigPaths: false,
    });
    const loaded = await loader.import(barrelPath);
    if (typeof loaded.FormlyKitModule !== 'function') {
      throw new Error('Angular fixture barrel did not export FormlyKitModule');
    }
  `);
  requireSuccess(
    'config-relative alias-free compiler preload loads the identical Angular barrel',
    angularWithCompiler,
  );

  const workspaceNativeImport = runFreshNode(
    `await import('@angular/compiler');`,
    workspaceDirectory,
  );
  requireFailure(
    'native compiler import from packages/workspace remains unresolved',
    workspaceNativeImport,
    [
      /ERR_MODULE_NOT_FOUND/u,
      /Cannot find package '@angular\/compiler'/u,
      new RegExp(workspaceDirectory.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')),
    ],
  );

  const nxWithCompilerAndPaths = runFreshNode(`
    const { createJiti } = await import(${JSON.stringify(jitiEntryUrl)});
    const configPath = ${JSON.stringify(nxConfigPath)};
    const barrelPath = ${JSON.stringify(nxBarrelPath)};
    const tsconfigPath = ${JSON.stringify(nxTsconfigPath)};
    const resolver = createJiti(configPath, {
      fsCache: false,
      interopDefault: false,
      moduleCache: false,
      tsconfigPaths: false,
    });
    await import(resolver.esmResolve('@angular/compiler'));

    const loader = createJiti(configPath, {
      fsCache: false,
      interopDefault: false,
      moduleCache: false,
      tsconfigPaths: tsconfigPath,
    });
    const loaded = await loader.import(barrelPath);
    if (typeof loaded.FormsKitModule !== 'function') {
      throw new Error('Nx fixture barrel did not export FormsKitModule');
    }
  `);
  requireSuccess(
    'Nx barrel loads with compiler preload and its tsconfig paths',
    nxWithCompilerAndPaths,
  );
}

const scriptPath = process.argv[1];
if (
  scriptPath !== undefined &&
  relative(resolve(scriptPath), fileURLToPath(import.meta.url)) === ''
) {
  main();
}
