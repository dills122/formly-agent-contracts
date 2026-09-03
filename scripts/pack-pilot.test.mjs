import { describe, expect, it } from "vitest";

import {
  createPilotBundleManifest,
  createPilotConsumerManifest,
  createPilotPnpmfile,
} from "./pack-pilot.mjs";

const packages = [
  {
    name: "@formly-contract/angular",
    version: "0.1.0",
    filename: "formly-contract-angular-0.1.0.tgz",
    sha256: `sha256:${"d".repeat(64)}`,
  },
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

    expect(manifest.schemaVersion).toBe("2");
    expect(manifest.packages.map(({ name }) => name)).toEqual([
      "@formly-contract/angular",
      "@formly-contract/compiler",
      "@formly-contract/schema",
      "@formly-contract/workspace",
    ]);
    expect(manifest.install).toEqual({
      packageManager: "pnpm",
      pnpmfile: {
        filename: "formly-contract-pilot.pnpmfile.cjs",
        sha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      },
      arguments: [
        "--config.pnpmfile=./formly-contract-pilot.pnpmfile.cjs",
        "add",
        "./formly-contract-angular-0.1.0.tgz",
        "./formly-contract-compiler-0.4.0.tgz",
        "./formly-contract-schema-0.4.0.tgz",
        "./formly-contract-workspace-0.1.0.tgz",
      ],
    });
    expect(createPilotPnpmfile(manifest.packages)).toContain(
      '"@formly-contract/workspace": "file:./formly-contract-workspace-0.1.0.tgz"'
    );
  });

  it("rejects an incomplete bundle", () => {
    expect(() => createPilotBundleManifest(packages.slice(1))).toThrow(
      "requires angular, compiler, schema, and workspace"
    );
  });
});

describe("createPilotConsumerManifest", () => {
  it("pins the tested Angular and Formly compatibility stack", () => {
    expect(createPilotConsumerManifest().dependencies).toEqual({
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
  });
});
