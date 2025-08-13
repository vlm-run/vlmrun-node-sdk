import { Client, APIRequestor } from "./base_requestor";
import { AgentExecutionResponse, ListParams } from "./types";
import { RequestTimeoutError } from "./exceptions";

export class Executions {
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor({ ...client, timeout: 120000 });
  }

  /**
   * List all executions.
   * 
   * @param params - List parameters
   * @returns List of execution objects
   */
  async list(params: ListParams = {}): Promise<AgentExecutionResponse[]> {
    const [response] = await this.requestor.request<AgentExecutionResponse[]>(
      "GET",
      "agent/executions",
      { skip: params.skip, limit: params.limit }
    );
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
      throw new TypeError("Expected object response");
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
   * @throws RequestTimeoutError if execution does not complete within timeout
   */
  async wait(
    id: string,
    timeout: number = 300,
    sleep: number = 5
  ): Promise<AgentExecutionResponse> {
    const startTime = Date.now();
    const timeoutMs = timeout * 1000;

    while (Date.now() - startTime < timeoutMs) {
      const response = await this.get(id);
      if (response.status === "completed") {
        return response;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        break;
      }

      await new Promise((resolve) => 
        setTimeout(resolve, Math.min(sleep * 1000, timeoutMs - elapsed))
      );
    }

    throw new RequestTimeoutError(
      `Execution ${id} did not complete within ${timeout} seconds`,
      undefined,
      undefined,
      undefined,
      "execution_timeout",
      "Try increasing the timeout or check if the execution is taking longer than expected"
    );
  }
}
