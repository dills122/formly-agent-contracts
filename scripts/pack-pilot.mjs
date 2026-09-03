import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { verifyPackedWorkspaceManifest } from "./check-workspace-consumers.mjs";
import { verifyPackedPackage } from "./pack-release.mjs";
import { loadReleaseManifest } from "./release-manifest.mjs";
import {
  PNPM_EXECUTABLE,
  hasWorkspaceDependency,
  readPackedManifest,
} from "./tarball.mjs";

const execFile = promisify(execFileCallback);
const PILOT_PACKAGE_NAMES = [
  "@formly-contract/angular",
  "@formly-contract/schema",
  "@formly-contract/compiler",
  "@formly-contract/workspace",
];
const PILOT_PNPMFILE = "formly-contract-pilot.pnpmfile.cjs";
const WORKSPACE_PACKAGE_DIRECTORY = "packages/workspace";
const PILOT_CONSUMER_DEPENDENCIES = Object.freeze({
  "@angular/common": "20.3.29",
  "@angular/compiler": "20.3.29",
  "@angular/core": "20.3.29",
  "@angular/forms": "20.3.29",
  "@angular/platform-browser": "20.3.29",
  "@ngx-formly/core": "6.1.8",
  rxjs: "7.8.2",
  tslib: "2.8.1",
  "zone.js": "0.15.1",
});

export function createPilotConsumerManifest() {
  return {
    name: "formly-contract-pilot-consumer-smoke",
    version: "0.0.0",
    private: true,
    type: "module",
    dependencies: { ...PILOT_CONSUMER_DEPENDENCIES },
  };
}

export function createPilotBundleManifest(packages) {
  const sorted = [...packages].sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0
  );
  if (
    JSON.stringify(sorted.map(({ name }) => name).sort()) !==
    JSON.stringify([...PILOT_PACKAGE_NAMES].sort())
  ) {
    throw new Error(
      "Pilot bundle requires angular, compiler, schema, and workspace"
    );
  }
  const pnpmfileBytes = createPilotPnpmfile(sorted);
  return {
    schemaVersion: "2",
    packages: sorted.map(({ filename, name, sha256, version }) => ({
      name,
      version,
      filename,
      sha256,
    })),
    install: {
      packageManager: "pnpm",
      pnpmfile: {
        filename: PILOT_PNPMFILE,
        sha256: `sha256:${createHash("sha256")
          .update(pnpmfileBytes)
          .digest("hex")}`,
      },
      arguments: [
        `--config.pnpmfile=./${PILOT_PNPMFILE}`,
        "add",
        ...sorted.map(({ filename }) => `./${filename}`),
      ],
    },
  };
}

export function createPilotPnpmfile(packages) {
  const references = Object.fromEntries(
    packages.map(({ filename, name }) => [name, `file:./${filename}`])
  );
  return `"use strict";

const bundledDependencies = Object.freeze(${JSON.stringify(references, null, 2)});
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

module.exports = {
  hooks: {
    readPackage(package_) {
      if (!hasOwn(bundledDependencies, package_.name)) return package_;
      for (const [name, reference] of Object.entries(bundledDependencies)) {
        for (const field of ["dependencies", "optionalDependencies"]) {
          if (package_[field] !== undefined && hasOwn(package_[field], name)) {
            package_[field][name] = reference;
          }
        }
        if (
          package_.peerDependencies !== undefined &&
          hasOwn(package_.peerDependencies, name)
        ) {
          delete package_.peerDependencies[name];
          package_.dependencies = { ...package_.dependencies, [name]: reference };
        }
      }
      return package_;
    },
  },
};
`;
}

async function verifyPilotBundleConsumer(manifest, bundleDirectory) {
  const consumerRoot = await mkdtemp(
    join(tmpdir(), "formly-contract-pilot-consumer-")
  );
  try {
    await writeFile(
      join(consumerRoot, "package.json"),
      `${JSON.stringify(createPilotConsumerManifest(), null, 2)}\n`
    );
    for (const package_ of manifest.packages) {
      await copyFile(
        join(bundleDirectory, package_.filename),
        join(consumerRoot, package_.filename)
      );
    }
    const pnpmfilePath = join(
      bundleDirectory,
      manifest.install.pnpmfile.filename
    );
    const pnpmfileBytes = await readFile(pnpmfilePath);
    const pnpmfileSha256 = `sha256:${createHash("sha256")
      .update(pnpmfileBytes)
      .digest("hex")}`;
    if (pnpmfileSha256 !== manifest.install.pnpmfile.sha256) {
      throw new Error("Pilot pnpm hook does not match its manifest checksum");
    }
    await copyFile(
      pnpmfilePath,
      join(consumerRoot, manifest.install.pnpmfile.filename)
    );

    await execFile(PNPM_EXECUTABLE, manifest.install.arguments, {
      cwd: consumerRoot,
      maxBuffer: 10 * 1024 * 1024,
    });
    const imported = await execFile(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        "const module = await import('@formly-contract/angular/jit'); if (typeof module.runAngularWorkspace !== 'function') process.exit(1);",
      ],
      { cwd: consumerRoot }
    );
    if (imported.stderr !== "") {
      throw new Error(
        `Angular JIT import smoke wrote to stderr: ${imported.stderr}`
      );
    }

    const cli = await execFile(
      PNPM_EXECUTABLE,
      ["exec", "formly-contracts-angular", "--help"],
      { cwd: consumerRoot, maxBuffer: 10 * 1024 * 1024 }
    );
    if (!cli.stdout.startsWith("Usage: formly-contracts <command>")) {
      throw new Error("Angular pilot CLI smoke did not print expected help");
    }
  } finally {
    await rm(consumerRoot, { force: true, recursive: true });
  }
}

