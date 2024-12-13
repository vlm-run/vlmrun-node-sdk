// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import * as Core from '../../core';

export class Models extends APIResource {
  /**
   * Get model information.
   */
  retrieve(model: string, options?: Core.RequestOptions): Core.APIPromise<ChatModel> {
    return this._client.get(`/v1/openai/models/${model}`, options);
  }

  /**
   * List all available models.
   */
  list(options?: Core.RequestOptions): Core.APIPromise<Model> {
    return this._client.get('/v1/openai/models', options);
  }
}

export interface ChatModel {
  id: string;

  created?: number;

  object?: 'model';

  owned_by?: string;
}

export interface Model {
  data: Array<ChatModel>;

  object?: string;
}

export declare namespace Models {
  export { type ChatModel as ChatModel, type Model as Model };
}
