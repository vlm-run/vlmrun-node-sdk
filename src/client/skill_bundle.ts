/**
 * Helpers for bundling local skill directories into base64-encoded zip archives.
 *
 * Mirrors the utilities in the Python SDK's `vlmrun.client.skills` module
 * (`parse_skill_frontmatter`, `bundle_from_directory`, `hash_directory`).
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import JSZip from "jszip";

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/;

/**
 * Extract `name` and `description` from a SKILL.md YAML frontmatter block.
 *
 * @param skillMd - Path to the SKILL.md file.
 * @returns Tuple of `[name, description]`, either of which may be `null` if the
 *   frontmatter is missing or does not contain the field.
 */
export function parseSkillFrontmatter(
  skillMd: string
): [string | null, string | null] {
  const text = fs.readFileSync(skillMd, "utf-8");
  const match = FRONTMATTER_RE.exec(text);
  let name: string | null = null;
  let description: string | null = null;
  if (match) {
    for (const line of match[1].split("\n")) {
      if (line.startsWith("name:")) {
        name = line.slice("name:".length).trim().replace(/^["']|["']$/g, "");
      } else if (line.startsWith("description:")) {
        description = line
          .slice("description:".length)
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  }
  return [name, description];
}

/**
 * Recursively collect all files in a directory, sorted by their POSIX-relative path.
 */
function collectFiles(directory: string): Array<{ abs: string; rel: string }> {
  const results: Array<{ abs: string; rel: string }> = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile()) {
        results.push({ abs, rel: path.relative(directory, abs).split(path.sep).join("/") });
      }
    }
  };
  walk(directory);
  results.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return results;
}

/**
 * Zip a skill directory into a base64-encoded bundle string.
 *
 * Walks `directory` recursively, adding every file with paths relative to
 * `directory`. The result is ready to be passed as `InlineSkillSource.data`.
 *
 * @param directory - Path to a skill folder.
 * @returns Base64-encoded zip bundle string.
 */
export async function bundleFromDirectory(directory: string): Promise<string> {
  const zip = new JSZip();
  for (const { abs, rel } of collectFiles(directory)) {
    zip.file(rel, fs.readFileSync(abs));
  }
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  return buffer.toString("base64");
}

/**
 * Zip a skill directory and write the archive to `outPath`.
 *
 * @param directory - Path to a skill folder.
 * @param outPath - Destination path for the generated zip file.
 */
export async function writeZipFromDirectory(
  directory: string,
  outPath: string
): Promise<void> {
  const zip = new JSZip();
  for (const { abs, rel } of collectFiles(directory)) {
    zip.file(rel, fs.readFileSync(abs));
  }
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  fs.writeFileSync(outPath, buffer);
}

/**
 * Compute a stable SHA-256 hex digest over all file contents in a directory.
 */
export function hashDirectory(directory: string): string {
  const hash = crypto.createHash("sha256");
  for (const { abs, rel } of collectFiles(directory)) {
    hash.update(rel);
    hash.update(fs.readFileSync(abs));
  }
  return hash.digest("hex");
}
