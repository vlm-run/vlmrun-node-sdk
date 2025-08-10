import { Models } from "./client/models";
import { Files } from "./client/files";
import { Client, APIRequestor } from "./client/base_requestor";
import { AuthenticationError } from "./client/exceptions";
import {
  Predictions,
  ImagePredictions,
  DocumentPredictions,
  AudioPredictions,
  VideoPredictions,
  WebPredictions,
} from "./client/predictions";
import { Feedback } from "./client/feedback";
import { Finetuning } from "./client/fine_tuning";
import { Datasets } from "./client/datasets";
import { Hub } from "./client/hub";
import { Agent } from "./client/agent";
import { Executions } from "./client/executions";
import { Domains } from "./client/domains";

export * from "./client/types";
export * from "./client/base_requestor";
export * from "./client/models";
export * from "./client/files";
export * from "./client/predictions";
export * from "./client/feedback";
export * from "./client/fine_tuning";
export * from "./client/exceptions";
export * from "./client/agent";
export * from "./client/executions";

export * from "./utils";

export interface VlmRunConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
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
  readonly web: WebPredictions;
  readonly feedback: Feedback;
  readonly finetuning: Finetuning;
  readonly dataset: Datasets;
  readonly hub: Hub;
  readonly agent: Agent;
  readonly executions: Executions;
  readonly domains: Domains;

  constructor(config: VlmRunConfig) {
    this.client = {
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? "https://api.vlm.run/v1",
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    };


    this.models = new Models(this.client);
    this.files = new Files({ ...this.client, timeout: 0 });
    this.predictions = new Predictions(this.client);
    this.image = new ImagePredictions(this.client);
    this.document = DocumentPredictions(this.client);
    this.audio = AudioPredictions(this.client);
    this.video = VideoPredictions(this.client);
    this.web = new WebPredictions(this.client);
    this.feedback = new Feedback(this.client);
    this.finetuning = new Finetuning(this.client);
    this.dataset = new Datasets(this.client);
    this.hub = new Hub(this.client);
    this.agent = new Agent(this.client);
    this.executions = new Executions(this.client);
    this.domains = new Domains(this.client);
  }

  async validateApiKey(): Promise<void> {
    try {
      const requestor = new APIRequestor(this.client);
      const [, statusCode] = await requestor.request("GET", "/health");
      if (statusCode !== 200) {
        throw new AuthenticationError(
          "Invalid API key",
          statusCode,
          undefined,
          undefined,
          "invalid_api_key",
          "Please check your API key and ensure it is valid. You can get your API key at https://app.vlm.run/dashboard"
        );
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        "Invalid API key",
        401,
        undefined,
        undefined,
        "invalid_api_key",
        "Please check your API key and ensure it is valid. You can get your API key at https://app.vlm.run/dashboard"
      );
    }
  }
}
