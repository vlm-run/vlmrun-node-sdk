import { APIResource } from '../resource';
import * as Core from '../core';
import { Buffer } from 'node:buffer';

export interface PredictionResponse {
  id?: string;
  completed_at?: string | null;
  created_at?: string;
  response?: unknown;
  status?: 'completed' | 'pending' | 'failed';
  error?: string | null;
}

export class Predictions extends APIResource {
  async list(
    skip: number = 0,
    limit: number = 10,
    options?: Core.RequestOptions,
  ): Promise<PredictionResponse[]> {
    const response: unknown = await this._client.get('predictions', {
      query: { skip, limit },
      ...options,
    });

    if (!Array.isArray(response)) {
      throw new TypeError('Expected list response');
    }
    return response;
  }

  async get(id: string, options?: Core.RequestOptions): Promise<PredictionResponse> {
    const response: unknown = await this._client.get(`predictions/${id}`, options);

    if (!response || typeof response !== 'object') {
      throw new TypeError('Expected dict response');
    }
    return response as PredictionResponse;
  }

  async wait(
    id: string,
    timeout: number = 60,
    sleep: number = 1,
  ): Promise<PredictionResponse> {
    for (let i = 0; i < timeout; i++) {
      const response = await this.get(id);
      if (response.status === 'completed') {
        return response;
      }
      if (response.status === 'failed') {
        throw new Error(response.error || `Prediction ${id} failed`);
      }
      process.stdout.write(`\rWaiting for prediction to complete: ${Math.round((i / timeout) * 100)}%`);
      await new Promise(resolve => setTimeout(resolve, sleep * 1000));
    }
    process.stdout.write('\n');
    throw new Error(`Prediction ${id} did not complete within ${timeout} seconds`);
  }
}

export class ImagePredictions extends Predictions {
  async generate(
    image: string | Buffer | { width: number; height: number; data: Buffer },
    model: string,
    domain: string,
    json_schema?: Record<string, unknown> | null,
    detail: 'auto' | 'lo' | 'hi' = 'auto',
    batch: boolean = false,
    metadata: Record<string, unknown> = {},
    callback_url: string | null = null,
    options?: Core.RequestOptions,
  ): Promise<PredictionResponse> {
    let imageData: string;
    if (Buffer.isBuffer(image)) {
      imageData = image.toString('base64');
    } else if (typeof image === 'object' && 'data' in image) {
      imageData = image.data.toString('base64');
    } else if (typeof image === 'string') {
      if (!image.startsWith('data:image/')) {
        throw new Error('Image string must be a base64-encoded data URL');
      }
      imageData = image;
    } else {
      throw new Error('Image must be a Buffer, base64 string, or image data object');
    }

    const response: unknown = await this._client.post('image/generate', {
      body: {
        image: imageData,
        model,
        domain,
        json_schema,
        detail,
        batch,
        metadata,
        callback_url,
      },
      ...options,
    });

    if (!response || typeof response !== 'object') {
      throw new TypeError('Expected dict response');
    }
    return response as PredictionResponse;
  }
}

function createFilePredictions(route: 'document' | 'audio' | 'video') {
  return class FilePredictions extends Predictions {
    async generate(
      file_or_url: string | Buffer | { path: string },
      model: string,
      domain: string,
      json_schema?: Record<string, unknown> | null,
      detail: 'auto' | 'lo' | 'hi' = 'auto',
      batch: boolean = false,
      metadata: Record<string, unknown> = {},
      callback_url: string | null = null,
      options?: Core.RequestOptions,
    ): Promise<PredictionResponse> {
      let key: 'url' | 'file_id';
      let value: string;

      if (Buffer.isBuffer(file_or_url)) {
        const response = await this._client.files.upload(file_or_url, 'assistants');
        value = response.id;
        key = 'file_id';
      } else if (typeof file_or_url === 'object' && 'path' in file_or_url) {
        const response = await this._client.files.upload(file_or_url.path, 'assistants');
        value = response.id;
        key = 'file_id';
      } else if (typeof file_or_url === 'string') {
        const isUrl = file_or_url.startsWith('http://') || file_or_url.startsWith('https://');
        key = isUrl ? 'url' : 'file_id';
        value = file_or_url;
      } else {
        throw new Error('File or URL must be a Buffer, path object, or string');
      }

      const response: unknown = await this._client.post(`${route}/generate`, {
        body: {
          [key]: value,
          model,
          domain,
          json_schema,
          detail,
          batch,
          metadata,
          callback_url,
        },
        ...options,
      });

      if (!response || typeof response !== 'object') {
        throw new TypeError('Expected dict response');
      }
      return response as PredictionResponse;
    }
  };
}

export const DocumentPredictions = createFilePredictions('document');
export const AudioPredictions = createFilePredictions('audio');
export const VideoPredictions = createFilePredictions('video');