async function packPackage(
  rootDirectory,
  packageDirectory,
  destination,
  releasePackage
) {
  const { stdout } = await execFile(
    PNPM_EXECUTABLE,
    [
      "--dir",
      join(rootDirectory, packageDirectory),
      "pack",
      "--json",
      "--pack-destination",
      destination,
    ],
    { cwd: rootDirectory }
  );
  const parsed = JSON.parse(stdout);
  const result = Array.isArray(parsed) ? parsed[0] : parsed;
  const tarballPath = resolve(result.filename);
  const manifest = await readPackedManifest(tarballPath);
  if (hasWorkspaceDependency(manifest)) {
    throw new Error(`${manifest.name} tarball contains workspace dependencies`);
  }
  if (manifest.name === "@formly-contract/workspace") {
    verifyPackedWorkspaceManifest(manifest);
  } else if (releasePackage !== undefined) {
    verifyPackedPackage({
      packedFiles: result.files,
      packedManifest: manifest,
      releasePackage,
    });
  }
  const bytes = await readFile(tarballPath);
  return {
    name: manifest.name,
    version: manifest.version,
    filename: basename(tarballPath),
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
}

export async function packPilotBundle({ destinationDirectory, rootDirectory } = {}) {
  if (destinationDirectory === undefined) {
    throw new Error("destinationDirectory is required");
  }
  const root = resolve(
    rootDirectory ?? dirname(dirname(fileURLToPath(import.meta.url)))
  );
  const destination = resolve(destinationDirectory);
  await mkdir(destination, { recursive: true });
  const release = await loadReleaseManifest({ rootDirectory: root });
  const packagesByName = new Map(
    release.packages.map((releasePackage) => [
      releasePackage.name,
      releasePackage,
    ])
  );
  packagesByName.set("@formly-contract/workspace", {
    directory: WORKSPACE_PACKAGE_DIRECTORY,
    name: "@formly-contract/workspace",
  });

  const packages = [];
  for (const name of PILOT_PACKAGE_NAMES) {
    const selectedPackage = packagesByName.get(name);
    if (selectedPackage === undefined) {
      throw new Error(`Pilot package is unavailable: ${name}`);
    }
    packages.push(
      await packPackage(
        root,
        selectedPackage.directory,
        destination,
        selectedPackage.version === undefined ? undefined : selectedPackage
      )
    );
  }
  const manifest = createPilotBundleManifest(packages);
  await writeFile(
    join(destination, manifest.install.pnpmfile.filename),
    createPilotPnpmfile(manifest.packages)
  );
  const manifestPath = join(destination, "formly-contract-pilot.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await verifyPilotBundleConsumer(manifest, destination);
  return { manifest, manifestPath };
}

function parseArguments(arguments_) {
  if (arguments_.length === 0) {
    return {};
  }
  if (arguments_.length !== 2 || arguments_[0] !== "--destination") {
    throw new Error("Usage: pack-pilot.mjs [--destination <directory>]");
  }
  return { destinationDirectory: arguments_[1] };
}

async function main() {
  const { destinationDirectory } = parseArguments(process.argv.slice(2));
  const temporaryDirectory =
    destinationDirectory === undefined
      ? await mkdtemp(join(tmpdir(), "formly-contract-pilot-check-"))
      : undefined;
  try {
    const result = await packPilotBundle({
      destinationDirectory: destinationDirectory ?? temporaryDirectory,
    });
    console.log(
      destinationDirectory === undefined
        ? "Verified four-package pilot bundle and Angular consumer."
        : `Packed pilot bundle: ${result.manifestPath}`
    );
  } finally {
    if (temporaryDirectory !== undefined) {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  }
}

const scriptPath = process.argv[1];
if (
  scriptPath !== undefined &&
  relative(resolve(scriptPath), fileURLToPath(import.meta.url)) === ""
) {
  await main();
}
