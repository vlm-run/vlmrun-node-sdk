/**
 * VLM Run API Agent resource.
 */

import { Client, APIRequestor } from "./base_requestor";
import { InputError, ServerError } from "./exceptions";
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
   * Get an agent by name and version or by ID.
   * 
   * @param params - Agent lookup parameters
   * @returns Agent information
   */
  async get(params: { name?: string; version?: string; id?: string }): Promise<AgentInfo> {
    const { name, version, id } = params;

    if (id && name) {
      throw new InputError("Only one of `id` or `name` can be provided");
    }

    if (!id && !name) {
      throw new InputError("Either `id` or `name` must be provided");
    }

    const queryParams: Record<string, any> = {};
    if (id) {
      queryParams.id = id;
    } else if (name) {
      queryParams.name = name;
      if (version) {
        queryParams.version = version;
      }
    }

    const [response] = await this.requestor.request<AgentInfo>(
      "GET",
      "agent/lookup",
      queryParams
    );

    if (typeof response !== 'object') {
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

    const configObj = config instanceof AgentCreationConfig ? config : new AgentCreationConfig(config);
    if (!configObj.prompt) {
      throw new InputError("Prompt is not provided as a request parameter, please provide a prompt");
    }

    const data: Record<string, any> = {
      name,
      inputs,
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

    if (typeof response !== 'object') {
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
  async execute(params: AgentExecuteParamsNew): Promise<AgentExecutionResponse> {
    const { 
      name, 
      version, 
      inputs, 
      batch = true,
      config,
      metadata,
      callbackUrl
    } = params;

    if (!batch) {
      throw new InputError("Batch mode is required for agent execution");
    }

    const data: Record<string, any> = {
      name,
      version,
      batch,
      inputs,
    };

    if (config) {
      const configObj = config instanceof AgentExecutionConfig ? config : new AgentExecutionConfig(config);
      data.config = configObj.toJSON();
    }

    if (metadata) {
      data.metadata = metadata instanceof RequestMetadata ? metadata.toJSON() : metadata;
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

    if (typeof response !== 'object') {
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
      callbackUrl
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
      data.config = config instanceof GenerationConfig ? config.toJSON() : config;
    }

    if (metadata) {
      data.metadata = metadata instanceof RequestMetadata ? metadata.toJSON() : metadata;
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

    if (typeof response !== 'object') {
      throw new ServerError("Expected object response");
    }

    return response;
  }
}
