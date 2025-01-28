import { APIClient } from '../core';
import { Files } from './files';
import { Models } from './models';
import { Image } from './image';
import { Document } from './document';
import { Audio } from './audio';
import { Feedback } from './feedback';
import { Finetuning } from './fine_tuning';
import { Datasets } from './datasets';
import { Hub } from './hub';
import { DocumentPredictions, AudioPredictions, VideoPredictions, ImagePredictions } from './predictions';

export class Client extends APIClient {
  files: Files;
  models: Models;
  image: Image;
  document: Document;
  audio: Audio;
  feedback: Feedback;
  fineTuning: Finetuning;
  datasets: Datasets;
  hub: Hub;
  documentPredictions: DocumentPredictions;
  audioPredictions: AudioPredictions;
  videoPredictions: VideoPredictions;
  imagePredictions: ImagePredictions;

  constructor(options: ClientOptions = {}) {
    const {
      apiKey = process.env.VLMRUN_API_KEY,
      baseURL = process.env.VLMRUN_BASE_URL,
      timeout = 120000,
      ...rest
    } = options;

    if (!apiKey) {
      throw new Error('API key is required. Pass it as apiKey or set VLMRUN_API_KEY environment variable.');
    }

    super({ baseURL, timeout, ...rest });
    this.apiKey = apiKey;

    this.files = new Files(this);
    this.models = new Models(this);
    this.image = new Image(this);
    this.document = new Document(this);
    this.audio = new Audio(this);
    this.feedback = new Feedback(this);
    this.fineTuning = new Finetuning(this);
    this.datasets = new Datasets(this);
    this.hub = new Hub(this);
    this.documentPredictions = new DocumentPredictions(this);
    this.audioPredictions = new AudioPredictions(this);
    this.videoPredictions = new VideoPredictions(this);
    this.imagePredictions = new ImagePredictions(this);
  }

  protected authHeaders() {
    return { Authorization: `Bearer ${this.apiKey}` };
  }
}

export interface ClientOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
}
