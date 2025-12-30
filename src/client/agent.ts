/**
 * VLM Run API Agent resource.
 */

import { Client, APIRequestor } from "./base_requestor";
import { InputError, ServerError, DependencyError } from "./exceptions";
import {
  PredictionResponse,
  GenerationConfig,
  RequestMetadata,
  AgentGetParams,
  AgentExecuteParams,
  AgentInfo,
  AgentExecutionResponse,
  AgentCreateParams,
  AgentCreationResponse,
  AgentExecuteParamsNew,
  AgentExecutionConfig,
  AgentCreationConfig,
} from "./types";

export class Agent {
  /**
   * Agent resource for VLM Run API.
   */
  private client: Client;
  private requestor: APIRequestor;
  private _completions: any = null;

  constructor(client: Client) {
    /**
     * Initialize Agent resource with VLMRun instance.
     *
     * @param client - VLM Run API instance
     */
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  /**
   * Process inputs, converting objects to plain objects if needed.
   * Issues a deprecation warning when passing inputs as a plain object.
   *
   * @param inputs - Input data as object or null/undefined
   * @returns Processed inputs as plain object or undefined
   */
  private _processInputs(
    inputs: Record<string, any> | null | undefined
  ): Record<string, any> | undefined {
    if (inputs === null || inputs === undefined) {
      return undefined;
    }

    // Check if inputs is a class instance with a toJSON method
    if (typeof inputs === "object" && typeof inputs.toJSON === "function") {
      return inputs.toJSON();
    }

    // Plain object - issue deprecation warning
    if (typeof inputs === "object" && inputs.constructor === Object) {
      console.warn(
        "Deprecation Warning: Passing inputs as a plain object will be deprecated in the future. " +
          "Please use a class with a toJSON() method instead for better type safety and validation."
      );
    }

    return inputs;
  }

  /**
   * OpenAI-compatible chat completions interface.
   *
   * Returns an OpenAI Completions object configured to use the VLMRun
   * agent endpoint. This allows you to use the familiar OpenAI API
   * for chat completions.
   *
   * @example
   * ```typescript
   * import { VlmRun } from "vlmrun";
   *
   * const client = new VlmRun({
   *   apiKey: "your-key",
   *   baseURL: "https://agent.vlm.run/v1"
   * });
   *
   * const response = await client.agent.completions.create({
   *   model: "vlmrun-orion-1",
   *   messages: [
   *     { role: "user", content: "Hello!" }
   *   ]
   * });
   * ```
   *
   * @throws {DependencyError} If openai package is not installed
   * @returns OpenAI Completions object configured for VLMRun agent endpoint
   */
  get completions(): any {
    if (this._completions) {
      return this._completions;
    }

    let OpenAI: any;
    try {
      // Dynamic import to handle optional dependency
      OpenAI = require("openai").default;
    } catch (e) {
      throw new DependencyError(
        "OpenAI SDK is not installed",
        "missing_dependency",
        "Install it with `npm install openai` or `yarn add openai`"
      );
    }

    const baseUrl = `${this.client.baseURL}/openai`;
    const openaiClient = new OpenAI({
      apiKey: this.client.apiKey,
      baseURL: baseUrl,
      timeout: this.client.timeout,
      maxRetries: this.client.maxRetries ?? 1,
    });

    this._completions = openaiClient.chat.completions;
    return this._completions;
  }

  /**
   * Get an agent by name, id, or prompt. Only one of `name`, `id`, or `prompt` can be provided.
   *
   * @param params - Agent lookup parameters
   * @returns Agent information
   */
  async get(params: {
    name?: string;
    id?: string;
    prompt?: string;
  }): Promise<AgentInfo> {
    const { name, id, prompt } = params;

    if (id) {
      if (name || prompt) {
        throw new InputError("Only one of `id` or `name` or `prompt` can be provided");
      }
    } else if (name) {
      if (id || prompt) {
        throw new InputError("Only one of `id` or `name` or `prompt` can be provided");
      }
    } else if (prompt) {
      if (id || name) {
        throw new InputError("Only one of `id` or `name` or `prompt` can be provided");
      }
    } else {
      throw new InputError("Either `id` or `name` or `prompt` must be provided");
    }

    const data: Record<string, any> = {};
    if (id) {
      data.id = id;
    } else if (name) {
      data.name = name;
    } else if (prompt) {
      data.prompt = prompt;
    }

    const [response] = await this.requestor.request<AgentInfo>(
      "POST",
      "agent/lookup",
      undefined,
      data
    );

    if (typeof response !== "object") {
      throw new TypeError("Expected object response");
    }

    return response;
  }

  /**
   * List all agents.
   *
   * @returns List of agent information
   */
  async list(): Promise<AgentInfo[]> {
    const [response] = await this.requestor.request<AgentInfo[]>(
      "GET",
      "agent"
    );

    if (!Array.isArray(response)) {
      throw new TypeError("Expected array response");
    }

    return response;
  }

  /**
   * Create an agent.
   *
   * @param params - Agent creation parameters
   * @returns Agent creation response
   */
  async create(params: AgentCreateParams): Promise<AgentCreationResponse> {
    const { config, name, inputs, callbackUrl } = params;

    const configObj =
      config instanceof AgentCreationConfig
        ? config
        : new AgentCreationConfig(config);
    if (!configObj.prompt) {
      throw new InputError(
        "Prompt is not provided as a request parameter, please provide a prompt"
      );
    }

    const data: Record<string, any> = {
      name,
      inputs: this._processInputs(inputs),
      config: configObj.toJSON(),
    };

    if (callbackUrl) {
      data.callback_url = callbackUrl;
    }

    const [response] = await this.requestor.request<AgentCreationResponse>(
      "POST",
      "agent/create",
      undefined,
      data
    );

    if (typeof response !== "object") {
      throw new TypeError("Expected object response");
    }

    return response;
  }

  /**
   * Execute an agent with the given arguments (new method).
   *
   * @param params - Agent execution parameters
   * @returns Agent execution response
   */
  async execute(
    params: AgentExecuteParamsNew
  ): Promise<AgentExecutionResponse> {
    const {
      name,
      inputs,
      batch = true,
      config,
      metadata,
      callbackUrl,
    } = params;

    if (!batch) {
      throw new InputError("Batch mode is required for agent execution");
    }

    const data: Record<string, any> = {
      name,
      batch,
      inputs: this._processInputs(inputs),
    };

    if (config) {
      const configObj =
        config instanceof AgentExecutionConfig
          ? config
          : new AgentExecutionConfig(config);
      data.config = configObj.toJSON();
    }

    if (metadata) {
      data.metadata =
        metadata instanceof RequestMetadata ? metadata.toJSON() : metadata;
    }

    if (callbackUrl) {
      data.callback_url = callbackUrl;
    }

    const [response] = await this.requestor.request<AgentExecutionResponse>(
      "POST",
      "agent/execute",
      undefined,
      data
    );

    if (typeof response !== "object") {
      throw new ServerError("Expected object response");
    }

    return response;
  }

  /**
   * Execute an agent with the given arguments (legacy method for backward compatibility).
   *
   * @param params - Agent execution parameters
   * @returns Agent execution response
   * @deprecated Use the new execute method with AgentExecuteParamsNew
   */
  async executeLegacy(params: AgentExecuteParams): Promise<PredictionResponse> {
    const {
      name,
      version = "latest",
      fileIds,
      urls,
      batch = true,
      config,
      metadata,
      callbackUrl,
    } = params;

    if (!fileIds && !urls) {
      throw new InputError("Either `fileIds` or `urls` must be provided");
    }

    if (fileIds && urls) {
      throw new InputError("Only one of `fileIds` or `urls` can be provided");
    }

    const data: Record<string, any> = {
      name,
      version,
      batch,
    };

    if (fileIds) {
      data.file_ids = fileIds;
    }

    if (urls) {
      data.urls = urls;
    }

    if (config) {
      data.config =
        config instanceof GenerationConfig ? config.toJSON() : config;
    }

    if (metadata) {
      data.metadata =
        metadata instanceof RequestMetadata ? metadata.toJSON() : metadata;
    }

    if (callbackUrl) {
      data.callback_url = callbackUrl;
    }

    const [response] = await this.requestor.request<PredictionResponse>(
      "POST",
      "agent/execute",
      undefined,
      data
    );

    if (typeof response !== "object") {
      throw new ServerError("Expected object response");
    }

    return response;
  }
}
