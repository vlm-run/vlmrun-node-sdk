/// <reference types="node" />

import { APIClient } from '../core';
import { Files } from './files';
import { Models } from './models';
import { Feedback } from './feedback';
import { Finetuning } from './fine_tuning';
import { Datasets } from './datasets';
import { Hub } from './hub';
import { 
  Predictions,
  ImagePredictions,
  DocumentPredictions,
  AudioPredictions,
  VideoPredictions,
} from './predictions';

export interface ClientOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
}

export class Client extends APIClient {
  protected apiKey: string;
  protected defaultQuery: Record<string, unknown> = {};
  protected baseURL: string;

  // Core resources
  readonly files: Files;
  readonly models: Models;
  readonly predictions: Predictions;

  // Media processing resources
  readonly image: ImagePredictions;
  readonly document: DocumentPredictions;
  readonly audio: AudioPredictions;
  readonly video: VideoPredictions;

  // Experimental resources
  readonly datasets: Datasets;
  readonly hub: Hub;
  readonly fine_tuning: Finetuning;
  readonly feedback: Feedback;

  constructor(options: ClientOptions = {}) {
    const {
      apiKey = process.env['VLMRUN_API_KEY'],
      baseURL = process.env['VLMRUN_BASE_URL'],
      timeout = 120000,
      ...rest
    } = options;

    if (!apiKey) {
      throw new Error(
        'API key must be provided either through constructor or VLMRUN_API_KEY environment variable'
      );
    }

    super({ 
      baseURL: baseURL || 'https://api.vlm.run/v1',
      timeout,
      ...rest,
      defaultHeaders: {
        'User-Agent': `vlmrun-node/${require('../../package.json').version}`,
        ...rest.defaultHeaders,
      },
    });
    this.apiKey = apiKey;

    // Initialize core resources
    this.files = new Files(this);
    this.models = new Models(this);
    this.predictions = new Predictions(this);

    // Initialize prediction resources
    this.image = new ImagePredictions(this);
    this.document = new DocumentPredictions(this);
    this.audio = new AudioPredictions(this);
    this.video = new VideoPredictions(this);

    // Initialize experimental resources
    const experimentalClient = Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
      baseURL: `${this.baseURL}/experimental`,
    });
    this.datasets = new Datasets(experimentalClient);
    this.hub = new Hub(experimentalClient);
    this.fine_tuning = new Finetuning(experimentalClient);
    this.feedback = new Feedback(experimentalClient);

    // Configure longer timeouts for media processing
    const longTimeoutClient = Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
      timeout: 300000, // 5 minutes
    });
    this.document = new DocumentPredictions(longTimeoutClient);
    this.audio = new AudioPredictions(longTimeoutClient);
    this.video = new VideoPredictions(longTimeoutClient);
  }

  protected override authHeaders() {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  async healthcheck(): Promise<boolean> {
    try {
      const response = await this.get('health', { raw_response: true });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  get version(): string {
    return require('../../package.json').version;
  }
}
