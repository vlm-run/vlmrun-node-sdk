/**
 * VLM Run API Skills resource.
 */

import { Client, APIRequestor } from "./base_requestor";
import {
  SkillInfo,
  SkillDownloadResponse,
  SkillCreateParams,
  SkillUpdateParams,
  SkillGetParams,
} from "./types";

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

  /**
   * List all available skills.
   *
   * @returns List of SkillInfo objects
   */
  async list(): Promise<SkillInfo[]> {
    const [response] = await this.requestor.request<SkillInfo[]>(
      "GET",
      "skills"
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
    const { name, id, version } = params;

    if (id && !name) {
      const [response] = await this.requestor.request<SkillInfo>(
        "GET",
        `skills/${id}`
      );

      if (typeof response !== "object") {
        throw new TypeError("Expected object response");
      }

      return response;
    } else if (name) {
      const data: Record<string, any> = { name };
      if (version) {
        data.version = version;
      }

      const [response] = await this.requestor.request<SkillInfo>(
        "POST",
        "skills/lookup",
        undefined,
        data
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
      data
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
      data
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
      `skills/${params.skillId}/download`
    );

    if (typeof response !== "object") {
      throw new TypeError("Expected object response");
    }

    return response;
  }
}
