import path from "path";
import { execFileSync } from "child_process";

const { validateDistPackage } = require("../../../scripts/utils/validate-dist-package.cjs");

const fixturesRoot = path.join(__dirname, "../../fixtures/publish");
const repoRoot = path.join(__dirname, "../../..");

describe("validateDistPackage", () => {
  it("accepts a publish-root dist layout with valid entrypoints", () => {
    const output = execFileSync(
      "node",
      [
        path.join(repoRoot, "scripts/utils/validate-dist-package.cjs"),
        path.join(fixturesRoot, "valid-dist"),
      ],
      { encoding: "utf8" }
    );

    expect(output.trim()).toBe("validate-dist-package: OK");
  });

  it("rejects stale dist/ entrypoints like vlmrun@1.3.2", async () => {
    await expect(
      validateDistPackage(path.join(fixturesRoot, "stale-entrypoints-dist"))
    ).rejects.toThrow('package.json main still points under dist/: dist/index.js');
  });

  it("rejects missing entrypoint files", async () => {
    await expect(
      validateDistPackage(path.join(fixturesRoot, "missing-entry-file-dist"))
    ).rejects.toThrow("package.json main file missing: ./index.js");
  });

  it("rejects entries that do not export VlmRun", async () => {
    await expect(
      validateDistPackage(path.join(fixturesRoot, "missing-export-dist"))
    ).rejects.toThrow("CJS entry missing VlmRun export");
  });

  it("rejects missing package.json", async () => {
    await expect(
      validateDistPackage(path.join(fixturesRoot, "does-not-exist"))
    ).rejects.toThrow("missing");
  });
});
