import { Client, APIRequestor } from "./base_requestor";
import { FeedbackResponse, FeedbackParams } from "./types";

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

  async getFeedbacks(requestId: string): Promise<FeedbackResponse[]> {
    const [response] = await this.requestor.request<FeedbackResponse[]>(
      "GET",
      `feedback/${requestId}`
    );
    return response;
  }

  async createFeedback(feedback: FeedbackParams): Promise<FeedbackResponse> {
    const [response] = await this.requestor.request<FeedbackResponse>(
      "POST",
      `feedback/submit/${feedback.request_id}`,
      undefined,
      feedback
    );
    return response;
  }
}
