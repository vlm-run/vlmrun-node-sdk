import { APIResource } from '../resource';
import * as Core from '../core';

export interface FileResponse {
  id: string;
  filename: string;
  purpose: string;
  bytes: number;
  created_at: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export type FilePurpose =
  | 'fine-tune'
  | 'assistants'
  | 'assistants_output'
  | 'batch'
  | 'batch_output'
  | 'vision';

export class Files extends APIResource {
  /**
   * Upload a file.
   * 
   * @param file Path to file to upload
   * @param purpose Purpose of file (default: assistants)
   * @returns Uploaded file object
   */
  async upload(
    file: Core.Uploadable,
    purpose: FilePurpose = 'assistants',
    options?: Core.RequestOptions,
  ): Promise<FileResponse> {
    const response: unknown = await this._client.post(
      'files',
      Core.multipartFormRequestOptions({ query: { purpose }, body: { file }, ...options }),
    );

    if (!response || typeof response !== 'object') {
      throw new TypeError('Expected dict response');
    }
    return response as FileResponse;
  }

  /**
   * Get file metadata.
   * 
   * @param fileId ID of file to retrieve
   * @returns File metadata
   */
  async get(fileId: string, options?: Core.RequestOptions): Promise<FileResponse> {
    const response: unknown = await this._client.get(`files/${fileId}`, options);

    if (!response || typeof response !== 'object') {
      throw new TypeError('Expected dict response');
    }
    return response as FileResponse;
  }

  /**
   * List all files.
   * 
   * @param skip Number of items to skip
   * @param limit Maximum number of items to return
   * @returns List of file objects
   */
  async list(skip: number = 0, limit: number = 10, options?: Core.RequestOptions): Promise<FileResponse[]> {
    const response: unknown = await this._client.get('files', { query: { skip, limit }, ...options });

    if (!Array.isArray(response)) {
      throw new TypeError('Expected list response');
    }
    return response.map(file => {
      if (!file || typeof file !== 'object') {
        throw new TypeError('Expected file to be an object');
      }
      return file as FileResponse;
    });
  }

  /**
   * Get file content.
   * 
   * @param fileId ID of file to retrieve content for
   * @returns File content as bytes
   */
  getContent(fileId: string): Promise<Uint8Array> {
    throw new Error('Not implemented');
  }

  /**
   * Delete a file.
   * 
   * @param fileId ID of file to delete
   * @returns Deletion confirmation
   */
  async delete(fileId: string, options?: Core.RequestOptions): Promise<FileResponse> {
    const response: unknown = await this._client.delete(`files/${fileId}`, options);

    if (!response || typeof response !== 'object') {
      throw new TypeError('Expected dict response');
    }
    return response as FileResponse;
  }
}
