// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import { isRequestOptions } from '../core';
import * as Core from '../core';

export class Files extends APIResource {
  /**
   * Upload a file.
   */
  create(params: FileCreateParams, options?: Core.RequestOptions): Core.APIPromise<StoreFileResponse> {
    const { purpose, ...body } = params;
    return this._client.post(
      '/v1/files',
      Core.multipartFormRequestOptions({ query: { purpose }, body, ...options }),
    );
  }

  /**
   * Get a file by ID.
   */
  retrieve(fileId: string, options?: Core.RequestOptions): Core.APIPromise<StoreFileResponse> {
    console.log(fileId);
    return this._client.get(`/v1/files/${fileId}`, options);
  }

  /**
   * Get all files uploaded by the user with pagination.
   */
  list(query?: FileListParams, options?: Core.RequestOptions): Core.APIPromise<FileListResponse>;
  list(options?: Core.RequestOptions): Core.APIPromise<FileListResponse>;
  list(
    query: FileListParams | Core.RequestOptions = {},
    options?: Core.RequestOptions,
  ): Core.APIPromise<FileListResponse> {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.get('/v1/files', { query, ...options });
  }
}

/**
 * Response to the file upload API.
 */
export interface StoreFileResponse {
  /**
   * Size of the file in bytes
   */
  bytes: number;

  /**
   * Name of the file
   */
  filename: string;

  /**
   * Purpose of the file
   */
  purpose:
    | 'assistants'
    | 'assistants_output'
    | 'batch'
    | 'batch_output'
    | 'fine-tune'
    | 'fine-tune-results'
    | 'vision';

  /**
   * Unique identifier of the file
   */
  id?: string;

  /**
   * Date and time when the file was created (in UTC timezone)
   */
  created_at?: string;

  /**
   * Type of the file
   */
  object?: 'file';
}

export type FileListResponse = Array<StoreFileResponse>;

export interface FileCreateParams {
  /**
   * Body param:
   */
  file: Core.Uploadable;

  /**
   * Query param:
   */
  purpose?:
    | 'assistants'
    | 'assistants_output'
    | 'batch'
    | 'batch_output'
    | 'fine-tune'
    | 'fine-tune-results'
    | 'vision';
}

export interface FileListParams {
  /**
   * Maximum number of items to return
   */
  limit?: number | null;

  /**
   * Number of items to skip
   */
  skip?: number;
}

export declare namespace Files {
  export {
    type StoreFileResponse as StoreFileResponse,
    type FileListResponse as FileListResponse,
    type FileCreateParams as FileCreateParams,
    type FileListParams as FileListParams,
  };
}
