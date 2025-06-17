import { Client, APIRequestor } from "./base_requestor";
import { FeedbackResponse, FeedbackCreateParams, FeedbackListResponse, FeedbackListParams } from "./types";

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

  async list(requestId: string, params: FeedbackListParams = {}): Promise<FeedbackListResponse> {
    const { limit = 10, offset = 0 } = params;
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
