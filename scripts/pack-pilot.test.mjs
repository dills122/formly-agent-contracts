import { describe, expect, it } from "vitest";

import { createPilotBundleManifest } from "./pack-pilot.mjs";

const packages = [
  {
    name: "@formly-contract/workspace",
    version: "0.1.0",
    filename: "formly-contract-workspace-0.1.0.tgz",
    sha256: `sha256:${"c".repeat(64)}`,
  },
  {
    name: "@formly-contract/schema",
    version: "0.4.0",
    filename: "formly-contract-schema-0.4.0.tgz",
    sha256: `sha256:${"a".repeat(64)}`,
  },
  {
    name: "@formly-contract/compiler",
    version: "0.4.0",
    filename: "formly-contract-compiler-0.4.0.tgz",
    sha256: `sha256:${"b".repeat(64)}`,
  },
];

describe("createPilotBundleManifest", () => {
  it("creates deterministic metadata and a copy-pasteable pnpm install", () => {
    const manifest = createPilotBundleManifest(packages);

    expect(manifest.packages.map(({ name }) => name)).toEqual([
      "@formly-contract/compiler",
      "@formly-contract/schema",
      "@formly-contract/workspace",
    ]);
    expect(manifest.install).toEqual({
      packageManager: "pnpm",
      arguments: [
        "add",
        "./formly-contract-compiler-0.4.0.tgz",
        "./formly-contract-schema-0.4.0.tgz",
        "./formly-contract-workspace-0.1.0.tgz",
      ],
    });
  });

  it("rejects an incomplete bundle", () => {
    expect(() => createPilotBundleManifest(packages.slice(1))).toThrow(
      "requires schema, compiler, and workspace"
    );
  });
});
