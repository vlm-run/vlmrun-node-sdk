import { APIResource } from '../resource';
import * as Core from '../core';
import * as Shared from './shared';

export class Audio extends APIResource {
  /**
   * Generate structured prediction for the given audio.
   */
  generate(
    body: AudioGenerateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Shared.PredictionResponse> {
    return this._client.post('/v1/audio/generate', { body, ...options });
  }
}

export interface AudioGenerateParams {
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
   * The domain identifier for the model.
   */
  domain?: 'audio.transcription';

  /**
   * The ID of the uploaded file (provide either `file_id` or `url`).
   */
  file_id?: string | null;

  /**
   * Metadata for the request.
   */
  metadata?: AudioGenerateParams.Metadata | null;

  /**
   * The model to use for generating the response.
   */
  model?: 'vlm-1';

  /**
   * The URL of the file (provide either `file_id` or `url`).
   */
  url?: string | null;
}

export namespace AudioGenerateParams {
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

export declare namespace Audio {
  export { type AudioGenerateParams as AudioGenerateParams };
}
