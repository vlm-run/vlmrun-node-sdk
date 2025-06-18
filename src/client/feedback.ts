import { Client, APIRequestor } from "./base_requestor";
import { FeedbackSubmitResponse, FeedbackSubmitRequest } from "./types";

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

  async list(requestId: string, limit: number = 10, offset: number = 0): Promise<FeedbackSubmitResponse> {
    const [response] = await this.requestor.request<FeedbackSubmitResponse>(
      "GET",
      `feedback/${requestId}`,
      { limit, offset }
    );
    return response;
  }

  async submit(requestId: string, feedback: FeedbackSubmitRequest): Promise<FeedbackSubmitResponse> {
    const [response] = await this.requestor.request<FeedbackSubmitResponse>(
      "POST",
      `feedback/submit/${requestId}`,
      undefined,
      feedback
    );
    return response;
  }
}
