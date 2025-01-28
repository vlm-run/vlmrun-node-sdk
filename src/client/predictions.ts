import { APIResource } from '../resource';
import * as Core from '../core';

export interface PredictionResponse {
  id?: string;
  completed_at?: string | null;
  created_at?: string;
  response?: unknown;
  status?: string;
}

export class Predictions extends APIResource {
  list(
    skip: number = 0,
    limit: number = 10,
    options?: Core.RequestOptions,
  ): Core.APIPromise<PredictionResponse[]> {
    return this._client.get('/predictions', {
      query: { skip, limit },
      ...options,
    });
  }

  get(id: string, options?: Core.RequestOptions): Core.APIPromise<PredictionResponse> {
    return this._client.get(`/predictions/${id}`, options);
  }

  async wait(
    id: string,
    timeout: number = 60,
    sleep: number = 1,
  ): Promise<PredictionResponse> {
    const start = Date.now();
    while (Date.now() - start < timeout * 1000) {
      const response = await this.get(id);
      if (response.status === 'completed') {
        return response;
      }
      await new Promise((resolve) => setTimeout(resolve, sleep * 1000));
    }
    throw new Error(`Prediction ${id} did not complete within ${timeout} seconds`);
  }
}

export class ImagePredictions extends Predictions {
  generate(
    image: string,
    model: string,
    domain: string,
    json_schema?: unknown,
    detail: 'auto' | 'lo' | 'hi' = 'auto',
    batch: boolean = false,
    metadata: Record<string, unknown> = {},
    callback_url?: string | null,
    options?: Core.RequestOptions,
  ): Core.APIPromise<PredictionResponse> {
    return this._client.post('/image/generate', {
      body: {
        image,
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
  }
}

function createFilePredictions(route: 'document' | 'audio' | 'video') {
  return class FilePredictions extends Predictions {
    generate(
      file_or_url: string,
      model: string,
      domain: string,
      json_schema?: unknown,
      detail: 'auto' | 'lo' | 'hi' = 'auto',
      batch: boolean = false,
      metadata: Record<string, unknown> = {},
      callback_url?: string | null,
      options?: Core.RequestOptions,
    ): Core.APIPromise<PredictionResponse> {
      const isUrl = file_or_url.startsWith('http://') || file_or_url.startsWith('https://');
      const key = isUrl ? 'url' : 'file_id';

      return this._client.post(`/${route}/generate`, {
        body: {
          [key]: file_or_url,
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
    }
  };
}

export const DocumentPredictions = createFilePredictions('document');
export const AudioPredictions = createFilePredictions('audio');
export const VideoPredictions = createFilePredictions('video');
