import { Client, APIRequestor } from "./base_requestor";
import { APIError } from "./exceptions";
import { DomainInfo } from "./types";

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
}
