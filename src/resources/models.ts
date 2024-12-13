// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import * as Core from '../core';

export class Models extends APIResource {
  /**
   * Get the list of supported models.
   */
  list(options?: Core.RequestOptions): Core.APIPromise<ModelListResponse> {
    return this._client.get('/v1/models', options);
  }
}

/**
 * Response to the model info API.
 */
export interface ModelInfoResponse {
  /**
   * The domain identifier for the model.
   */
  domain:
    | 'document.generative'
    | 'document.presentation'
    | 'document.invoice'
    | 'document.receipt'
    | 'document.markdown'
    | 'video.tv-news'
    | 'video.tv-intelligence'
    | 'audio.transcription'
    | 'video.transcription'
    | 'document.file'
    | 'document.pdf'
    | 'document.resume'
    | 'document.utility-bill'
    | 'web.ecommerce-product-catalog'
    | 'web.github-developer-stats'
    | 'web.market-research'
    | 'vlm-1-embeddings';

  /**
   * The model identifier.
   */
  model?: 'vlm-1';
}

export type ModelListResponse = Array<ModelInfoResponse>;

export declare namespace Models {
  export { type ModelInfoResponse as ModelInfoResponse, type ModelListResponse as ModelListResponse };
}
