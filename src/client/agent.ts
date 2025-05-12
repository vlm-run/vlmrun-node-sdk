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
   * Get an agent by name.
   * 
   * @param params - Agent request parameters
   * @returns Agent response
   */
  async get(params: AgentGetParams): Promise<PredictionResponse> {
    const { name, version = "latest" } = params;

    const [response] = await this.requestor.request<PredictionResponse>(
      "GET",
      `agent/${name}/${version}`,
    );

    if (typeof response !== 'object') {
      throw new TypeError("Expected object response");
    }

    return response;
  }

  /**
   * Execute an agent with the given arguments.
   * 
   * @param params - Agent execution parameters
   * @returns Agent execution response
   * @throws {Error} If neither fileIds nor urls are provided, or if both are provided
   */
  async execute(params: AgentExecuteParams): Promise<PredictionResponse> {
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
      data,
    );

    if (typeof response !== 'object') {
      throw new ServerError("Expected object response");
    }

    return response;
  }
}
