import { Client, APIRequestor } from './base_requestor';
import { APIError, HubDomainInfo, HubInfoResponse, HubSchemaResponse } from './types';

export class Hub {
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  /**
   * Get the hub info.
   * @returns HubInfoResponse containing hub version
   * @throws APIError if the request fails
   */
  async info(): Promise<HubInfoResponse> {
    try {
      const [response] = await this.requestor.request<HubInfoResponse>(
        'GET',
        '/hub/info'
      );
      return response;
    } catch (e) {
      throw new APIError(`Failed to check hub health: ${e}`);
    }
  }

  /**
   * Get the list of supported domains.
   * @returns List of domain information
   * @throws APIError if the request fails
   */
  async listDomains(): Promise<HubDomainInfo[]> {
    try {
      const [response] = await this.requestor.request<HubDomainInfo[]>(
        'GET',
        '/hub/domains'
      );
      return response;
    } catch (e) {
      throw new APIError(`Failed to list domains: ${e}`);
    }
  }

  /**
   * Get the JSON schema for a given domain.
   * @param domain Domain identifier (e.g. "document.invoice")
   * @returns HubSchemaResponse containing schema details
   * @throws APIError if the request fails or domain is not found
   */
  async getSchema(domain: string): Promise<HubSchemaResponse> {
    try {
      const [response] = await this.requestor.request<HubSchemaResponse>(
        'POST',
        '/hub/schema',
        undefined,
        { domain }
      );
      return response;
    } catch (e) {
      throw new APIError(`Failed to get schema for domain ${domain}: ${e}`);
    }
  }
}
