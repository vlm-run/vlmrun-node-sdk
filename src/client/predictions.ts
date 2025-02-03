import { Client, APIRequestor } from './base_requestor';
import { PredictionResponse, DetailLevel } from './types';
import { processImage } from '../utils/image';

export class Predictions {
  protected client: Client;
  protected requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  async list(skip: number = 0, limit: number = 10): Promise<PredictionResponse[]> {
    const [response] = await this.requestor.request<PredictionResponse[]>(
      'GET',
      'predictions',
      { skip, limit }
    );
    return response;
  }

  async get(id: string): Promise<PredictionResponse> {
    const [response] = await this.requestor.request<PredictionResponse>(
      'GET',
      `predictions/${id}`
    );
    return response;
  }
}

export class ImagePredictions extends Predictions {
  async generate(
    images: string[],
    model: string,
    domain: string,
    options: {
      jsonSchema?: Record<string, any>;
      detail?: DetailLevel;
      batch?: boolean;
      metadata?: Record<string, any>;
      callbackUrl?: string;
    } = {}
  ): Promise<PredictionResponse> {
    const {
      jsonSchema,
      detail = 'auto',
      batch = false,
      metadata = {},
      callbackUrl,
    } = options;

    const encodedImages = images.map(image => processImage(image));

    const [response] = await this.requestor.request<PredictionResponse>(
      'POST',
      'image/generate',
      undefined,
      {
        image: encodedImages[0],
        model,
        domain,
        json_schema: jsonSchema,
        detail,
        batch,
        metadata,
        callback_url: callbackUrl,
      }
    );
    return response;
  }
}

export class FilePredictions extends Predictions {
  private route: 'document' | 'audio' | 'video';

  constructor(client: Client, route: 'document' | 'audio' | 'video') {
    super(client);
    this.route = route;
  }

  async generate(
    fileIds: string[],
    model: string,
    domain: string,
    options: {
      jsonSchema?: Record<string, any>;
      detail?: DetailLevel;
      batch?: boolean;
      metadata?: Record<string, any>;
      callbackUrl?: string;
    } = {}
  ): Promise<PredictionResponse> {
    const {
      jsonSchema,
      detail = 'auto',
      batch = false,
      metadata = {},
      callbackUrl,
    } = options;

    const [response] = await this.requestor.request<PredictionResponse>(
      'POST',
      `/${this.route}/generate`,
      undefined,
      {
        file_id: fileIds[0],
        model,
        domain,
        json_schema: jsonSchema,
        detail,
        batch,
        metadata,
        callback_url: callbackUrl,
      }
    );
    return response;
  }
}

// Create specialized instances for different file types
export const DocumentPredictions = (client: Client) => new FilePredictions(client, 'document');
export const AudioPredictions = (client: Client) => new FilePredictions(client, 'audio');
export const VideoPredictions = (client: Client) => new FilePredictions(client, 'video');
