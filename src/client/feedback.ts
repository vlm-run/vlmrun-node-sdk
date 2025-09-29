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

  async get(
    entityId: string,
    options?: {
      type?: "request" | "agent_execution" | "chat";
      limit?: number;
      offset?: number;
    }
  ): Promise<FeedbackListResponse>;
  async get(
    requestId: string,
    limit?: number,
    offset?: number
  ): Promise<FeedbackListResponse>;
  async get(
    entityIdOrRequestId: string,
    limitOrOptions?: number | {
      type?: "request" | "agent_execution" | "chat";
      limit?: number;
      offset?: number;
    },
    offset?: number
  ): Promise<FeedbackListResponse> {
    let entityId: string;
    let type: string;
    let limit: number;
    let offsetValue: number;

    if (typeof limitOrOptions === 'number' || limitOrOptions === undefined) {
      entityId = entityIdOrRequestId;
      type = "request";
      limit = limitOrOptions || 10;
      offsetValue = offset || 0;
    } else {
      entityId = entityIdOrRequestId;
      type = limitOrOptions.type || "request";
      limit = limitOrOptions.limit || 10;
      offsetValue = limitOrOptions.offset || 0;
    }

    const [response] = await this.requestor.request<FeedbackListResponse>(
      "GET",
      `feedback/${entityId}`,
      { type, limit, offset: offsetValue }
    );
    return response;
  }

  async submit(
    options: {
      requestId?: string;
      agentExecutionId?: string;
      chatId?: string;
      response?: Record<string, any> | null;
      notes?: string | null;
    }
  ): Promise<FeedbackSubmitResponse>;
  async submit(
    requestId: string,
    response?: Record<string, any> | null,
    notes?: string | null
  ): Promise<FeedbackSubmitResponse>;
  async submit(
    requestIdOrOptions: string | {
      requestId?: string;
      agentExecutionId?: string;
      chatId?: string;
      response?: Record<string, any> | null;
      notes?: string | null;
    },
    response?: Record<string, any> | null,
    notes?: string | null
  ): Promise<FeedbackSubmitResponse> {
    let feedbackData: FeedbackSubmitRequest;

    if (typeof requestIdOrOptions === 'string') {
      if (response === null && notes === null) {
        throw new Error("`response` or `notes` parameter is required and cannot be null");
      }
      feedbackData = {
        request_id: requestIdOrOptions,
        response,
        notes
      };
    } else {
      const { requestId, agentExecutionId, chatId, response: optResponse, notes: optNotes } = requestIdOrOptions;
      
      const idCount = [requestId, agentExecutionId, chatId].filter(id => id != null).length;
      if (idCount !== 1) {
        throw new Error("Must provide exactly one of: requestId, agentExecutionId, or chatId");
      }

      if (optResponse === null && optNotes === null) {
        throw new Error("`response` or `notes` parameter is required and cannot be null");
      }

      feedbackData = {
        request_id: requestId || null,
        agent_execution_id: agentExecutionId || null,
        chat_id: chatId || null,
        response: optResponse,
        notes: optNotes
      };
    }

    const [responseData] = await this.requestor.request<FeedbackSubmitResponse>(
      "POST",
      `feedback/submit`,
      undefined,
      feedbackData
    );
    return responseData;
  }
}
