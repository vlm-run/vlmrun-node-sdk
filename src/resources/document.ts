import { APIResource } from '../resource';
import * as Core from '../core';
import * as Shared from './shared';

export class Document extends APIResource {
  /**
   * Generate structured prediction for the given document.
   */
  generate(
    body: DocumentGenerateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Shared.PredictionResponse> {
    return this._client.post('/v1/document/generate', { body, ...options });
  }
}

export interface DocumentGenerateParams {
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
   * The detail level to use for the model.
   */
  detail?: 'auto' | 'hi' | 'lo';

  /**
   * The domain identifier for the model.
   */
  domain?:
    | 'document.file'
    | 'document.pdf'
    | 'document.generative'
    | 'document.markdown'
    | 'document.presentation'
    | 'document.invoice'
    | 'document.receipt'
    | 'document.resume'
    | 'document.utility-bill'
    | (string & {});

  /**
   * The ID of the uploaded file (provide either `file_id` or `url`).
   */
  file_id?: string | null;

  /**
   * The schema to use for the model.
   */
  json_schema?: unknown | null;

  /**
   * Metadata for the request.
   */
  metadata?: DocumentGenerateParams.Metadata | null;

  /**
   * The model to use for generating the response.
   */
  model?: 'vlm-1' | 'vlm-1-embeddings';

  /**
   * The URL of the file (provide either `file_id` or `url`).
   */
  url?: string | null;
}

export namespace DocumentGenerateParams {
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

export declare namespace Document {
  export { type DocumentGenerateParams as DocumentGenerateParams };
}
