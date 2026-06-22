import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const { prepareDistPackageJson } = require("../../../scripts/publish/prepare-package-json.cjs");

const fixturePath = path.join(__dirname, "../../fixtures/publish/source-package.json");
const sourcePackage = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

describe("prepareDistPackageJson", () => {
  it("rewrites main/module/types from dist/ to publish-root paths", () => {
    const result = prepareDistPackageJson(sourcePackage);

    expect(result.main).toBe("./index.js");
    expect(result.module).toBe("./index.mjs");
    expect(result.types).toBe("./index.d.ts");
  });

  it("rewrites nested exports map paths", () => {
    const result = prepareDistPackageJson(sourcePackage);

    expect(result.exports).toEqual({
      ".": {
        import: "./index.mjs",
        require: "./index.js",
        types: "./index.d.ts",
      },
      "./utils": "./utils/index.js",
    });
  });

  it("strips publish-only metadata", () => {
    const result = prepareDistPackageJson(sourcePackage);

    expect(result.devDependencies).toBeUndefined();
    expect(result.scripts).toBeUndefined();
    expect(result.packageManager).toBeUndefined();
    expect(result.overrides).toBeUndefined();
  });

  it("does not mutate the input package.json object", () => {
    const input = JSON.parse(JSON.stringify(sourcePackage));

    prepareDistPackageJson(input);

    expect(input.main).toBe("dist/index.js");
    expect(input.scripts).toBeDefined();
    expect(input.devDependencies).toBeDefined();
  });

  it("handles packages without exports", () => {
    const result = prepareDistPackageJson({
      main: "dist/index.js",
      module: "dist/index.mjs",
      types: "dist/index.d.ts",
    });

    expect(result.exports).toBeUndefined();
    expect(result.main).toBe("./index.js");
  });
});

describe("prepare-package-json CLI", () => {
  it("prints publish-ready package.json for a fixture source package", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vlmrun-pkg-json-"));
    const pkgPath = path.join(tmpDir, "package.json");
    fs.writeFileSync(pkgPath, JSON.stringify(sourcePackage, null, 2));

    const output = execFileSync(
      "node",
      [path.join(__dirname, "../../../scripts/publish/prepare-package-json.cjs")],
      {
        cwd: path.join(__dirname, "../../.."),
        env: { ...process.env, PKG_JSON_PATH: pkgPath },
        encoding: "utf8",
      }
    );

    const parsed = JSON.parse(output);
    expect(parsed.main).toBe("./index.js");
    expect(parsed.module).toBe("./index.mjs");
    expect(parsed.types).toBe("./index.d.ts");
  });
});
