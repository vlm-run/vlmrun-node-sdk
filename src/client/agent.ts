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
  AgentExecutionConfigClass,
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
  async get(params: AgentGetParams): Promise<AgentInfo> {
    const { name, version = "latest" } = params;

    const [response] = await this.requestor.request<AgentInfo>(
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
   * @throws {Error} If neither fileIds, urls, nor inputs are provided, or if multiple are provided
   */
  async execute(params: AgentExecuteParams): Promise<PredictionResponse> {
    const { 
      name, 
      version = "latest", 
      fileIds, 
      urls, 
      inputs,
      batch = true,
      config,
      metadata,
      callbackUrl
    } = params;

    // Validation: exactly one of fileIds, urls, or inputs must be provided
    const providedInputs = [fileIds, urls, inputs].filter(Boolean);
    if (providedInputs.length === 0) {
      throw new InputError("Either `fileIds`, `urls`, or `inputs` must be provided");
    }
    if (providedInputs.length > 1) {
      throw new InputError("Only one of `fileIds`, `urls`, or `inputs` can be provided");
    }

    const data: Record<string, any> = {
      name,
      version,
      batch,
    };

    // Handle legacy parameters
    if (fileIds) {
      data.file_ids = fileIds;
    }
    if (urls) {
      data.urls = urls;
    }
    
    if (inputs) {
      data.inputs = inputs;
    }

    if (config) {
      if (config instanceof GenerationConfig) {
        data.config = config.toJSON();
      } else if (config instanceof AgentExecutionConfigClass) {
        data.config = config.toJSON();
      } else {
        data.config = config;
      }
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
