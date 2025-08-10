/**
 * VLM Run API Agent resource.
 */

import { Client, APIRequestor } from "./base_requestor";
import { InputError, ServerError } from "./exceptions";
import { 
  RequestMetadata,
  AgentGetParams,
  AgentExecuteParams,
  AgentInfo,
  AgentExecutionResponse,
  AgentExecutionConfig,
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
   */
  async execute(params: AgentExecuteParams): Promise<AgentExecutionResponse> {
    const { 
      name, 
      version = "latest", 
      inputs,
      batch = true,
      config,
      metadata,
      callbackUrl
    } = params;

    if (!batch) {
      throw new InputError(
        "Batch mode is required for agent execution",
        "not_implemented_error",
        "Set batch: true in your agent execution parameters"
      );
    }

    const data: Record<string, any> = {
      name,
      version,
      batch,
      inputs,
    };

    if (config) {
      if (config instanceof AgentExecutionConfig) {
        data.config = config.toJSON();
      } else {
        data.config = {
          prompt: config.prompt,
          json_schema: config.jsonSchema,
        };
      }
    }

    if (metadata) {
      if (metadata instanceof RequestMetadata) {
        data.metadata = metadata.toJSON();
      } else {
        data.metadata = {
          environment: metadata.environment,
          session_id: metadata.sessionId,
          allow_training: metadata.allowTraining,
        };
      }
    }

    if (callbackUrl) {
      data.callback_url = callbackUrl;
    }

    const [response] = await this.requestor.request<AgentExecutionResponse>(
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
