import { execFile as execFileCallback } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { loadReleaseManifest } from "./release-manifest.mjs";
import {
  PNPM_EXECUTABLE,
  hasWorkspaceDependency,
  readPackedManifest,
} from "./tarball.mjs";

const execFile = promisify(execFileCallback);
const WORKSPACE_PACKAGE_NAME = "@formly-contract/workspace";
const CLI_RELATIVE_PATH = "dist/cli-main.js";

export function verifyPackedWorkspaceManifest(manifest) {
  if (manifest.name !== WORKSPACE_PACKAGE_NAME) {
    throw new Error(`Packed package must be ${WORKSPACE_PACKAGE_NAME}`);
  }
  if (manifest.bin?.["formly-contracts"] !== `./${CLI_RELATIVE_PATH}`) {
    throw new Error(
      "Packed workspace package must expose the formly-contracts binary"
    );
  }
  if (hasWorkspaceDependency(manifest)) {
    throw new Error(
      "Packed workspace package must not contain workspace: dependency ranges"
    );
  }
}

export function createPackedConsumerManifest(packages) {
  const byName = new Map(packages.map((package_) => [package_.name, package_]));
  const schema = byName.get("@formly-contract/schema");
  const compiler = byName.get("@formly-contract/compiler");
  const workspace = byName.get(WORKSPACE_PACKAGE_NAME);
  if (
    schema === undefined ||
    compiler === undefined ||
    workspace === undefined
  ) {
    throw new Error("Packed smoke requires schema, compiler, and workspace");
  }

  const fileReference = (package_) => `file:${package_.tarballPath}`;
  return {
    name: "formly-contract-packed-consumer-smoke",
    version: "0.0.0",
    private: true,
    type: "module",
    dependencies: {
      "@angular/common": "20.3.29",
      "@angular/compiler": "20.3.29",
      "@angular/core": "20.3.29",
      "@angular/forms": "20.3.29",
      "@formly-contract/compiler": fileReference(compiler),
      "@formly-contract/schema": fileReference(schema),
      "@formly-contract/workspace": fileReference(workspace),
      "@ngx-formly/core": "6.1.8",
      rxjs: "7.8.2",
      tslib: "2.8.1",
    },
    devDependencies: {
      "@angular/compiler-cli": "20.3.29",
      typescript: "5.9.3",
    },
  };
}

export function createPackedConsumerWorkspace(packages) {
  const byName = new Map(packages.map((package_) => [package_.name, package_]));
  const schema = byName.get("@formly-contract/schema");
  const compiler = byName.get("@formly-contract/compiler");
  if (schema === undefined || compiler === undefined) {
    throw new Error("Packed smoke requires schema and compiler overrides");
  }
  const override = (package_) =>
    `  ${JSON.stringify(
      `${package_.name}@${package_.version}`
    )}: ${JSON.stringify(`file:${package_.tarballPath}`)}`;
  return [
    "packages:",
    "  - .",
    "overrides:",
    override(schema),
    override(compiler),
    "",
  ].join("\n");
}

