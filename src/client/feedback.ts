import { Client, APIRequestor } from "./base_requestor";
import { FeedbackSubmitResponse, FeedbackSubmitParams } from "./types";

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

  async submit(params: FeedbackSubmitParams): Promise<FeedbackSubmitResponse> {
    const [response] = await this.requestor.request<FeedbackSubmitResponse>(
      "POST",
      "feedback/submit",
      undefined,
      {
        request_id: params.id,
        response: params.label,
        notes: params.notes,
        flag: params.flag,
      }
    );
    return response;
  }
}
