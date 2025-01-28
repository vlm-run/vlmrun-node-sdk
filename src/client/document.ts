import { APIResource } from '../resource';
import * as Core from '../core';
import * as Shared from './shared';

export class Document extends APIResource {
  /**
   * Generate structured prediction for the given document.
   */
  async generate(
    fileOrUrl: string | Buffer | { path: string },
    domain: string,
    model: string = 'vlm-1',
    jsonSchema?: Record<string, unknown> | null,
    detail: 'auto' | 'hi' | 'lo' = 'auto',
    batch: boolean = false,
    metadata: Record<string, unknown> = {},
    callbackUrl: string | null = null,
    options?: Core.RequestOptions,
  ): Promise<Shared.PredictionResponse> {
    let key: 'url' | 'file_id';
    let value: string;

    if (Buffer.isBuffer(fileOrUrl)) {
      const response = await this._client.files.upload(fileOrUrl, 'assistants');
      value = response.id;
      key = 'file_id';
    } else if (typeof fileOrUrl === 'object' && 'path' in fileOrUrl) {
      const response = await this._client.files.upload(fileOrUrl.path, 'assistants');
      value = response.id;
      key = 'file_id';
    } else if (typeof fileOrUrl === 'string') {
      const isUrl = fileOrUrl.startsWith('http://') || fileOrUrl.startsWith('https://');
      key = isUrl ? 'url' : 'file_id';
      value = fileOrUrl;
    } else {
      throw new Error('File or URL must be a Buffer, path object, or string');
    }

    const response: unknown = await this._client.post('document/generate', {
      body: {
        [key]: value,
        domain,
        model,
        json_schema: jsonSchema,
        detail,
        batch,
        metadata,
        callback_url: callbackUrl,
      },
      ...options,
    });

    if (!response || typeof response !== 'object') {
      throw new TypeError('Expected dict response');
    }
    return response as Shared.PredictionResponse;
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
