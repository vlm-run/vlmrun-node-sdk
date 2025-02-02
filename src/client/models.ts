import { Client, APIRequestor } from './base_requestor';
import { ModelInfoResponse } from './types';

export class Models {
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  async list(): Promise<ModelInfoResponse[]> {
    const [response] = await this.requestor.request<ModelInfoResponse[]>(
      'GET',
      'models'
    );
    return response;
  }
}