async function writeText(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

async function writeJson(path, value) {
  await writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runPnpm(arguments_, options = {}) {
  return execFile(PNPM_EXECUTABLE, arguments_, {
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });
}

export function createConsumerInstallArguments(consumerRoot) {
  return [
    "--dir",
    consumerRoot,
    "install",
    "--prefer-offline",
    "--ignore-scripts",
    "--no-frozen-lockfile",
  ];
}

async function installConsumer(consumerRoot) {
  await runPnpm(createConsumerInstallArguments(consumerRoot), {
    cwd: consumerRoot,
  });
}

async function runConsumerCli(consumerRoot, arguments_, environment = {}) {
  return runPnpm(
    ["--dir", consumerRoot, "exec", "formly-contracts", ...arguments_],
    {
      cwd: consumerRoot,
      env: { ...process.env, ...environment },
    }
  );
}

export function verifyGeneratedContractArtifacts(index, artifact) {
  if (
    index.forms?.length !== 1 ||
    index.forms[0]?.formId !== "consumer.claim" ||
    typeof index.forms[0]?.contentHash !== "string" ||
    typeof index.contentHash !== "string"
  ) {
    throw new Error("Consumer smoke did not generate the expected form index");
  }
  if (
    artifact.formId !== "consumer.claim" ||
    typeof artifact.contentHash !== "string"
  ) {
    throw new Error("Consumer smoke generated an invalid contract artifact");
  }
  if (artifact.contentHash !== index.forms[0].contentHash) {
    throw new Error(
      "Consumer smoke contract hash does not match the workspace index"
    );
  }
  return {
    contractHash: artifact.contentHash,
    workspaceIndexHash: index.contentHash,
  };
}

async function assertGeneratedContract(consumerRoot, outputDirectory) {
  const indexPath = join(consumerRoot, outputDirectory, "workspace-index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const artifactPath = index.forms[0].artifactPath;
  const artifact = JSON.parse(
    await readFile(join(consumerRoot, artifactPath), "utf8")
  );
  return verifyGeneratedContractArtifacts(index, artifact);
}

async function seedLinkedConsumer(rootDirectory, consumerRoot) {
  await writeJson(join(consumerRoot, "package.json"), {
    name: "formly-contract-linked-consumer-smoke",
    version: "0.0.0",
    private: true,
    type: "module",
    dependencies: {
      "@angular/common": "20.3.29",
      "@angular/core": "20.3.29",
      "@angular/forms": "20.3.29",
      "@formly-contract/compiler": `link:${join(
        rootDirectory,
        "packages/compiler"
      )}`,
      "@formly-contract/schema": `link:${join(
        rootDirectory,
        "packages/schema"
      )}`,
      "@formly-contract/workspace": `link:${join(
        rootDirectory,
        "packages/workspace"
      )}`,
      "@ngx-formly/core": "6.1.8",
      rxjs: "7.8.2",
    },
  });
  await writeJson(join(consumerRoot, "tsconfig.json"), {
    compilerOptions: {
      baseUrl: ".",
      module: "ES2022",
      moduleResolution: "Bundler",
      paths: {
        "@consumer/forms": ["./src/forms.ts"],
      },
    },
  });
  await writeText(
    join(consumerRoot, "formly-contracts.config.ts"),
    `import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: ['projects/*.project.ts'],
  tsconfigPath: 'tsconfig.json',
  output: { directory: 'output' },
});
`
  );
  await writeText(
    join(consumerRoot, "projects/consumer.project.ts"),
    `import { defineFormContractProject } from '@formly-contract/workspace';
import { consumerSource } from '@consumer/forms';

export default defineFormContractProject({
  projectId: 'consumer',
  sources: [consumerSource],
});
`
  );
  await writeText(
    join(consumerRoot, "src/forms.ts"),
    `import { writeFileSync } from 'node:fs';
import { defineFormContractSource } from '@formly-contract/workspace';

export const consumerSource = defineFormContractSource({
  sourceId: 'consumer/forms',
  list: () => [{
    id: 'consumer.claim',
    create: () => {
      const marker = process.env.FORMLY_CONTRACT_FACTORY_MARKER;
      if (marker === undefined) throw new Error('Factory marker is required.');
      writeFileSync(marker, 'invoked');
      return { fields: [{ key: 'claimant.name', type: 'input' }] };
    },
  }],
});
`
  );
}

async function runLinkedSmoke(rootDirectory, temporaryDirectory) {
  const consumerRoot = join(temporaryDirectory, "linked-consumer");
  const markerPath = join(consumerRoot, "factory-invoked");
  await seedLinkedConsumer(rootDirectory, consumerRoot);
  await installConsumer(consumerRoot);

  const commonArguments = [
    "--workspace-root",
    consumerRoot,
    "--config",
    "formly-contracts.config.ts",
  ];
  const environment = { FORMLY_CONTRACT_FACTORY_MARKER: markerPath };
  const listed = await runConsumerCli(
    consumerRoot,
    ["list", ...commonArguments],
    environment
  );
  if (!listed.stdout.includes("consumer/forms")) {
    throw new Error("Linked list smoke did not report the configured source");
  }
  if (await exists(markerPath)) {
    throw new Error("Linked list smoke invoked a form factory");
  }

  await runConsumerCli(
    consumerRoot,
    ["generate", ...commonArguments],
    environment
  );
  if (!(await exists(markerPath))) {
    throw new Error("Linked generate smoke did not invoke the form factory");
  }
  await assertGeneratedContract(consumerRoot, "output");
  const checked = await runConsumerCli(
    consumerRoot,
    ["check", ...commonArguments],
    environment
  );
  if (!checked.stdout.includes("1 contract is current.")) {
    throw new Error("Linked check smoke did not validate current artifacts");
  }
}

async function packPackage(rootDirectory, packageDirectory, tarballDirectory) {
  const { stdout } = await runPnpm(
    [
      "--dir",
      join(rootDirectory, packageDirectory),
      "pack",
      "--json",
      "--pack-destination",
      tarballDirectory,
    ],
    { cwd: rootDirectory }
  );
  const parsed = JSON.parse(stdout);
  const packResult = Array.isArray(parsed) ? parsed[0] : parsed;
  const tarballPath = resolve(packResult.filename);
  const manifest = await readPackedManifest(tarballPath);
  return {
    name: manifest.name,
    version: manifest.version,
    tarballPath,
    manifest,
  };
}

async function verifyPackedWorkspaceCli(workspacePackage, temporaryDirectory) {
  verifyPackedWorkspaceManifest(workspacePackage.manifest);
  const extractionRoot = join(temporaryDirectory, "workspace-package");
  await mkdir(extractionRoot, { recursive: true });
  await execFile("tar", [
    "-xzf",
    workspacePackage.tarballPath,
    "--strip-components=1",
    "-C",
    extractionRoot,
  ]);
  const cliPath = join(extractionRoot, CLI_RELATIVE_PATH);
  const [cliBytes, cliStats] = await Promise.all([
    readFile(cliPath, "utf8"),
    stat(cliPath),
  ]);
  if (!cliBytes.startsWith("#!/usr/bin/env node\n")) {
    throw new Error("Packed workspace CLI must retain its Node shebang");
  }
  if (process.platform !== "win32" && (cliStats.mode & 0o111) === 0) {
    throw new Error("Packed workspace CLI must be executable");
  }
}

async function seedPackedConsumer(consumerRoot, packages) {
  await writeJson(
    join(consumerRoot, "package.json"),
    createPackedConsumerManifest(packages)
  );
  await writeText(
    join(consumerRoot, "pnpm-workspace.yaml"),
    createPackedConsumerWorkspace(packages)
  );
  await writeText(
    join(consumerRoot, "formly-contracts.config.ts"),
    `import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: ['consumer.project.ts'],
  tsconfigPath: 'tsconfig.json',
  sourceUsage: {
    convention: 'direct-root-call-v1',
    tsconfigPath: 'tsconfig.json',
  },
  output: { directory: 'output' },
});
`
  );
  await writeJson(join(consumerRoot, "tsconfig.json"), {
    compilerOptions: {
      experimentalDecorators: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: "ES2022",
    },
    files: ["src/claim.component.ts"],
  });
  await writeJson(join(consumerRoot, "tsconfig.angular.json"), {
    compilerOptions: {
      declaration: false,
      experimentalDecorators: true,
      module: "ES2022",
      moduleResolution: "Bundler",
      outDir: "angular-out",
      skipLibCheck: true,
      strict: true,
      target: "ES2022",
    },
    angularCompilerOptions: {
      compilationMode: "full",
      strictTemplates: true,
    },
    files: ["src/forms.module.ts"],
  });
  await writeText(
    join(consumerRoot, "src/claim.form.ts"),
    `export function createClaimForm(_input?: unknown): readonly object[] {
  return [{ key: 'claimant.name', type: 'input' }];
}
`
  );
  await writeText(
    join(consumerRoot, "src/claim.contract.ts"),
    `import { defineFormContractDefinition } from '@formly-contract/workspace';
import { createClaimForm } from './claim.form.js';

export const CLAIM_CONTRACT = defineFormContractDefinition({
  id: 'consumer.claim',
  create: () => ({ fields: createClaimForm() }),
  lineage: { rootSymbol: createClaimForm },
});
`
  );
  await writeText(
    join(consumerRoot, "src/claims.source.ts"),
    `import { defineFormContractSource } from '@formly-contract/workspace';
import { CLAIM_CONTRACT } from './claim.contract.js';

export const consumerSource = defineFormContractSource({
  sourceId: 'consumer/forms',
  list: () => [CLAIM_CONTRACT],
});
`
  );
  await writeText(
    join(consumerRoot, "src/field-type-profiles.ts"),
    `import {
  buildFieldTypeProfileRegistry,
  defineContractedFormlyType,
  radioChoice,
} from '@formly-contract/schema/field-type-authoring';

export const CONSUMER_RADIO_TYPE = defineContractedFormlyType({
  name: 'consumer-radio',
  profile: { id: 'consumer.radio', version: 1 },
  behavior: radioChoice(),
});

export const consumerFieldTypeProfiles = buildFieldTypeProfileRegistry({
  id: 'consumer.fields',
  version: 1,
  types: [CONSUMER_RADIO_TYPE],
});
`
  );
  await writeText(
    join(consumerRoot, "src/claim.component.ts"),
    `import { Component } from '@angular/core';
import { createClaimForm } from './claim.form.js';

@Component({ selector: 'consumer-claim', template: '' })
export class ClaimComponent {
  readonly fields = createClaimForm({ live: true });
}
`
  );
  await writeText(
    join(consumerRoot, "src/cool-radio.component.ts"),
    `import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'consumer-radio',
  standalone: false,
  template: '<fieldset role="radiogroup"></fieldset>',
})
export class CoolRadioComponent extends FieldType<FieldTypeConfig> {}
`
  );
  await writeText(
    join(consumerRoot, "src/forms.module.ts"),
    `import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';
import { toFormlyTypeRegistration } from '@formly-contract/schema/field-type-authoring';
import { CoolRadioComponent } from './cool-radio.component.js';
import { CONSUMER_RADIO_TYPE } from './field-type-profiles.js';

@NgModule({
  declarations: [CoolRadioComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule.forRoot({
      types: [
        toFormlyTypeRegistration(CONSUMER_RADIO_TYPE, CoolRadioComponent),
      ],
    }),
  ],
})
export class ConsumerFormsModule {}
`
  );
  await writeText(
    join(consumerRoot, "consumer.project.ts"),
    `import { defineFormContractProject } from '@formly-contract/workspace';
import { consumerSource } from './src/claims.source.js';
import { consumerFieldTypeProfiles } from './src/field-type-profiles.js';

export default defineFormContractProject({
  projectId: 'consumer',
  sources: [consumerSource],
  fieldTypeProfiles: consumerFieldTypeProfiles,
});
`
  );
}

export function verifyGeneratedSourceUsageCatalog(catalog, expected) {
  if (catalog.workspaceIndex?.contentHash !== expected.workspaceIndexHash) {
    throw new Error(
      "Packed consumer source usage has the wrong workspace index hash"
    );
  }
  if (!Array.isArray(catalog.usages) || catalog.usages.length !== 1) {
    throw new Error(
      "Packed consumer smoke must generate exactly one source usage"
    );
  }
  const exact = catalog.usages[0];
  if (
    exact?.projectId !== "consumer" ||
    exact?.invocation?.location?.path !== "src/claim.component.ts" ||
    exact?.resolution?.status !== "exact" ||
    exact.resolution.candidate?.form?.projectId !== "consumer" ||
    exact.resolution.candidate.form.formId !== "consumer.claim" ||
    exact.resolution.candidate.form.contractHash !== expected.contractHash
  ) {
    throw new Error(
      "Packed consumer smoke did not generate the expected exact source usage"
    );
  }
  const coverage = catalog.coverage;
  if (
    coverage?.status !== "incomplete" ||
    JSON.stringify(coverage.scope?.projectIds) !== '["consumer"]' ||
    JSON.stringify(coverage.scope?.includedPurposes) !==
      '["application","tooling"]' ||
    JSON.stringify(coverage.scope?.excludedPurposes) !== "[]" ||
    JSON.stringify(coverage.reasons) !== '["bounded-programs-mvp"]' ||
    JSON.stringify(coverage.evidenceRefs) !== "[]"
  ) {
    throw new Error(
      "Packed consumer smoke did not retain the expected pilot coverage"
    );
  }
}

async function assertGeneratedSourceUsage(consumerRoot, expected) {
  const catalog = JSON.parse(
    await readFile(
      join(consumerRoot, "output/source-usage-catalog.json"),
      "utf8"
    )
  );
  verifyGeneratedSourceUsageCatalog(catalog, expected);
}

export function verifySourceUsageCliOutput(stdout) {
  if (!stdout.includes("Source usage: output/source-usage-catalog.json")) {
    throw new Error(
      "Packed consumer CLI did not report its source-usage catalog"
    );
  }
  if (stdout.includes("Source usage diagnostic")) {
    const diagnostics = stdout
      .split("\n")
      .filter((line) => line.startsWith("Source usage diagnostic"))
      .join("\n");
    throw new Error(
      `Packed consumer CLI emitted source-usage diagnostics:\n${diagnostics}`
    );
  }
}

async function runPackedSmoke(rootDirectory, temporaryDirectory) {
  const tarballDirectory = join(temporaryDirectory, "tarballs");
  await mkdir(tarballDirectory, { recursive: true });
  const release = await loadReleaseManifest({ rootDirectory });
  const packageDirectories = release.packages.map(({ directory }) => directory);
  const packages = [];
  for (const packageDirectory of packageDirectories) {
    packages.push(
      await packPackage(rootDirectory, packageDirectory, tarballDirectory)
    );
  }
  const workspacePackage = packages.find(
    ({ name }) => name === WORKSPACE_PACKAGE_NAME
  );
  if (workspacePackage === undefined) {
    throw new Error("Workspace tarball was not produced");
  }
  await verifyPackedWorkspaceCli(workspacePackage, temporaryDirectory);

  const consumerRoot = join(temporaryDirectory, "packed-consumer");
  await seedPackedConsumer(consumerRoot, packages);
  await installConsumer(consumerRoot);
  const installedWorkspace = await realpath(
    join(consumerRoot, "node_modules/@formly-contract/workspace")
  );
  if (
    installedWorkspace === rootDirectory ||
    installedWorkspace.startsWith(`${rootDirectory}/`)
  ) {
    throw new Error("Packed consumer resolved workspace code from the repo");
  }

  await runPnpm(
    ["--dir", consumerRoot, "exec", "ngc", "-p", "tsconfig.angular.json"],
    { cwd: consumerRoot }
  );

  const generation = await runConsumerCli(consumerRoot, [
    "generate",
    "--workspace-root",
    consumerRoot,
    "--config",
    "formly-contracts.config.ts",
  ]);
  verifySourceUsageCliOutput(generation.stdout);
  const expected = await assertGeneratedContract(consumerRoot, "output");
  await assertGeneratedSourceUsage(consumerRoot, expected);
}

export async function checkWorkspaceConsumers({ rootDirectory } = {}) {
  const resolvedRoot = resolve(
    rootDirectory ?? dirname(dirname(fileURLToPath(import.meta.url)))
  );
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "formly-contract-workspace-consumers-")
  );
  try {
    await runLinkedSmoke(resolvedRoot, temporaryDirectory);
    await runPackedSmoke(resolvedRoot, temporaryDirectory);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  await checkWorkspaceConsumers();
  console.log("Verified linked and packed workspace CLI consumers.");
}

const scriptPath = process.argv[1];
if (
  scriptPath !== undefined &&
  relative(resolve(scriptPath), fileURLToPath(import.meta.url)) === ""
) {
  await main();
}
