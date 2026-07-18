import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import JSZip from "jszip";
import {
  parseSkillFrontmatter,
  bundleFromDirectory,
  hashDirectory,
  writeZipFromDirectory,
} from "../../../src/client/skill_bundle";
import { AgentSkill } from "../../../src/client/types";

describe("skill_bundle", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-"));
    fs.writeFileSync(
      path.join(tmpDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A test skill\n---\n\n# My Skill\n"
    );
    fs.writeFileSync(path.join(tmpDir, "helper.py"), "print('hi')\n");
    fs.mkdirSync(path.join(tmpDir, "sub"));
    fs.writeFileSync(path.join(tmpDir, "sub", "data.txt"), "data\n");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("parseSkillFrontmatter", () => {
    it("extracts name and description", () => {
      const [name, description] = parseSkillFrontmatter(
        path.join(tmpDir, "SKILL.md")
      );
      expect(name).toBe("my-skill");
      expect(description).toBe("A test skill");
    });

    it("returns nulls when frontmatter is missing", () => {
      const noFm = path.join(tmpDir, "NOFM.md");
      fs.writeFileSync(noFm, "# no frontmatter here\n");
      expect(parseSkillFrontmatter(noFm)).toEqual([null, null]);
    });
  });

  describe("bundleFromDirectory", () => {
    it("produces a base64 zip containing all files", async () => {
      const b64 = await bundleFromDirectory(tmpDir);
      expect(typeof b64).toBe("string");

      const zip = await JSZip.loadAsync(Buffer.from(b64, "base64"));
      const names = Object.keys(zip.files).sort();
      expect(names).toContain("SKILL.md");
      expect(names).toContain("helper.py");
      expect(names).toContain("sub/data.txt");

      const skillMd = await zip.files["SKILL.md"].async("string");
      expect(skillMd).toContain("name: my-skill");
    });
  });

  describe("hashDirectory", () => {
    it("is stable across calls", () => {
      expect(hashDirectory(tmpDir)).toBe(hashDirectory(tmpDir));
    });

    it("changes when file contents change", () => {
      const before = hashDirectory(tmpDir);
      fs.writeFileSync(path.join(tmpDir, "helper.py"), "print('changed')\n");
      expect(hashDirectory(tmpDir)).not.toBe(before);
    });
  });

  describe("writeZipFromDirectory", () => {
    it("writes a readable zip archive to disk", async () => {
      const outPath = path.join(tmpDir, "out.zip");
      await writeZipFromDirectory(tmpDir, outPath);
      expect(fs.existsSync(outPath)).toBe(true);

      const zip = await JSZip.loadAsync(fs.readFileSync(outPath));
      expect(Object.keys(zip.files)).toContain("SKILL.md");
    });
  });

  describe("AgentSkill.fromDirectory", () => {
    it("builds an inline skill from a directory", async () => {
      const skill = await AgentSkill.fromDirectory(tmpDir);
      expect(skill.type).toBe("inline");
      expect(skill.name).toBe("my-skill");
      expect(skill.description).toBe("A test skill");
      expect(skill.source?.data).toBeTruthy();

      const json = skill.toJSON();
      expect(json.type).toBe("inline");
      expect(json.name).toBe("my-skill");
      expect(json.source.media_type).toBe("application/zip");
    });

    it("allows overriding name and description", async () => {
      const skill = await AgentSkill.fromDirectory(tmpDir, {
        name: "override",
        description: "override desc",
      });
      expect(skill.name).toBe("override");
      expect(skill.description).toBe("override desc");
    });

    it("throws when SKILL.md is missing", async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "empty-"));
      await expect(AgentSkill.fromDirectory(emptyDir)).rejects.toThrow(
        "SKILL.md not found"
      );
      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });
});
