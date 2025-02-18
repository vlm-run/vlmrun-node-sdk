import { Client, APIRequestor } from "./base_requestor";
import { FinetuningResponse, FinetuningProvisionResponse, FinetuningGenerateParams, FinetuningListParams, PredictionResponse, FinetuningCreateParams, FinetuningProvisionParams } from "./types";
import { processImage } from "../utils";

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
  async create(params: FinetuningCreateParams): Promise<FinetuningResponse> {
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
        callback_url: params.callbackUrl,
        model: params.model,
        training_file: params.trainingFile,
        validation_file: params.validationFile,
        num_epochs: params.numEpochs ?? 1,
        batch_size: params.batchSize ?? 1,
        learning_rate: params.learningRate ?? 2e-4,
        suffix: params.suffix,
        wandb_api_key: params.wandbApiKey,
        wandb_base_url: params.wandbBaseUrl,
        wandb_project_name: params.wandbProjectName,
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
  async provision(params: FinetuningProvisionParams): Promise<FinetuningProvisionResponse> {
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
    if (!params.jsonSchema) {
      throw new Error("JSON schema is required for fine-tuned model predictions");
    }

    if (!params.prompt) {
      throw new Error("Prompt is required for fine-tuned model predictions");
    }

    if (params.domain) {
      throw new Error("Domain is not supported for fine-tuned model predictions");
    }

    if (params.detail && params.detail !== "auto") {
      throw new Error("Detail level is not supported for fine-tuned model predictions");
    }

    if (params.batch) {
      throw new Error("Batch mode is not supported for fine-tuned models");
    }

    if (params.callbackUrl) {
      throw new Error("Callback URL is not supported for fine-tuned model predictions");
    }
    
    const [response] = await this.requestor.request<PredictionResponse>(
      "POST",
      "generate",
      undefined,
      {
        images: params.images.map((image) => processImage(image)),
        model: params.model,
        config: {
          prompt: params.prompt,
          json_schema: params.jsonSchema,
          detail: params.detail ?? "auto",
          response_model: params.responseModel,
          confidence: params.confidence ?? false,
          grounding: params.grounding ?? false,
          max_retries: params.maxRetries ?? 3,
          max_tokens: params.maxTokens ?? 4096,
        },
        max_new_tokens: params.maxNewTokens ?? 1024,
        temperature: params.temperature ?? 0.0,
        metadata: {
          environment: params?.environment ?? "dev",
          session_id: params?.sessionId,
          allow_training: params?.allowTraining ?? true,
        },
        batch: params.batch ?? false,
        callback_url: params.callbackUrl,
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
