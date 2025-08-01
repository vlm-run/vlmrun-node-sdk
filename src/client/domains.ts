import { Client, APIRequestor } from "./base_requestor";
import { APIError } from "./exceptions";
import { 
  DomainInfo, 
  SchemaResponse, 
  GenerationConfig, 
  GenerationConfigInput 
} from "./types";

export class Domains {
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  /**
   * Get the list of supported domains.
   * @returns List of domain information
   * @throws APIError if the request fails
   */
  async list(): Promise<DomainInfo[]> {
    try {
      const [response] = await this.requestor.request<DomainInfo[]>(
        "GET",
        "/domains"
      );
      return response;
    } catch (e) {
      throw new APIError(`Failed to list domains: ${e}`);
    }
  }

  /**
   * Get the schema for a domain.
   * @param domain Domain name (e.g. "document.invoice")
   * @param config Optional generation config
   * @returns Schema response containing JSON schema and metadata
   * @throws APIError if the request fails
   */
  async getSchema(
    domain: string,
    config?: GenerationConfigInput
  ): Promise<SchemaResponse> {
    try {
      const configObj = config instanceof GenerationConfig ? config : new GenerationConfig(config);
      const [response] = await this.requestor.request<SchemaResponse>(
        "POST",
        "/schema",
        undefined,
        { domain, config: configObj.toJSON() }
      );
      return response;
    } catch (e) {
      throw new APIError(`Failed to get schema for domain ${domain}: ${e}`);
    }
  }

}
