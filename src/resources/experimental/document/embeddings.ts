import { APIResource } from '../../../resource';
import * as Core from '../../../core';
import * as Shared from '../../shared';

export class Embeddings extends APIResource {
  /**
   * Generate embeddings for a given document.
   */
  create(
    body: EmbeddingCreateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Shared.PredictionResponse> {
    return this._client.post('/v1/experimental/document/embeddings', { body, ...options });
  }
}

export interface EmbeddingCreateParams {
  /**
   * Unique identifier of the request.
   */
  id?: string;

  /**
   * Whether to process the document in batch mode (async).
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
   * The ID of the uploaded file (provide either `file_id` or `url`).
   */
  file_id?: string | null;

  /**
   * Metadata for the request.
   */
  metadata?: EmbeddingCreateParams.Metadata | null;

  /**
   * The model identifier.
   */
  model?: 'vlm-1-embeddings';

  /**
   * The URL of the file (provide either `file_id` or `url`).
   */
  url?: string | null;
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
