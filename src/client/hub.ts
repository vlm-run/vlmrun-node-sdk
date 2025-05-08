import { Client, APIRequestor } from './base_requestor';
import { APIError } from './exceptions';
import { HubDomainInfo, HubInfoResponse, HubSchemaParams, HubSchemaResponse } from './types';

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
   * @param params Object containing domain and optional gql_stmt
   * @param params.domain Domain identifier (e.g. "document.invoice")
   * @param params.gql_stmt Optional GraphQL statement for the domain
   * @returns HubSchemaResponse containing schema details
   * @throws APIError if the request fails or domain is not found
   */
  async getSchema(params: HubSchemaParams): Promise<HubSchemaResponse> {
    try {
      const [response] = await this.requestor.request<HubSchemaResponse>(
        'POST',
        '/hub/schema',
        undefined,
        params
      );
      return response;
    } catch (e) {
      throw new APIError(`Failed to get schema for domain ${params.domain}: ${e}`);
    }
  }
}
