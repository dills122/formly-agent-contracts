import { describe, expect, it } from "vitest";

import * as workspace from "./index.js";

describe("workspace public entry point", () => {
  it("does not expose the caller-owned TypeScript Program indexer", () => {
    expect(workspace).not.toHaveProperty("indexWorkspaceSourceUsages");
    expect(workspace).not.toHaveProperty("generateFactoryInputScaffold");
  });
});
