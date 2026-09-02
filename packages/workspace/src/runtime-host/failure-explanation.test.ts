import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createRuntimeHostFailureExplanation } from "./failure-explanation.js";

describe("runtime-host failure explanation", () => {
  it("bounds causes and retains workspace-relative frames only", () => {
    const workspaceRoot = join(process.cwd(), "fixtures", "consumer workspace");
    const sourcePath = join(
      workspaceRoot,
      "libs",
      "forms-kit",
      "src",
      "number.component.ts"
    );
    const privateExternalPath = "/Users/private/secret.ts";
    const inner = new ReferenceError(
      `Cannot access component before initialization\nforged-line ${workspaceRoot}`
    );
    inner.stack =
      `ReferenceError: failure\n` +
      `    at load (${sourcePath}:42:7)\n` +
      `    at external (${privateExternalPath}:1:2)`;
    const outer = new Error(`Unable to load ${workspaceRoot}`, {
      cause: inner,
    });

    const explanation = createRuntimeHostFailureExplanation(
      outer,
      workspaceRoot
    );

    expect(explanation.causes).toEqual([
      { name: "Error", message: "Unable to load ." },
      {
        name: "ReferenceError",
        message: "Cannot access component before initialization forged-line .",
      },
    ]);
    expect(explanation.frames).toEqual([
      {
        path: "libs/forms-kit/src/number.component.ts",
        line: 42,
        column: 7,
      },
    ]);
    expect(JSON.stringify(explanation)).not.toContain(workspaceRoot);
    expect(JSON.stringify(explanation)).not.toContain(privateExternalPath);
  });

  it("limits cause depth and message length without following cycles", () => {
    const fourth = new Error("fourth");
    const third = new Error("third", { cause: fourth });
    const second = new Error("second", { cause: third });
    const first = new Error("x".repeat(600), { cause: second });
    Object.defineProperty(fourth, "cause", { value: first });

    const explanation = createRuntimeHostFailureExplanation(
      first,
      process.cwd()
    );

    expect(explanation.causes).toHaveLength(3);
    expect(Array.from(explanation.causes[0]!.message)).toHaveLength(400);
    expect(explanation.causes[0]!.message.endsWith("…")).toBe(true);
    expect(explanation.causes.map(({ message }) => message)).toEqual([
      explanation.causes[0]!.message,
      "second",
      "third",
    ]);
  });

  it("redacts common absolute-path forms including spaces and Windows separators", () => {
    const error = new Error(
      "loader path=/private/Client Secret/source.ts; " +
        "cwd=C:\\Private\\Client Secret\\source.ts; " +
        "cache=C:/Users/Private Client/cache/file.js; " +
        'quoted="/Applications/Client Tools/loader.js"; ' +
        "single='/opt/Client Files/worker.mjs'; " +
        "from /var/Client Data/runtime.ts; " +
        "url=file:///Users/Private%20Client/module.ts"
    );

    const explanation = createRuntimeHostFailureExplanation(
      error,
      process.cwd()
    );

    expect(explanation.causes[0]!.message).toBe(
      "loader path=<external-path>; " +
        "cwd=<external-path>; " +
        "cache=<external-path>; " +
        'quoted="<external-path>"; ' +
        "single='<external-path>'; " +
        "from <external-path>; " +
        "url=<external-path>"
    );
    expect(explanation.causes[0]!.message).not.toMatch(
      /private|client|applications|users|worker\.mjs/iu
    );
  });

  it("represents non-Error throws without inspecting arbitrary properties", () => {
    expect(
      createRuntimeHostFailureExplanation(
        { message: "private object value" },
        process.cwd()
      )
    ).toEqual({
      causes: [{ name: "Error", message: "A non-Error value was thrown." }],
      frames: [],
    });
  });

  it("survives Error objects with hostile diagnostic accessors", () => {
    const error = new Error("hidden");
    for (const property of ["name", "message", "stack", "cause"] as const) {
      Object.defineProperty(error, property, {
        configurable: true,
        get: () => {
          throw new Error(`unexpected ${property} read`);
        },
      });
    }

    expect(
      createRuntimeHostFailureExplanation(error, process.cwd())
    ).toEqual({
      causes: [
        {
          name: "Error",
          message: "An Error with an unreadable message was thrown.",
        },
      ],
      frames: [],
    });
  });
});
