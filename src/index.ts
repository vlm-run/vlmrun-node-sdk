import { Models } from "./client/models";
import { Files } from "./client/files";
import { Client, APIRequestor } from "./client/base_requestor";
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
import { Domains } from "./client/domains";
import {
  DomainInfo,
  SchemaResponse,
  GenerationConfig,
  GenerationConfigInput,
} from "./client/types";

export * from "./client/types";
export * from "./client/base_requestor";
export * from "./client/models";
export * from "./client/files";
export * from "./client/predictions";
export * from "./client/feedback";
export * from "./client/fine_tuning";
export * from "./client/exceptions";
export * from "./client/agent";

export * from "./utils";

export interface VlmRunConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

export class VlmRun {
  private client: Client;
  private _requestor?: APIRequestor;
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
  readonly domains: Domains;

  get requestor(): APIRequestor {
    if (!this._requestor) {
      this._requestor = new APIRequestor(this.client);
    }
    return this._requestor;
  }

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
    this.domains = new Domains(this.client);
  }

  /**
   * Get the schema for a domain.
   * @param domain Domain name (e.g. "document.invoice")
   * @param config Optional generation config
   * @returns Schema response containing JSON schema and metadata
   */
  async getSchema(
    domain: string,
    config?: GenerationConfigInput
  ): Promise<SchemaResponse> {
    const configObj = config instanceof GenerationConfig ? config : new GenerationConfig(config);
    const [response] = await this.requestor.request<SchemaResponse>(
      "POST",
      "/schema",
      undefined,
      { domain, config: configObj.toJSON() }
    );
    return response;
  }

  /**
   * List all available domains.
   * @returns List of domain information
   */
  async listDomains(): Promise<DomainInfo[]> {
    return this.domains.list();
  }
}
