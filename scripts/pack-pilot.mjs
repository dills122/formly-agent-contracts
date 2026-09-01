import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  "@formly-contract/schema",
  "@formly-contract/compiler",
  "@formly-contract/workspace",
];
const WORKSPACE_PACKAGE_DIRECTORY = "packages/workspace";

export function createPilotBundleManifest(packages) {
  const sorted = [...packages].sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0
  );
  if (
    JSON.stringify(sorted.map(({ name }) => name).sort()) !==
    JSON.stringify([...PILOT_PACKAGE_NAMES].sort())
  ) {
    throw new Error("Pilot bundle requires schema, compiler, and workspace");
  }
  return {
    schemaVersion: "1",
    packages: sorted.map(({ filename, name, sha256, version }) => ({
      name,
      version,
      filename,
      sha256,
    })),
    install: {
      packageManager: "pnpm",
      arguments: ["add", ...sorted.map(({ filename }) => `./${filename}`)],
    },
  };
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
  const manifestPath = join(destination, "formly-contract-pilot.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, manifestPath };
}

function parseArguments(arguments_) {
  if (arguments_.length !== 2 || arguments_[0] !== "--destination") {
    throw new Error("Usage: pack-pilot.mjs --destination <directory>");
  }
  return { destinationDirectory: arguments_[1] };
}

async function main() {
  const { destinationDirectory } = parseArguments(process.argv.slice(2));
  const result = await packPilotBundle({ destinationDirectory });
  console.log(`Packed pilot bundle: ${result.manifestPath}`);
}

const scriptPath = process.argv[1];
if (
  scriptPath !== undefined &&
  relative(resolve(scriptPath), fileURLToPath(import.meta.url)) === ""
) {
  await main();
}
