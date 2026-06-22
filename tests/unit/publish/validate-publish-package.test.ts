import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const repoRoot = path.join(__dirname, "../../..");
const { prepareDist } = require("../../../scripts/publish/prepare-dist.cjs");

function runValidatePublish(skipBuild = true) {
  return execFileSync("node", [path.join(repoRoot, "scripts/publish/index.cjs")], {
    cwd: repoRoot,
    env: {
      ...process.env,
      SKIP_BUILD: skipBuild ? "1" : "0",
    },
    encoding: "utf8",
  });
}

describe("publish validation pipeline", () => {
  const tmpDist = path.join(os.tmpdir(), `vlmrun-publish-test-${process.pid}`);

  beforeAll(() => {
    execFileSync("npm", ["run", "build"], { cwd: repoRoot, stdio: "pipe" });
    execFileSync("node", [path.join(repoRoot, "scripts/publish/prepare-dist.cjs")], {
      cwd: repoRoot,
      stdio: "pipe",
    });
  });

  it("passes against the real built dist output", () => {
    const output = runValidatePublish(true);

    expect(output).toContain("publish: dist package prepared");
    expect(output).toContain("publish: dist layout OK");
    expect(output).toContain("publish: tarball metadata OK");
    expect(output).toContain("publish: consumer Vitest smoke OK");
    expect(output).toContain("publish: all checks passed");
  });

  it("fails when dist package.json has stale dist/ entrypoints", () => {
    prepareDist(repoRoot);
    fs.rmSync(tmpDist, { recursive: true, force: true });
    fs.cpSync(path.join(repoRoot, "dist"), tmpDist, { recursive: true });

    const stalePackage = JSON.parse(
      fs.readFileSync(path.join(tmpDist, "package.json"), "utf8")
    );
    stalePackage.main = "dist/index.js";
    stalePackage.module = "dist/index.mjs";
    stalePackage.types = "dist/index.d.ts";
    fs.writeFileSync(
      path.join(tmpDist, "package.json"),
      JSON.stringify(stalePackage, null, 2)
    );

    expect(() => {
      execFileSync("node", [path.join(repoRoot, "scripts/publish/validate-dist.cjs"), tmpDist], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: "pipe",
      });
    }).toThrow();
  });

  it("packed tarball metadata matches publish-root entrypoints", () => {
    prepareDist(repoRoot);

    const packOutput = execFileSync("npm", ["pack", "--silent"], {
      cwd: path.join(repoRoot, "dist"),
      encoding: "utf8",
    }).trim();

    const tarball = path.join(repoRoot, "dist", packOutput);
    const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "vlmrun-tarball-"));

    try {
      execFileSync("tar", ["-xzf", tarball, "-C", extractDir], { stdio: "pipe" });
      const pkg = JSON.parse(
        fs.readFileSync(path.join(extractDir, "package/package.json"), "utf8")
      );

      expect(pkg.main).toBe("./index.js");
      expect(pkg.module).toBe("./index.mjs");
      expect(pkg.types).toBe("./index.d.ts");
      expect(fs.existsSync(path.join(extractDir, "package/index.js"))).toBe(true);
      expect(fs.existsSync(path.join(extractDir, "package/index.mjs"))).toBe(true);
      expect(fs.existsSync(path.join(extractDir, "package/index.d.ts"))).toBe(true);
      expect(fs.existsSync(path.join(extractDir, "package/dist"))).toBe(false);
    } finally {
      fs.rmSync(extractDir, { recursive: true, force: true });
      fs.rmSync(tarball, { force: true });
    }
  });
});
