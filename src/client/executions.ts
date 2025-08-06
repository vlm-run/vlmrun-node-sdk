/**
 * VLM Run API Executions resource.
 */

import { Client, APIRequestor } from "./base_requestor";
import { ServerError } from "./exceptions";
import { AgentExecutionResponse, ListParams } from "./types";

export class Executions {
  /**
   * Executions resource for VLM Run API.
   */
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    /**
     * Initialize Executions resource with VLMRun instance.
     * 
     * @param client - VLM Run API instance
     */
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  /**
   * List all executions.
   * 
   * @param params - List parameters
   * @returns List of execution objects
   */
  async list(params: ListParams = {}): Promise<AgentExecutionResponse[]> {
    const { skip = 0, limit = 10 } = params;

    const [response] = await this.requestor.request<AgentExecutionResponse[]>(
      "GET",
      "agent/executions",
      { skip, limit }
    );

    if (!Array.isArray(response)) {
      throw new ServerError("Expected array response");
    }

    return response;
  }

  /**
   * Get execution by ID.
   * 
   * @param id - ID of execution to retrieve
   * @returns Execution metadata
   */
  async get(id: string): Promise<AgentExecutionResponse> {
    const [response] = await this.requestor.request<AgentExecutionResponse>(
      "GET",
      `agent/executions/${id}`
    );

    if (typeof response !== 'object') {
      throw new ServerError("Expected object response");
    }

    return response;
  }

  /**
   * Wait for execution to complete.
   * 
   * @param id - ID of execution to wait for
   * @param timeout - Maximum number of seconds to wait (default: 300)
   * @param sleep - Time to wait between checks in seconds (default: 5)
   * @returns Completed execution
   * @throws {Error} If execution does not complete within timeout
   */
  async wait(
    id: string, 
    timeout: number = 300, 
    sleep: number = 5
  ): Promise<AgentExecutionResponse> {
    const startTime = Date.now();
    
    while (true) {
      const response = await this.get(id);
      
      if (response.status === "completed") {
        return response;
      }
      
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= timeout) {
        throw new Error(
          `Execution ${id} did not complete within ${timeout} seconds. Last status: ${response.status}`
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.min(sleep * 1000, (timeout - elapsed) * 1000)));
    }
  }
}
