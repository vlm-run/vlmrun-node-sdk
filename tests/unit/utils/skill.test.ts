import fs from "fs";
import os from "os";
import path from "path";
import {
  bundleFromDirectory,
  hashDirectory,
  parseSkillFrontmatter,
  resolveSkillMetadata,
  writeSkillArchive,
  zipDirectory,
} from "../../../src/utils/skill";
import { AgentSkill } from "../../../src/client/types";

const makeSkillDir = (frontmatter: string | null = null): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-"));
  const body =
    frontmatter === null ? "# Skill body\n" : `${frontmatter}\n# Skill body\n`;
  fs.writeFileSync(path.join(dir, "SKILL.md"), body);
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.writeFileSync(path.join(dir, "scripts", "pipeline.py"), "print('hi')\n");
  return dir;
};

describe("skill utils", () => {
  describe("parseSkillFrontmatter", () => {
    it("parses name and description", () => {
      const dir = makeSkillDir(
        '---\nname: invoice-parser\ndescription: "Extracts invoice fields"\n---'
      );
      expect(parseSkillFrontmatter(path.join(dir, "SKILL.md"))).toEqual({
        name: "invoice-parser",
        description: "Extracts invoice fields",
      });
    });

    it("returns empty object when there is no frontmatter", () => {
      const dir = makeSkillDir();
      expect(parseSkillFrontmatter(path.join(dir, "SKILL.md"))).toEqual({});
    });
  });

  describe("resolveSkillMetadata", () => {
    it("prefers overrides over frontmatter", () => {
      const dir = makeSkillDir(
        "---\nname: from-frontmatter\ndescription: from frontmatter\n---"
      );
      expect(resolveSkillMetadata(dir, { name: "override" })).toEqual({
        name: "override",
        description: "from frontmatter",
      });
    });

    it("falls back to the directory name", () => {
      const dir = makeSkillDir();
      expect(resolveSkillMetadata(dir)).toEqual({
        name: path.basename(dir),
        description: undefined,
      });
    });

    it("throws when SKILL.md is missing", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-empty-"));
      expect(() => resolveSkillMetadata(dir)).toThrow(/SKILL.md not found/);
    });
  });

  describe("zipDirectory", () => {
    it("produces a zip archive containing every file path", () => {
      const dir = makeSkillDir("---\nname: zipped\n---");
      const zip = zipDirectory(dir);

      expect(zip.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
      const text = zip.toString("latin1");
      expect(text).toContain("SKILL.md");
      expect(text).toContain("scripts/pipeline.py");
    });

    it("is deterministic for identical contents", () => {
      const dirA = makeSkillDir("---\nname: same\n---");
      const dirB = makeSkillDir("---\nname: same\n---");
      expect(bundleFromDirectory(dirA)).toEqual(bundleFromDirectory(dirB));
      expect(hashDirectory(dirA)).toEqual(hashDirectory(dirB));
    });

    it("changes the hash when contents change", () => {
      const dir = makeSkillDir("---\nname: same\n---");
      const before = hashDirectory(dir);
      fs.writeFileSync(path.join(dir, "extra.txt"), "extra\n");
      expect(hashDirectory(dir)).not.toEqual(before);
    });
  });

  describe("writeSkillArchive", () => {
    it("writes a zip into the local archive cache", () => {
      const dir = makeSkillDir("---\nname: archived\n---");
      const zipPath = writeSkillArchive(dir, "archived");

      expect(zipPath).toContain(path.join(".vlmrun", "skill_archives"));
      expect(path.basename(zipPath)).toMatch(/^archived_[0-9a-f]{8}\.zip$/);
      expect(fs.existsSync(zipPath)).toBe(true);
    });
  });
});

describe("AgentSkill.fromDirectory", () => {
  it("creates an inline skill with a base64 bundle", () => {
    const dir = makeSkillDir(
      "---\nname: invoice-parser\ndescription: Extracts invoice fields\n---"
    );
    const skill = AgentSkill.fromDirectory(dir);

    expect(skill.type).toBe("inline");
    expect(skill.name).toBe("invoice-parser");
    expect(skill.description).toBe("Extracts invoice fields");

    const json = skill.toJSON();
    expect(json.source.data).toEqual(bundleFromDirectory(dir));
  });

  it("honours name and description overrides", () => {
    const dir = makeSkillDir("---\nname: from-frontmatter\n---");
    const skill = AgentSkill.fromDirectory(dir, {
      name: "custom",
      description: "custom description",
    });

    expect(skill.name).toBe("custom");
    expect(skill.description).toBe("custom description");
  });

  it("throws when SKILL.md is missing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-empty-"));
    expect(() => AgentSkill.fromDirectory(dir)).toThrow(/SKILL.md not found/);
  });
});
