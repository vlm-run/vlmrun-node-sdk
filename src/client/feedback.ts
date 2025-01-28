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


  submit(
    id: string,
    label?: Record<string, unknown> | null,
    notes?: string | null,
    flag?: boolean | null,
    options?: Core.RequestOptions,
  ): Core.APIPromise<FeedbackSubmitResponse> {
    return this._client.post('/feedback/submit', {
      body: {
        request_id: id,
        response: label,
        notes,
        flag,
      },
      ...options,
    });
  }

  get(id: string, options?: Core.RequestOptions): Core.APIPromise<FeedbackSubmitResponse> {
    return this._client.get(`/feedback/${id}`, options);
  }
}
