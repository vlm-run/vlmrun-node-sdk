import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { Client, APIRequestor } from './base_requestor';
import { FileResponse, ListParams, FileUploadParams } from './types';
import path from 'path';
import { readFileFromPathAsFile } from '../utils/file';

export class Files {
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  async list(params: ListParams = {}): Promise<FileResponse[]> {
    const [response] = await this.requestor.request<FileResponse[]>(
      'GET',
      'files',
      { skip: params.skip, limit: params.limit }
    );
    return response;
  }

  private async calculateMD5(filePath: string): Promise<string> {
    const fileBuffer = await readFile(filePath);
    return createHash('md5').update(fileBuffer).digest('hex');
  }

  async checkFileExists(filePath: string): Promise<FileResponse | null> {
    const fileHash = await this.calculateMD5(filePath);
    try {
      const [response] = await this.requestor.request<FileResponse[]>(
        'GET',
        'files',
        { hash: fileHash }
      );
      return response[0] || null;
    } catch (error) {
      return null;
    }
  }

  async upload(params: FileUploadParams): Promise<FileResponse> {
    let fileToUpload: File;

    if (params.file) {
      fileToUpload = params.file;

    } else if (params.filePath) {
      if (params.checkDuplicate !== false) {
        const existingFile = await this.checkFileExists(params.filePath);
        
        if (existingFile) {
          return existingFile;
        }
      }

      fileToUpload = await readFileFromPathAsFile(params.filePath);
    } else {
      throw new Error('Either file or filePath must be provided.');
    }

    const [response] = await this.requestor.request<FileResponse>(
      'POST',
      'files',
      { purpose: params.purpose },
      undefined,
      { file: fileToUpload }
    );
    return response;
  }

  async delete(fileId: string): Promise<void> {
    await this.requestor.request<void>('DELETE', `files/${fileId}`);
  }
}
