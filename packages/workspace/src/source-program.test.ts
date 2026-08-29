import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createWorkspaceSourceProgram } from "./source-program.js";

const temporaryDirectories: string[] = [];

async function temporaryDirectory(label: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), label));
  temporaryDirectories.push(directory);
  return directory;
}

async function write(
  root: string,
  relativePath: string,
  contents: string
): Promise<void> {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("createWorkspaceSourceProgram", () => {
  it("creates one exact application program from the configured leaf tsconfig", async () => {
    const workspaceRoot = await temporaryDirectory("formly-source-program-");
    await write(
      workspaceRoot,
      "apps/test-app/tsconfig.app.json",
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
        },
        files: ["src/main.ts"],
      })
    );
    await write(
      workspaceRoot,
      "apps/test-app/src/main.ts",
      "import { createClaimForm } from '../../../libs/forms/src/claim.js';\ncreateClaimForm({ live: true });\n"
    );
    await write(
      workspaceRoot,
      "libs/forms/src/claim.ts",
      "export function createClaimForm(_input: unknown) { return []; }\n"
    );

    const descriptor = await createWorkspaceSourceProgram({
      workspaceRoot,
      programId: "workspace.application",
      purpose: "application",
      tsconfigPath: "apps/test-app/tsconfig.app.json",
    });

    expect(descriptor.programId).toBe("workspace.application");
    expect(descriptor.purpose).toBe("application");
    expect(
      descriptor.program
        .getSourceFiles()
        .map(({ fileName }) => fileName.replaceAll("\\", "/"))
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/apps\/test-app\/src\/main\.ts$/u),
        expect.stringMatching(/libs\/forms\/src\/claim\.ts$/u),
      ])
    );
  });

  it("rejects an unchecked application program with a stable safe error", async () => {
    const workspaceRoot = await temporaryDirectory("formly-source-program-");
    await write(
      workspaceRoot,
      "apps/test-app/tsconfig.app.json",
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noCheck: true,
          target: "ES2022",
        },
        files: ["src/main.ts"],
        privateWorkspaceValue: "must-not-escape",
      })
    );
    await write(
      workspaceRoot,
      "apps/test-app/src/main.ts",
      "export const privateApplicationValue = 'must-not-escape';\n"
    );

    let rejection: unknown;
    try {
      await createWorkspaceSourceProgram({
        workspaceRoot,
        programId: "workspace.application",
        purpose: "application",
        tsconfigPath: "apps/test-app/tsconfig.app.json",
      });
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toMatchObject({
      name: "WorkspaceSourceProgramError",
      code: "SOURCE_TSCONFIG_UNCHECKED",
      message:
        "The configured application source-usage program must enable type checking.",
    });
    expect(JSON.stringify(rejection)).not.toContain("must-not-escape");

    await expect(
      createWorkspaceSourceProgram({
        workspaceRoot,
        programId: "workspace.authority",
        purpose: "tooling",
        tsconfigPath: "apps/test-app/tsconfig.app.json",
      })
    ).resolves.toMatchObject({ purpose: "tooling" });
  });

  it("rejects missing, malformed, empty, and workspace-escaping tsconfigs or configured roots", async () => {
    const workspaceRoot = await temporaryDirectory("formly-source-program-");
    const outsideRoot = await temporaryDirectory("formly-source-outside-");
    await write(workspaceRoot, "malformed.json", "{");
    await write(workspaceRoot, "empty.json", JSON.stringify({ files: [] }));
    await write(
      workspaceRoot,
      "missing-root.json",
      JSON.stringify({ files: ["missing.ts"] })
    );
    await write(
      outsideRoot,
      "outside.json",
      JSON.stringify({ files: ["outside.ts"] })
    );
    await write(outsideRoot, "outside.ts", "export {};\n");
    await symlink(
      join(outsideRoot, "outside.json"),
      join(workspaceRoot, "link.json")
    );
    await symlink(
      join(outsideRoot, "outside.ts"),
      join(workspaceRoot, "outside-root.ts")
    );
    await write(
      workspaceRoot,
      "outside-root.json",
      JSON.stringify({ files: ["outside-root.ts"] })
    );

    for (const tsconfigPath of [
      "missing.json",
      "malformed.json",
      "empty.json",
      "link.json",
      "missing-root.json",
      "outside-root.json",
    ]) {
      await expect(
        createWorkspaceSourceProgram({
          workspaceRoot,
          programId: "workspace.application",
          purpose: "application",
          tsconfigPath,
        })
      ).rejects.toMatchObject({ name: "WorkspaceSourceProgramError" });
    }
  });

  it("rejects imported non-declaration sources that escape through a workspace symlink", async () => {
    const workspaceRoot = await temporaryDirectory("formly-source-program-");
    const outsideRoot = await temporaryDirectory("formly-source-outside-");
    await write(
      workspaceRoot,
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
        },
        files: ["src/main.ts"],
      })
    );
    await write(
      workspaceRoot,
      "src/main.ts",
      "import { outside } from './outside.js';\nexport const value = outside;\n"
    );
    await write(outsideRoot, "outside.ts", "export const outside = true;\n");
    await symlink(
      join(outsideRoot, "outside.ts"),
      join(workspaceRoot, "src/outside.ts")
    );

    await expect(
      createWorkspaceSourceProgram({
        workspaceRoot,
        programId: "workspace.application",
        purpose: "application",
        tsconfigPath: "tsconfig.json",
      })
    ).rejects.toMatchObject({
      code: "SOURCE_PROGRAM_SOURCE_OUTSIDE_WORKSPACE",
    });
  });

  it("rejects imported declaration sources that escape through a workspace symlink", async () => {
    const workspaceRoot = await temporaryDirectory("formly-source-program-");
    const outsideRoot = await temporaryDirectory("formly-source-outside-");
    await write(
      workspaceRoot,
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
        },
        files: ["src/main.ts"],
      })
    );
    await write(
      workspaceRoot,
      "src/main.ts",
      "import { outside } from './outside.js';\nexport const value = outside;\n"
    );
    await write(
      outsideRoot,
      "outside.d.ts",
      "export declare const outside: boolean;\n"
    );
    await symlink(
      join(outsideRoot, "outside.d.ts"),
      join(workspaceRoot, "src/outside.d.ts")
    );

    await expect(
      createWorkspaceSourceProgram({
        workspaceRoot,
        programId: "workspace.application",
        purpose: "application",
        tsconfigPath: "tsconfig.json",
      })
    ).rejects.toMatchObject({
      code: "SOURCE_PROGRAM_SOURCE_OUTSIDE_WORKSPACE",
    });
  });

  it("allows imported declaration packages from external node_modules targets", async () => {
    const workspaceRoot = await temporaryDirectory("formly-source-program-");
    const outsideRoot = await temporaryDirectory("formly-source-dependency-");
    await write(
      workspaceRoot,
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          preserveSymlinks: true,
          target: "ES2022",
        },
        files: ["src/main.ts"],
      })
    );
    await write(
      workspaceRoot,
      "src/main.ts",
      "import { external } from 'external-types';\nexport const value = external;\n"
    );
    await write(
      outsideRoot,
      "external-types/package.json",
      JSON.stringify({
        name: "external-types",
        version: "1.0.0",
        type: "module",
        types: "index.d.ts",
      })
    );
    await write(
      outsideRoot,
      "external-types/index.d.ts",
      "export declare const external: boolean;\n"
    );
    await mkdir(join(workspaceRoot, "node_modules"), { recursive: true });
    await symlink(
      join(outsideRoot, "external-types"),
      join(workspaceRoot, "node_modules/external-types")
    );

    const descriptor = await createWorkspaceSourceProgram({
      workspaceRoot,
      programId: "workspace.application",
      purpose: "application",
      tsconfigPath: "tsconfig.json",
    });

    expect(
      descriptor.program
        .getSourceFiles()
        .map(({ fileName }) => fileName.replaceAll("\\", "/"))
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/external-types\/index\.d\.ts$/u),
      ])
    );
  });

  it("adds only explicit registered config roots to the configured analysis program", async () => {
    const workspaceRoot = await temporaryDirectory("formly-source-program-");
    await write(
      workspaceRoot,
      "apps/test-app/tsconfig.app.json",
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
        },
        files: ["src/main.ts"],
      })
    );
    await write(workspaceRoot, "apps/test-app/src/main.ts", "export {};\n");
    await write(
      workspaceRoot,
      "libs/forms/formly-contracts.project.ts",
      "export { claimDefinition } from './src/claim.contract.js';\n"
    );
    await write(
      workspaceRoot,
      "libs/forms/src/claim.contract.ts",
      "export const claimDefinition = { id: 'claims.intake' };\n"
    );
    const descriptor = await createWorkspaceSourceProgram({
      workspaceRoot,
      programId: "workspace.application",
      purpose: "application",
      tsconfigPath: "apps/test-app/tsconfig.app.json",
      additionalRootPaths: ["libs/forms/formly-contracts.project.ts"],
    });
    const files = descriptor.program
      .getSourceFiles()
      .map(({ fileName }) => fileName.replaceAll("\\", "/"));

    expect(files).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/apps\/test-app\/src\/main\.ts$/u),
        expect.stringMatching(/libs\/forms\/formly-contracts\.project\.ts$/u),
        expect.stringMatching(/libs\/forms\/src\/claim\.contract\.ts$/u),
      ])
    );
  });

  it("creates an authority program from explicit registered roots when the tsconfig has no leaf files", async () => {
    const workspaceRoot = await temporaryDirectory("formly-source-program-");
    await write(
      workspaceRoot,
      "tsconfig.base.json",
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
        },
        files: [],
      })
    );
    await write(
      workspaceRoot,
      "libs/forms/formly-contracts.project.ts",
      "export { claimDefinition } from './src/claim.contract.js';\n"
    );
    await write(
      workspaceRoot,
      "libs/forms/src/claim.contract.ts",
      "export const claimDefinition = { id: 'claims.intake' };\n"
    );

    const descriptor = await createWorkspaceSourceProgram({
      workspaceRoot,
      programId: "workspace.authority",
      purpose: "tooling",
      tsconfigPath: "tsconfig.base.json",
      additionalRootPaths: ["libs/forms/formly-contracts.project.ts"],
    });

    expect(
      descriptor.program
        .getSourceFiles()
        .map(({ fileName }) => fileName.replaceAll("\\", "/"))
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/libs\/forms\/formly-contracts\.project\.ts$/u),
        expect.stringMatching(/libs\/forms\/src\/claim\.contract\.ts$/u),
      ])
    );
    await expect(
      createWorkspaceSourceProgram({
        workspaceRoot,
        programId: "workspace.empty",
        purpose: "tooling",
        tsconfigPath: "tsconfig.base.json",
      })
    ).rejects.toMatchObject({ code: "SOURCE_PROGRAM_EMPTY" });
  });

  it("can use tsconfig options without including its configured roots", async () => {
    const workspaceRoot = await temporaryDirectory("formly-source-program-");
    await write(
      workspaceRoot,
      "tsconfig.base.json",
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
        },
        files: ["src/application.ts"],
      })
    );
    await write(
      workspaceRoot,
      "src/application.ts",
      "export const app = true;\n"
    );
    await write(
      workspaceRoot,
      "libs/forms/formly-contracts.project.ts",
      "export { claimDefinition } from './src/claim.contract.js';\n"
    );
    await write(
      workspaceRoot,
      "libs/forms/src/claim.contract.ts",
      "export const claimDefinition = { id: 'claims.intake' };\n"
    );

    const descriptor = await createWorkspaceSourceProgram({
      workspaceRoot,
      programId: "workspace.authority",
      purpose: "tooling",
      tsconfigPath: "tsconfig.base.json",
      additionalRootPaths: ["libs/forms/formly-contracts.project.ts"],
      includeConfiguredRootPaths: false,
    });
    const rootFiles = descriptor.program
      .getRootFileNames()
      .map((fileName) => fileName.replaceAll("\\", "/"));
    const sourceFiles = descriptor.program
      .getSourceFiles()
      .map(({ fileName }) => fileName.replaceAll("\\", "/"));

    expect(rootFiles).toHaveLength(1);
    expect(rootFiles[0]).toMatch(
      /libs\/forms\/formly-contracts\.project\.ts$/u
    );
    expect(sourceFiles).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/libs\/forms\/src\/claim\.contract\.ts$/u),
      ])
    );
    expect(sourceFiles).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/src\/application\.ts$/u)])
    );
  });

  it("rejects missing and workspace-escaping additional roots", async () => {
    const workspaceRoot = await temporaryDirectory("formly-source-program-");
    const outsideRoot = await temporaryDirectory("formly-source-outside-");
    await write(
      workspaceRoot,
      "apps/test-app/tsconfig.app.json",
      JSON.stringify({ files: ["src/main.ts"] })
    );
    await write(workspaceRoot, "apps/test-app/src/main.ts", "export {};\n");
    await write(outsideRoot, "contracts.project.ts", "export {};\n");
    await symlink(
      join(outsideRoot, "contracts.project.ts"),
      join(workspaceRoot, "outside.project.ts")
    );

    await expect(
      createWorkspaceSourceProgram({
        workspaceRoot,
        programId: "workspace.application",
        purpose: "application",
        tsconfigPath: "apps/test-app/tsconfig.app.json",
        additionalRootPaths: ["missing.project.ts"],
      })
    ).rejects.toMatchObject({
      code: "SOURCE_ADDITIONAL_ROOT_UNAVAILABLE",
    });
    await expect(
      createWorkspaceSourceProgram({
        workspaceRoot,
        programId: "workspace.application",
        purpose: "application",
        tsconfigPath: "apps/test-app/tsconfig.app.json",
        additionalRootPaths: ["outside.project.ts"],
      })
    ).rejects.toMatchObject({
      code: "SOURCE_ADDITIONAL_ROOT_OUTSIDE_WORKSPACE",
    });
  });
});
