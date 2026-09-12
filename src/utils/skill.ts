/**
 * Skill bundling helpers.
 *
 * Skills are shipped to the API as zip archives, either inline (base64 encoded
 * in the request body) or uploaded via the files API. These helpers mirror the
 * Python SDK's `vlmrun.client.skills` module.
 */

import { DependencyError } from "../client/exceptions";

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/;

const CRC_TABLE: number[] = (() => {
  const table: number[] = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buffer: Buffer): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const requireNode = (): {
  fs: any;
  path: any;
  zlib: any;
  crypto: any;
  os: any;
} => {
  if (typeof window !== "undefined") {
    throw new DependencyError(
      "Skill bundling is not supported in the browser",
      "browser_limitation",
      "Bundle the skill directory server-side and pass the base64 zip via `source.data`",
    );
  }
  return {
    fs: require("fs"),
    path: require("path"),
    zlib: require("zlib"),
    crypto: require("crypto"),
    os: require("os"),
  };
};

/**
 * Recursively collect every file in `directory`, sorted by POSIX-relative path.
 */
const walkFiles = (directory: string): { relPath: string; absPath: string }[] => {
  const { fs, path } = requireNode();
  const entries: { relPath: string; absPath: string }[] = [];

  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(absPath);
      } else if (entry.isFile()) {
        entries.push({
          relPath: path.relative(directory, absPath).split(path.sep).join("/"),
          absPath,
        });
      }
    }
  };

  walk(directory);
  return entries.sort((a, b) => (a.relPath < b.relPath ? -1 : 1));
};

/**
 * Extract `name` and `description` from a SKILL.md YAML frontmatter block.
 *
 * @param skillMdPath - Path to the SKILL.md file.
 * @returns The parsed name/description, either of which may be undefined.
 */
export const parseSkillFrontmatter = (
  skillMdPath: string,
): { name?: string; description?: string } => {
  const { fs } = requireNode();
  const text: string = fs.readFileSync(skillMdPath, "utf-8");
  const match = FRONTMATTER_RE.exec(text);
  if (!match) {
    return {};
  }

  const unquote = (value: string) => value.trim().replace(/^["']|["']$/g, "");
  let name: string | undefined;
  let description: string | undefined;
  for (const line of match[1].split("\n")) {
    if (line.startsWith("name:")) {
      name = unquote(line.slice("name:".length));
    } else if (line.startsWith("description:")) {
      description = unquote(line.slice("description:".length));
    }
  }
  return { name, description };
};

/**
 * Zip a directory into a buffer, with paths relative to `directory`.
 *
 * @param directory - Path to the directory to archive.
 * @returns The zip archive contents.
 */
export const zipDirectory = (directory: string): Buffer => {
  const { fs, zlib } = requireNode();

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  let count = 0;

  for (const { relPath, absPath } of walkFiles(directory)) {
    const nameBuffer = Buffer.from(relPath, "utf-8");
    const content: Buffer = fs.readFileSync(absPath);
    const compressed: Buffer = zlib.deflateRawSync(content);
    const crc = crc32(content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // deflate
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0x21, 12); // mod date (1980-01-01)
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // deflate
    centralHeader.writeUInt16LE(0, 12); // mod time
    centralHeader.writeUInt16LE(0x21, 14); // mod date
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42);

    localParts.push(localHeader, nameBuffer, compressed);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + compressed.length;
    count += 1;
  }

  const central = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4); // disk number
  endRecord.writeUInt16LE(0, 6); // central directory start disk
  endRecord.writeUInt16LE(count, 8);
  endRecord.writeUInt16LE(count, 10);
  endRecord.writeUInt32LE(central.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, central, endRecord]);
};

/**
 * Zip a skill directory into a base64-encoded bundle string, ready to be used
 * as `InlineSkillSource.data`.
 *
 * @param directory - Path to a skill folder.
 * @returns Base64-encoded zip bundle.
 */
export const bundleFromDirectory = (directory: string): string =>
  zipDirectory(directory).toString("base64");

/**
 * Compute a stable SHA-256 hex digest over all file contents in a directory.
 *
 * @param directory - Path to the directory to hash.
 * @returns Hex-encoded digest.
 */
export const hashDirectory = (directory: string): string => {
  const { fs, crypto } = requireNode();
  const hash = crypto.createHash("sha256");
  for (const { relPath, absPath } of walkFiles(directory)) {
    hash.update(relPath);
    hash.update(fs.readFileSync(absPath));
  }
  return hash.digest("hex");
};

/**
 * Resolve the name and description for a skill directory, preferring explicit
 * overrides, then SKILL.md frontmatter, then the directory name.
 *
 * @param directory - Path to a skill folder containing a SKILL.md.
 * @param overrides - Optional name/description overrides.
 * @throws {Error} If SKILL.md is missing from the directory.
 */
export const resolveSkillMetadata = (
  directory: string,
  overrides: { name?: string; description?: string } = {},
): { name: string; description?: string } => {
  const { fs, path } = requireNode();
  const skillMd = path.join(directory, "SKILL.md");
  if (!fs.existsSync(skillMd)) {
    throw new Error(`SKILL.md not found in ${directory}`);
  }

  const frontmatter = parseSkillFrontmatter(skillMd);
  return {
    name: overrides.name ?? frontmatter.name ?? path.basename(directory),
    description: overrides.description ?? frontmatter.description,
  };
};

/**
 * Write a zip archive of a skill directory into the local skill archive cache
 * (`~/.vlmrun/skill_archives`) and return its path.
 *
 * @param directory - Path to a skill folder.
 * @param skillName - Name used for the archive filename.
 * @returns Absolute path to the written zip archive.
 */
export const writeSkillArchive = (
  directory: string,
  skillName: string,
): string => {
  const { fs, path, os } = requireNode();
  const archiveDir = path.join(os.homedir(), ".vlmrun", "skill_archives");
  fs.mkdirSync(archiveDir, { recursive: true });

  const shortHash = hashDirectory(directory).slice(0, 8);
  const zipPath = path.join(archiveDir, `${skillName}_${shortHash}.zip`);
  fs.writeFileSync(zipPath, zipDirectory(directory));
  return zipPath;
};
