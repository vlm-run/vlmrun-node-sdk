// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import * as Core from '../core';
import * as Shared from './shared';

export class Web extends APIResource {
  /**
   * Generate structured prediction for the given url.
   */
  generate(
    body: WebGenerateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Shared.PredictionResponse> {
    return this._client.post('/v1/web/generate', { body, ...options });
  }
}

export interface WebGenerateParams {
  /**
   * The URL of the web page.
   */
  url: string;

  /**
   * Unique identifier of the request.
   */
  id?: string;

  /**
   * The URL to call when the request is completed.
   */
  callback_url?: string | null;

  /**
   * Date and time when the request was created (in UTC timezone)
   */
  created_at?: string;

  /**
   * The domain identifier.
   */
  domain?: 'web.ecommerce-product-catalog' | 'web.github-developer-stats' | 'web.market-research' | null;

  /**
   * Optional metadata to pass to the model.
   */
  metadata?: WebGenerateParams.Metadata;

  /**
   * The mode to use for the model.
   */
  mode?: 'fast' | 'accurate';

  /**
   * The model to use for generating the response.
   */
  model?: 'vlm-1';
}

export namespace WebGenerateParams {
  /**
   * Optional metadata to pass to the model.
   */
  export interface Metadata {
    /**
     * Whether the file can be used for training
     */
    allow_training?: boolean;

    /**
     * The environment where the request was made.
     */
    environment?: 'dev' | 'staging' | 'prod';

    /**
     * The session ID of the request
     */
    session_id?: string | null;
  }
}

export declare namespace Web {
  export { type WebGenerateParams as WebGenerateParams };
}
