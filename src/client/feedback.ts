import { APIResource } from '../resource';
import * as Core from '../core';

export interface FeedbackSubmitResponse {
  id?: string;
  request_id?: string;
  response?: unknown;
  notes?: string | null;
  flag?: boolean | null;
  created_at?: string;
}

export class Feedback extends APIResource {
  constructor(client: Core.APIClient) {
    super(client);
    this._client = Object.assign(client, {
      baseURL: `${client.baseURL}/experimental`,
    });
  }

  async submit(
    id: string,
    label?: Record<string, unknown> | null,
    notes?: string | null,
    flag?: boolean | null,
    options?: Core.RequestOptions,
  ): Promise<FeedbackSubmitResponse> {
    if (label !== null && label !== undefined && typeof label !== 'object') {
      throw new Error('label must be a valid object or null');
    }

    const response: unknown = await this._client.post('feedback/submit', {
      body: {
        request_id: id,
        response: label,
        notes,
        flag,
      },
      ...options,
    });

    if (!response || typeof response !== 'object') {
      throw new TypeError('Expected dict response');
    }
    return response as FeedbackSubmitResponse;
  }

  async get(id: string, options?: Core.RequestOptions): Promise<FeedbackSubmitResponse> {
    const response: unknown = await this._client.get(`feedback/${id}`, options);

    if (!response || typeof response !== 'object') {
      throw new TypeError('Expected dict response');
    }
    return response as FeedbackSubmitResponse;
  }
}
