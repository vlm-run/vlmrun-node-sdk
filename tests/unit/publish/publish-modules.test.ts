import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const { validateTarball } = require("../../../scripts/publish/validate-tarball.cjs");
const { prepareDist } = require("../../../scripts/publish/prepare-dist.cjs");

const repoRoot = path.join(__dirname, "../../..");

describe("prepareDist", () => {
  it("writes publish-root entrypoints into dist/package.json", () => {
    execFileSync("npm", ["run", "build"], { cwd: repoRoot, stdio: "pipe" });
    prepareDist(repoRoot);

    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "dist/package.json"), "utf8"));
    expect(pkg.main).toBe("./index.js");
    expect(pkg.module).toBe("./index.mjs");
    expect(pkg.types).toBe("./index.d.ts");
  });
});

describe("validateTarball", () => {
  it("accepts a tarball produced from prepared dist", () => {
    execFileSync("npm", ["run", "build"], { cwd: repoRoot, stdio: "pipe" });
    prepareDist(repoRoot);

    const tarballName = execFileSync("npm", ["pack", "--silent"], {
      cwd: path.join(repoRoot, "dist"),
      encoding: "utf8",
    }).trim();
    const tarballPath = path.join(repoRoot, "dist", tarballName);

    try {
      expect(() => validateTarball(tarballPath)).not.toThrow();
    } finally {
      fs.rmSync(tarballPath, { force: true });
    }
  });

  it("rejects tarballs with stale dist/ entrypoints", () => {
    const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "vlmrun-bad-tarball-"));
    const packageDir = path.join(extractDir, "package");
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(
      path.join(packageDir, "package.json"),
      JSON.stringify({
        main: "dist/index.js",
        module: "dist/index.mjs",
        types: "dist/index.d.ts",
      })
    );
    fs.writeFileSync(path.join(packageDir, "index.js"), "module.exports = { VlmRun: class {} };");

    const tarballPath = path.join(extractDir, "bad.tgz");
    execFileSync("tar", ["-czf", tarballPath, "-C", extractDir, "package"], { stdio: "pipe" });

    expect(() => validateTarball(tarballPath)).toThrow("stale entrypoint");
    fs.rmSync(extractDir, { recursive: true, force: true });
  });
});
