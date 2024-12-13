// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import * as Core from '../core';
import * as Shared from './shared';

export class Schema extends APIResource {
  /**
   * Generate structured schema for the given document.
   */
  generate(
    body: SchemaGenerateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Shared.PredictionResponse> {
    return this._client.post('/v1/schema/generate', { body, ...options });
  }
}

export interface SchemaGenerateParams {
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
   * The ID of the uploaded file (provide either `file_id` or `url`).
   */
  file_id?: string | null;

  /**
   * Metadata for the request.
   */
  metadata?: SchemaGenerateParams.Metadata | null;

  /**
   * The model to use for generating the response.
   */
  model?: 'vlm-1';

  /**
   * The URL of the file (provide either `file_id` or `url`).
   */
  url?: string | null;
}

export namespace SchemaGenerateParams {
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

export declare namespace Schema {
  export { type SchemaGenerateParams as SchemaGenerateParams };
}
