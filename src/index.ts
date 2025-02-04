import { Models } from "./client/models";
import { Files } from "./client/files";
import { Client } from "./client/base_requestor";
import {
  Predictions,
  ImagePredictions,
  DocumentPredictions,
  AudioPredictions,
  VideoPredictions,
} from "./client/predictions";
import { Feedback } from "./client/feedback";

export * from "./client/types";
export * from "./client/base_requestor";
export * from "./client/models";
export * from "./client/files";
export * from "./client/predictions";
export * from "./client/feedback";

export * from "./utils";

export interface VlmRunConfig {
  apiKey: string;
  baseURL?: string;
}

export class VlmRun {
  private client: Client;
  readonly models: Models;
  readonly files: Files;
  readonly predictions: Predictions;
  readonly image: ImagePredictions;
  readonly document: ReturnType<typeof DocumentPredictions>;
  readonly audio: ReturnType<typeof AudioPredictions>;
  readonly video: ReturnType<typeof VideoPredictions>;
  readonly feedback: Feedback;

  constructor(config: VlmRunConfig) {
    this.client = {
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? "https://api.vlm.run/v1",
    };

    this.models = new Models(this.client);
    this.files = new Files(this.client);
    this.predictions = new Predictions(this.client);
    this.image = new ImagePredictions(this.client);
    this.document = DocumentPredictions(this.client);
    this.audio = AudioPredictions(this.client);
    this.video = VideoPredictions(this.client);
    this.feedback = new Feedback(this.client);
  }
}
