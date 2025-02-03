import { Client, APIRequestor } from "./base_requestor";
import { FeedbackSubmitResponse } from "./types";

export class Feedback {
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor({
      ...client,
      baseURL: `${client.baseURL}/experimental`,
    });
  }

  async submit(
    id: string,
    options: {
      label?: Record<string, any>;
      notes?: string;
      flag?: boolean;
    } = {}
  ): Promise<FeedbackSubmitResponse> {
    const { label, notes, flag } = options;

    const [response] = await this.requestor.request<FeedbackSubmitResponse>(
      "POST",
      "feedback/submit",
      undefined,
      {
        request_id: id,
        response: label,
        notes,
        flag,
      }
    );
    return response;
  }
}
