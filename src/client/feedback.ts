import { Client, APIRequestor } from "./base_requestor";
import {
  FeedbackSubmitResponse,
  FeedbackSubmitRequest,
  FeedbackListResponse,
} from "./types";

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

  async get(
    entityId: string,
    options?: {
      type?: "request" | "agent_execution" | "chat";
      limit?: number;
      offset?: number;
    }
  ): Promise<FeedbackListResponse> {
    const type = options?.type || "request";
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    const [response] = await this.requestor.request<FeedbackListResponse>(
      "GET",
      `feedback/${entityId}`,
      { type, limit, offset }
    );
    return response;
  }

  async submit(options: {
    requestId?: string;
    agentExecutionId?: string;
    chatId?: string;
    response?: Record<string, any> | null;
    notes?: string | null;
  }): Promise<FeedbackSubmitResponse> {
    const { requestId, agentExecutionId, chatId, response, notes } = options;

    const idCount = [requestId, agentExecutionId, chatId].filter(
      (id) => id != null
    ).length;
    if (idCount !== 1) {
      throw new Error(
        "Must provide exactly one of: requestId, agentExecutionId, or chatId"
      );
    }

    if (response === null && notes === null) {
      throw new Error(
        "`response` or `notes` parameter is required and cannot be null"
      );
    }

    const feedbackData: FeedbackSubmitRequest = {
      request_id: requestId || null,
      agent_execution_id: agentExecutionId || null,
      chat_id: chatId || null,
      response,
      notes,
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
