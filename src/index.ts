import { Models } from "./client/models";
import { Files } from "./client/files";
import { Client, APIRequestor } from "./client/base_requestor";
import {
  Predictions,
  ImagePredictions,
  DocumentPredictions,
  AudioPredictions,
  VideoPredictions,
} from "./client/predictions";
import { Feedback } from "./client/feedback";
import { Finetuning } from "./client/fine_tuning";
import { Datasets } from "./client/datasets";
import { Hub } from "./client/hub";
import { Agent } from "./client/agent";
import { Gateway } from "./client/gateway";
import { Skills } from "./client/skills";
import { Executions } from "./client/executions";
import { Domains } from "./client/domains";
import { Artifacts } from "./client/artifacts";
import { ConfigurationError } from "./client/exceptions";
import {
  DEFAULT_BASE_URL,
  VLMRUN_API_KEY_ENV,
  VLMRUN_BASE_URL_ENV,
  readEnv,
} from "./constants";

export * from "./client/types";
export * from "./client/base_requestor";
export * from "./client/models";
export * from "./client/files";
export * from "./client/predictions";
export * from "./client/feedback";
export * from "./client/fine_tuning";
export * from "./client/exceptions";
export * from "./client/agent";
export * from "./client/gateway";
export * from "./client/systemone";
export * from "./constants";
export * from "./client/skills";
export * from "./client/executions";
export * from "./client/artifacts";

export * from "./utils";

export interface VlmRunConfig {
  /** API key. Falls back to the `VLMRUN_API_KEY` environment variable. */
  apiKey?: string;
  /** API base URL. Falls back to `VLMRUN_BASE_URL`, then `https://api.vlm.run/v1`. */
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  /**
   * When true (default), a missing API key throws a `ConfigurationError`.
   * Set to false to use deployments that do not authenticate (e.g. a local
   * gateway).
   */
  requireApiKey?: boolean;
}

export class VlmRun {
  private client: Client;
  private requestor: APIRequestor;
  readonly models: Models;
  readonly files: Files;
  readonly predictions: Predictions;
  readonly image: ImagePredictions;
  readonly document: ReturnType<typeof DocumentPredictions>;
  readonly audio: ReturnType<typeof AudioPredictions>;
  readonly video: ReturnType<typeof VideoPredictions>;
  readonly feedback: Feedback;
  readonly finetuning: Finetuning;
  readonly dataset: Datasets;
  readonly hub: Hub;
  readonly agent: Agent;
  readonly gateway: Gateway;
  readonly skills: Skills;
  readonly executions: Executions;
  readonly domains: Domains;
  readonly artifacts: Artifacts;

  constructor(config: VlmRunConfig = {}) {
    const apiKey = config.apiKey || readEnv(VLMRUN_API_KEY_ENV) || "";
    if (!apiKey && config.requireApiKey !== false) {
      throw new ConfigurationError(
        "Missing API key",
        "missing_api_key",
        "Pass `apiKey` to `new VlmRun({ apiKey })` or set the VLMRUN_API_KEY " +
          "environment variable. Get your API key at https://app.vlm.run/dashboard",
      );
    }
    this.client = {
      apiKey,
      baseURL: config.baseURL ?? readEnv(VLMRUN_BASE_URL_ENV) ?? DEFAULT_BASE_URL,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    };
    this.requestor = new APIRequestor(this.client);

    this.models = new Models(this.client);
    this.files = new Files({ ...this.client, timeout: 0 });
    this.predictions = new Predictions(this.client);
    this.image = new ImagePredictions(this.client);
    this.document = DocumentPredictions(this.client);
    this.audio = AudioPredictions(this.client);
    this.video = VideoPredictions(this.client);
    this.feedback = new Feedback(this.client);
    this.finetuning = new Finetuning(this.client);
    this.dataset = new Datasets(this.client);
    this.hub = new Hub(this.client);
    this.agent = new Agent(this.client);
    this.gateway = new Gateway(this.client);
    this.skills = new Skills(this.client);
    this.executions = new Executions(this.client);
    this.domains = new Domains(this.client);
    this.artifacts = new Artifacts(this.client);
  }

  /**
   * Check the health of the API.
   * @returns Promise<boolean> - true if the API is healthy, false otherwise
   */
  async healthcheck(): Promise<boolean> {
    try {
      const [, statusCode] = await this.requestor.request<unknown>(
        "GET",
        "/health"
      );
      return statusCode === 200;
    } catch {
      return false;
    }
  }
}
