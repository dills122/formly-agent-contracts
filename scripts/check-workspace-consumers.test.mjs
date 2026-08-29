import { describe, expect, it } from "vitest";

import {
  createConsumerInstallArguments,
  createPackedConsumerManifest,
  createPackedConsumerWorkspace,
  verifyGeneratedContractArtifacts,
  verifyGeneratedSourceUsageCatalog,
  verifyPackedWorkspaceManifest,
  verifySourceUsageCliOutput,
} from "./check-workspace-consumers.mjs";

const generatedIndex = {
  contentHash: "sha256:index",
  forms: [
    {
      formId: "consumer.claim",
      contentHash: "sha256:contract",
      artifactPath: "output/consumer.claim.json",
    },
  ],
};

const generatedArtifact = {
  formId: "consumer.claim",
  contentHash: "sha256:contract",
};

const generatedSourceUsageCatalog = {
  workspaceIndex: { contentHash: "sha256:index" },
  coverage: {
    status: "incomplete",
    scope: {
      projectIds: ["consumer"],
      includedPurposes: ["application", "tooling"],
      excludedPurposes: [],
    },
    reasons: ["bounded-programs-mvp"],
    evidenceRefs: [],
  },
  usages: [
    {
      projectId: "consumer",
      invocation: { location: { path: "src/claim.component.ts" } },
      resolution: {
        status: "exact",
        candidate: {
          form: {
            projectId: "consumer",
            formId: "consumer.claim",
            contractHash: "sha256:contract",
          },
        },
      },
    },
  ],
};

describe("workspace consumer smoke helpers", () => {
  it("allows missing registry metadata while preferring cached consumer packages", () => {
    const arguments_ = createConsumerInstallArguments("/tmp/consumer");

    expect(arguments_).toContain("--prefer-offline");
    expect(arguments_).not.toContain("--offline");
  });

  it("creates a consumer manifest and root workspace overrides for local packages", () => {
    const packages = [
      {
        name: "@formly-contract/schema",
        version: "0.4.0",
        tarballPath: "/tmp/schema.tgz",
      },
      {
        name: "@formly-contract/compiler",
        version: "0.4.0",
        tarballPath: "/tmp/compiler.tgz",
      },
      {
        name: "@formly-contract/workspace",
        version: "0.1.0",
        tarballPath: "/tmp/workspace.tgz",
      },
    ];

    expect(createPackedConsumerManifest(packages)).toMatchObject({
      private: true,
      dependencies: {
        "@angular/compiler": "20.3.29",
        "@formly-contract/schema": "file:/tmp/schema.tgz",
        "@formly-contract/compiler": "file:/tmp/compiler.tgz",
        "@formly-contract/workspace": "file:/tmp/workspace.tgz",
        "@ngx-formly/core": "6.1.8",
        "@angular/common": "20.3.29",
        "@angular/core": "20.3.29",
        "@angular/forms": "20.3.29",
        rxjs: "7.8.2",
      },
      devDependencies: {
        "@angular/compiler-cli": "20.3.29",
        typescript: "5.9.3",
      },
    });
    expect(createPackedConsumerManifest(packages)).not.toHaveProperty("pnpm");
    expect(createPackedConsumerWorkspace(packages)).toBe(`packages:
  - .
overrides:
  "@formly-contract/schema@0.4.0": "file:/tmp/schema.tgz"
  "@formly-contract/compiler@0.4.0": "file:/tmp/compiler.tgz"
`);
  });

  it("accepts a packed workspace manifest with a runnable CLI and rewritten dependencies", () => {
    expect(() =>
      verifyPackedWorkspaceManifest({
        name: "@formly-contract/workspace",
        version: "0.1.0",
        bin: { "formly-contracts": "./dist/cli-main.js" },
        dependencies: {
          "@formly-contract/compiler": "0.4.0",
          "@formly-contract/schema": "0.4.0",
          jiti: "2.7.0",
        },
      })
    ).not.toThrow();
  });

  it("rejects workspace protocol dependencies in a packed CLI manifest", () => {
    expect(() =>
      verifyPackedWorkspaceManifest({
        name: "@formly-contract/workspace",
        version: "0.1.0",
        bin: { "formly-contracts": "./dist/cli-main.js" },
        dependencies: {
          "@formly-contract/compiler": "workspace:*",
        },
      })
    ).toThrow("must not contain workspace: dependency ranges");
  });

  it("rejects a packed workspace package without its CLI entry", () => {
    expect(() =>
      verifyPackedWorkspaceManifest({
        name: "@formly-contract/workspace",
        version: "0.1.0",
        dependencies: {
          "@formly-contract/compiler": "0.4.0",
        },
      })
    ).toThrow("must expose the formly-contracts binary");
  });

  it("joins the generated contract artifact to its workspace index entry", () => {
    expect(
      verifyGeneratedContractArtifacts(generatedIndex, generatedArtifact)
    ).toEqual({
      contractHash: "sha256:contract",
      workspaceIndexHash: "sha256:index",
    });

    expect(() =>
      verifyGeneratedContractArtifacts(generatedIndex, {
        ...generatedArtifact,
        contentHash: "sha256:stale",
      })
    ).toThrow("does not match the workspace index");
  });

  it("requires one exact source usage joined to the generated hashes and pilot coverage", () => {
    const expected = {
      contractHash: "sha256:contract",
      workspaceIndexHash: "sha256:index",
    };

    expect(() =>
      verifyGeneratedSourceUsageCatalog(generatedSourceUsageCatalog, expected)
    ).not.toThrow();

    expect(() =>
      verifyGeneratedSourceUsageCatalog(
        {
          ...generatedSourceUsageCatalog,
          usages: [
            ...generatedSourceUsageCatalog.usages,
            generatedSourceUsageCatalog.usages[0],
          ],
        },
        expected
      )
    ).toThrow("exactly one source usage");

    expect(() =>
      verifyGeneratedSourceUsageCatalog(
        {
          ...generatedSourceUsageCatalog,
          workspaceIndex: { contentHash: "sha256:stale" },
        },
        expected
      )
    ).toThrow("workspace index hash");

    expect(() =>
      verifyGeneratedSourceUsageCatalog(
        {
          ...generatedSourceUsageCatalog,
          coverage: {
            ...generatedSourceUsageCatalog.coverage,
            reasons: ["unexpected"],
          },
        },
        expected
      )
    ).toThrow("pilot coverage");
  });

  it("rejects source-usage diagnostics from the packed CLI run", () => {
    expect(() =>
      verifySourceUsageCliOutput(
        "Source usage: output/source-usage-catalog.json\n"
      )
    ).not.toThrow();
    expect(() =>
      verifySourceUsageCliOutput(
        "Source usage: output/source-usage-catalog.json\n" +
          "Source usage diagnostic [FORM_NOT_INDEXED] project=consumer\n"
      )
    ).toThrow("source-usage diagnostics");
  });
});
