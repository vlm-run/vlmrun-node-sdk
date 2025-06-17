import { Client, APIRequestor } from "./base_requestor";
import { FeedbackResponse, FeedbackCreateParams, FeedbackListResponse } from "./types";

export class Feedback {
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor({
      ...client,
      baseURL: `${client.baseURL}`,
    });
  }

  async list(requestId: string, limit: number = 10, offset: number = 0): Promise<FeedbackListResponse> {
    const [response] = await this.requestor.request<FeedbackListResponse>(
      "GET",
      `feedback/${requestId}`,
      { limit, offset }
    );
    return response;
  }

  async submit(requestId: string, feedback: FeedbackCreateParams): Promise<FeedbackResponse> {
    const [response] = await this.requestor.request<FeedbackResponse>(
      "POST",
      `feedback/submit/${requestId}`,
      undefined,
      feedback
    );
    return response;
  }
}
