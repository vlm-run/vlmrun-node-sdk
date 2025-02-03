import { APIResource } from '../resource';
import * as Core from '../core';
import * as Shared from './shared';

export class Image extends APIResource {
  /**
   * Generate structured prediction for the given image.
   */
  generate(
    body: ImageGenerateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Shared.PredictionResponse> {
    return this._client.post('/v1/image/generate', { body, ...options });
  }
}

export interface ImageGenerateParams {
  /**
   * Base64 encoded image.
   */
  image: string;

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
   * The detail level to use for the model.
   */
  detail?: 'auto' | 'hi' | 'lo';

  /**
   * The domain identifier.
   */
  domain?:
    | 'document.generative'
    | 'document.presentation'
    | 'document.invoice'
    | 'document.receipt'
    | 'document.markdown'
    | 'video.tv-news'
    | 'video.tv-intelligence'
    | null;

  /**
   * The JSON schema to use for the model.
   */
  json_schema?: unknown | null;

  /**
   * Optional metadata to pass to the model.
   */
  metadata?: ImageGenerateParams.Metadata;

  /**
   * The model to use for generating the response.
   */
  model?: 'vlm-1' | 'vlm-1-embeddings';
}

export namespace ImageGenerateParams {
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

export declare namespace Image {
  export { type ImageGenerateParams as ImageGenerateParams };
}
