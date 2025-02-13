import { Client, APIRequestor } from "./base_requestor";
import { FinetuningResponse, FinetuningProvisionResponse, FinetuningGenerateParams, FinetuningListParams, PredictionResponse } from "./types";
import { encodeImage, processImage } from "../utils";

export class Finetuning {
  private requestor: APIRequestor;

  constructor(client: Client) {
    this.requestor = new APIRequestor({
      ...client,
      baseURL: `${client.baseURL}/fine_tuning`,
    });
  }

  /**
   * Create a fine-tuning job
   * @param {Object} params - Fine-tuning parameters
   * @param {string} params.model - Base model to fine-tune
   * @param {string} params.training_file_id - File ID for training data
   * @param {string} [params.validation_file_id] - File ID for validation data
   * @param {number} [params.num_epochs=1] - Number of epochs
   * @param {number|string} [params.batch_size="auto"] - Batch size for training
   * @param {number} [params.learning_rate=2e-4] - Learning rate for training
   * @param {string} [params.suffix] - Suffix for the fine-tuned model
   * @param {string} [params.wandb_api_key] - Weights & Biases API key
   * @param {string} [params.wandb_base_url] - Weights & Biases base URL
   * @param {string} [params.wandb_project_name] - Weights & Biases project name
   */
  async create(params: {
    model: string;
    training_file_id: string;
    validation_file_id?: string;
    num_epochs?: number;
    batch_size?: number | "auto";
    learning_rate?: number;
    suffix?: string;
    wandb_api_key?: string;
    wandb_base_url?: string;
    wandb_project_name?: string;
  }): Promise<FinetuningResponse> {
    if (params.suffix) {
      // Ensure suffix contains only alphanumeric, hyphens or underscores
      if (!/^[a-zA-Z0-9_-]+$/.test(params.suffix)) {
        throw new Error(
          "Suffix must be alphanumeric, hyphens or underscores without spaces"
        );
      }
    }

    const [response] = await this.requestor.request<FinetuningResponse>(
      "POST",
      "create",
      undefined,
      {
        model: params.model,
        training_file_id: params.training_file_id,
        validation_file_id: params.validation_file_id,
        num_epochs: params.num_epochs ?? 1,
        batch_size: params.batch_size ?? "auto",
        learning_rate: params.learning_rate ?? 2e-4,
        suffix: params.suffix,
        wandb_api_key: params.wandb_api_key,
        wandb_base_url: params.wandb_base_url,
        wandb_project_name: params.wandb_project_name,
      }
    );

    return response;
  }

  /**
   * Provision a fine-tuning model
   * @param {Object} params - Provisioning parameters
   * @param {string} params.model - Model to provision
   * @param {number} [params.duration=600] - Duration for the provisioned model (in seconds)
   * @param {number} [params.concurrency=1] - Concurrency for the provisioned model
   */
  async provision(params: {
    model: string;
    duration?: number;
    concurrency?: number;
  }): Promise<FinetuningProvisionResponse> {
    const [response] = await this.requestor.request<FinetuningProvisionResponse>(
      "POST",
      "provision",
      undefined,
      {
        model: params.model,
        duration: params.duration ?? 600, // 10 minutes default
        concurrency: params.concurrency ?? 1,
      }
    );

    return response;
  }

  /**
   * Generate a prediction using a fine-tuned model
   * @param {FinetuningGenerateParams} params - Generation parameters
   */
  async generate(params: FinetuningGenerateParams): Promise<PredictionResponse> {
    if (!params.json_schema) {
      throw new Error("JSON schema is required for fine-tuned model predictions");
    }

    if (!params.prompt) {
      throw new Error("Prompt is required for fine-tuned model predictions");
    }

    if (params.domain) {
      throw new Error("Domain is not supported for fine-tuned model predictions");
    }

    if (params.detail !== "auto") {
      throw new Error("Detail level is not supported for fine-tuned model predictions");
    }

    if (params.batch) {
      throw new Error("Batch mode is not supported for fine-tuned models");
    }

    if (params.callback_url) {
      throw new Error("Callback URL is not supported for fine-tuned model predictions");
    }
    
    if (params.images.length > 1) {
      throw new Error("Only one image is supported for fine-tuned model predictions for now");
    }

    const encodedImage = processImage(params.images[0]);

    const [response] = await this.requestor.request<PredictionResponse>(
      "POST",
      "generate",
      undefined,
      {
        image: encodedImage,
        model: params.model,
        prompt: params.prompt,
        json_schema: params.json_schema,
        detail: params.detail ?? "auto",
        max_new_tokens: params.max_new_tokens ?? 1024,
        temperature: params.temperature ?? 0.0,
        metadata: params.metadata ?? {},
        batch: params.batch ?? false,
        callback_url: params.callback_url,
      }
    );

    return response;
  }

  /**
   * List all fine-tuning jobs
   * @param {FinetuningListParams} params - List parameters
   */
  async list(params?: FinetuningListParams): Promise<FinetuningResponse[]> {
    const [response] = await this.requestor.request<FinetuningResponse[]>(
      "GET",
      "jobs",
      {
        skip: params?.skip ?? 0,
        limit: params?.limit ?? 10,
      }
    );

    return response;
  }

  /**
   * List all fine-tuning models
   * @param {FinetuningListParams} params - List parameters
   */
  async listModels(params?: FinetuningListParams): Promise<string[]> {
    const [response] = await this.requestor.request<string[]>(
      "GET",
      "models",
      {
        skip: params?.skip ?? 0,
        limit: params?.limit ?? 10,
      }
    );

    return response;
  }

  /**
   * Get fine-tuning job details
   * @param {string} jobId - ID of job to retrieve
   */
  async get(jobId: string): Promise<FinetuningResponse> {
    const [response] = await this.requestor.request<FinetuningResponse>(
      "GET",
      `jobs/${jobId}`
    );

    return response;
  }

  /**
   * Cancel a fine-tuning job
   * @param {string} jobId - ID of job to cancel
   */
  async cancel(jobId: string): Promise<Record<string, any>> {
    throw new Error("Not implemented");
  }
}
