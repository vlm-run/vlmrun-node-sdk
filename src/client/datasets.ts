import { APIResource } from '../resource';
import * as Core from '../core';

export interface DatasetResponse {
  dataset_id?: string;
  file_id?: string;
  domain?: string;
  dataset_name?: string;
  dataset_type?: 'images' | 'videos' | 'documents';
  created_at?: string;
}

export class Datasets extends APIResource {
  constructor(client: Core.APIClient) {
    super(client);
    this._client = Object.assign(client, {
      baseURL: `${client.baseURL}/experimental`,
    });
  }


  create(
    file_id: string,
    domain: string,
    dataset_name: string,
    dataset_type: 'images' | 'videos' | 'documents' = 'images',
    options?: Core.RequestOptions,
  ): Core.APIPromise<DatasetResponse> {
    if (!['images', 'videos', 'documents'].includes(dataset_type)) {
      throw new Error('dataset_type must be one of: images, videos, documents');
    }

    return this._client.post('/datasets/create', {
      body: {
        file_id,
        domain,
        dataset_name,
        dataset_type,
      },
      ...options,
    });
  }

  get(id: string, options?: Core.RequestOptions): Core.APIPromise<DatasetResponse> {
    return this._client.get(`/datasets/${id}`, options);
  }
}
