/**
 * VLM Run API Skills resource.
 */

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { ZipFile } from "yazl";
import { Client, APIRequestor } from "./base_requestor";
import { Files } from "./files";
import {
  AgentSkill,
  SkillInfo,
  SkillDownloadResponse,
  SkillCreateParams,
  SkillUpdateParams,
  SkillGetParams,
  SkillListParams,
} from "./types";

async function skillFiles(
  directory: string,
  root: string = directory,
): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await skillFiles(directory, path)));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort((a, b) => {
    const left = relative(directory, a);
    const right = relative(directory, b);
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

export async function parseSkillFrontmatter(
  skillMarkdownPath: string,
): Promise<{ name?: string; description?: string }> {
  const markdown = await readFile(skillMarkdownPath, "utf8");
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  const field = (key: string): string | undefined =>
    frontmatter?.[1]
      .split("\n")
      .find((line) => line.startsWith(`${key}:`))
      ?.slice(key.length + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  return { name: field("name"), description: field("description") };
}

export async function hashDirectory(directory: string): Promise<string> {
  const hash = createHash("sha256");
  for (const file of await skillFiles(directory)) {
    hash.update(relative(directory, file).split("\\").join("/"));
    hash.update(await readFile(file));
  }
  return hash.digest("hex");
}

export async function bundleFromDirectory(directory: string): Promise<string> {
  const zip = new ZipFile();
  for (const file of await skillFiles(directory)) {
    zip.addBuffer(
      await readFile(file),
      relative(directory, file).split("\\").join("/"),
    );
  }
  const chunks: Buffer[] = [];
  const result = new Promise<string>((resolve, reject) => {
    zip.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    zip.outputStream.on("end", () =>
      resolve(Buffer.concat(chunks).toString("base64")),
    );
    zip.outputStream.on("error", reject);
  });
  zip.end();
  return result;
}

export class Skills {
  /**
   * Skills resource for VLM Run API.
   *
   * Provides methods to list, lookup, create, update, and download skills.
   */
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    /**
     * Initialize Skills resource with VLMRun instance.
     *
     * @param client - VLM Run API instance
     */
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  async createFromDirectory(
    directory: string,
    name?: string,
    description?: string,
  ): Promise<AgentSkill> {
    const frontmatter = await parseSkillFrontmatter(
      join(directory, "SKILL.md"),
    );
    const skillName = name ?? frontmatter.name ?? basename(directory);
    const data = await bundleFromDirectory(directory);
    const file = new File([Buffer.from(data, "base64")], `${skillName}.zip`, {
      type: "application/zip",
    });
    const uploaded = await new Files(this.client).upload({
      file,
      purpose: "assistants",
    });
    const skill = await this.create({
      fileId: uploaded.id,
      name: skillName,
      description: description ?? frontmatter.description,
    });
    return new AgentSkill({ skillId: skill.id, skillName: skill.name });
  }

  /**
   * List available skills.
   *
   * @param params - Optional listing parameters
   * @param params.limit - Max items to return (1-1000, default 25)
   * @param params.offset - Number of items to skip
   * @param params.orderBy - Sort field (created_at, updated_at, name)
   * @param params.descending - Sort direction (default true)
   * @param params.grouped - If true, return only the latest version per skill name
   * @returns List of SkillInfo objects
   */
  async list(params: SkillListParams = {}): Promise<SkillInfo[]> {
    const queryParams: Record<string, any> = {};
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.offset !== undefined) queryParams.offset = params.offset;
    if (params.orderBy !== undefined) queryParams.order_by = params.orderBy;
    if (params.descending !== undefined) queryParams.descending = params.descending;
    if (params.grouped !== undefined) queryParams.grouped = params.grouped;

    const [response] = await this.requestor.request<SkillInfo[]>(
      "GET",
      "skills",
      Object.keys(queryParams).length > 0 ? queryParams : undefined,
    );

    if (!Array.isArray(response)) {
      throw new TypeError("Expected array response");
    }

    return response;
  }

  /**
   * Lookup a skill by name, ID, or name + version.
   *
   * If `id` is provided, fetches the skill directly by ID via GET /v1/skills/{skill_id}.
   * Otherwise, looks up by `name` (and optional `version`) via POST /v1/skills/lookup.
   *
   * @param params - Skill lookup parameters
   * @returns Skill information
   */
  async get(params: SkillGetParams): Promise<SkillInfo> {
    const { name, id, skillVersion, version } = params;
    const effectiveVersion = skillVersion || version;

    if (id && !name) {
      const [response] = await this.requestor.request<SkillInfo>(
        "GET",
        `skills/${id}`,
      );

      if (typeof response !== "object") {
        throw new TypeError("Expected object response");
      }

      return response;
    } else if (name) {
      const data: Record<string, any> = { name };
      if (effectiveVersion) {
        data.skill_version = effectiveVersion;
      }

      const [response] = await this.requestor.request<SkillInfo>(
        "POST",
        "skills/lookup",
        undefined,
        data,
      );

      if (typeof response !== "object") {
        throw new TypeError("Expected object response");
      }

      return response;
    } else {
      throw new Error("Either `name` or `id` must be provided.");
    }
  }

  /**
   * Create a new skill.
   *
   * Skills can be created from a prompt (with optional JSON schema),
   * from a chat session, or from an uploaded skill zip file.
   *
   * @param params - Skill creation parameters
   * @returns Created skill information
   */
  async create(params: SkillCreateParams): Promise<SkillInfo> {
    const data: Record<string, any> = {};

    if (params.prompt !== undefined) data.prompt = params.prompt;
    if (params.jsonSchema !== undefined) data.json_schema = params.jsonSchema;
    if (params.sessionId !== undefined) data.session_id = params.sessionId;
    if (params.fileId !== undefined) data.file_id = params.fileId;
    if (params.name !== undefined) data.name = params.name;
    if (params.description !== undefined) data.description = params.description;

    const [response] = await this.requestor.request<SkillInfo>(
      "POST",
      "skills/create",
      undefined,
      data,
    );

    if (typeof response !== "object") {
      throw new TypeError("Expected object response");
    }

    return response;
  }

  /**
   * Update an existing skill (creates a new version).
   *
   * @param params - Skill update parameters
   * @returns Updated skill information
   */
  async update(params: SkillUpdateParams): Promise<SkillInfo> {
    const { skillId, ...rest } = params;
    const data: Record<string, any> = {};

    if (rest.fileId !== undefined) data.file_id = rest.fileId;
    if (rest.description !== undefined) data.description = rest.description;

    const [response] = await this.requestor.request<SkillInfo>(
      "POST",
      `skills/${skillId}/update`,
      undefined,
      data,
    );

    if (typeof response !== "object") {
      throw new TypeError("Expected object response");
    }

    return response;
  }

  /**
   * Get a presigned download URL for a skill zip.
   *
   * @param params - Object with skillId
   * @returns Download URL and expiry information
   */
  async download(params: { skillId: string }): Promise<SkillDownloadResponse> {
    const [response] = await this.requestor.request<SkillDownloadResponse>(
      "GET",
      `skills/${params.skillId}/download`,
    );

    if (typeof response !== "object") {
      throw new TypeError("Expected object response");
    }

    return response;
  }
}
