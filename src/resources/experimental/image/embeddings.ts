// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../resource';
import * as Core from '../../../core';
import * as Shared from '../../shared';

export class Embeddings extends APIResource {
  /**
   * Generate embeddings for the given image or text.
   */
  create(
    body: EmbeddingCreateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Shared.PredictionResponse> {
    return this._client.post('/v1/experimental/image/embeddings', { body, ...options });
  }
}

export interface EmbeddingCreateParams {
  /**
   * Unique identifier of the request.
   */
  id?: string;

  /**
   * Whether to process the image/text in batch mode (async).
   */
  batch?: boolean;

  /**
   * The URL to call when the request is completed.
   */
  callback_url?: string | null;

  /**
   * Date and time when the request was created (in UTC timezone)
   */
  created_at?: string;

  /**
   * Base64 encoded image to embed (at least one of `image` or `text` is required).
   */
  image?: string | null;

  /**
   * Metadata for the request.
   */
  metadata?: EmbeddingCreateParams.Metadata | null;

  /**
   * The model to use for generating the response.
   */
  model?: 'vlm-1-embeddings';

  /**
   * Text to embed (at least one of `image` or `text` is required).
   */
  text?: string | null;
}

export namespace EmbeddingCreateParams {
  /**
   * Metadata for the request.
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

export declare namespace Embeddings {
  export { type EmbeddingCreateParams as EmbeddingCreateParams };
}
