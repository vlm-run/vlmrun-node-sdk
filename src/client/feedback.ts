import { Client, APIRequestor } from "./base_requestor";
import { FeedbackSubmitResponse, FeedbackSubmitRequest, FeedbackListResponse } from "./types";

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

  async get(requestId: string, limit: number = 10, offset: number = 0): Promise<FeedbackListResponse> {
    const [response] = await this.requestor.request<FeedbackListResponse>(
      "GET",
      `feedback/${requestId}`,
      { limit, offset }
    );
    return response;
  }

  async submit(requestId: string, response?: Record<string, any> | null, notes?: string | null): Promise<FeedbackSubmitResponse> {
    if (response === null && notes === null) {
      throw new Error("`response` or `notes` parameter is required and cannot be null");
    }

    const feedbackData: FeedbackSubmitRequest = {
      request_id: requestId,
      response,
      notes
    };

    const [responseData] = await this.requestor.request<FeedbackSubmitResponse>(
      "POST",
      `feedback/submit`,
      undefined,
      feedbackData
    );
    return responseData;
  }
}
