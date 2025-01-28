import { APIResource } from '../resource';
import * as Core from '../core';

export interface FinetuningJobResponse {
  id?: string;
  training_file?: string;
  validation_file?: string;
  model?: string;
  num_epochs?: number;
  batch_size?: number;
  learning_rate?: number;
  use_lora?: boolean;
  track?: boolean;
  wandb_project?: string | null;
  status?: string;
  created_at?: string;
  completed_at?: string | null;
}

export class Finetuning extends APIResource {
  constructor(client: Core.APIClient) {
    super(client);
    this._client = Object.assign(client, {
      baseURL: `${client.baseURL}/experimental`,
    });
  }


  create(
    training_file: string,
    validation_file: string,
    model: string,
    n_epochs: number = 1,
    batch_size: number = 8,
    learning_rate: number = 2e-4,
    use_lora: boolean = true,
    track: boolean = true,
    wandb_project?: string | null,
    options?: Core.RequestOptions,
  ): Core.APIPromise<FinetuningJobResponse> {
    return this._client.post('/fine_tuning/jobs/create', {
      body: {
        training_file,
        validation_file,
        model,
        num_epochs: n_epochs,
        batch_size,
        learning_rate,
        use_lora,
        track,
        wandb_project,
      },
      ...options,
    });
  }

  list(
    skip: number = 0,
    limit: number = 10,
    options?: Core.RequestOptions,
  ): Core.APIPromise<FinetuningJobResponse[]> {
    return this._client.get('/fine_tuning/jobs', {
      query: { skip, limit },
      ...options,
    });
  }

  listModels(
    skip: number = 0,
    limit: number = 10,
    options?: Core.RequestOptions,
  ): Core.APIPromise<string[]> {
    return this._client.get('/fine_tuning/models', {
      query: { skip, limit },
      ...options,
    });
  }

  get(id: string, options?: Core.RequestOptions): Core.APIPromise<FinetuningJobResponse> {
    return this._client.get(`/fine_tuning/jobs/${id}`, options);
  }

  cancel(id: string, options?: Core.RequestOptions): Core.APIPromise<Record<string, unknown>> {
    throw new Error('Not implemented');
  }
}
