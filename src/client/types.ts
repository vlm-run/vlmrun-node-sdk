import { ZodType } from "zod";

export type JobStatus = string;

export type FilePurpose = string;

export type DetailLevel = string;

export interface FileResponse {
  id: string;
  filename: string;
  bytes: number;
  purpose: FilePurpose;
  created_at: string;
  object: "file";
}

export interface CreditUsage {
  elements_processed?: number;
  element_type?: "image" | "page" | "video" | "audio";
  credits_used?: number;
}

export interface ModelInfoResponse {
  model: string;
  domain: string;
}

export interface PredictionResponse {
  id: string;
  created_at: string;
  completed_at?: string;
  response?: any;
  status: JobStatus;
  message?: string;
  usage?: CreditUsage;
}

export interface FeedbackSubmitResponse {
  id: string;
  created_at: string;
  request_id: string;
  response: any;
}

export interface ListParams {
  skip?: number;
  limit?: number;
}

export interface FileUploadParams {
  filePath?: string;
  file?: File;
  purpose?: string;
  checkDuplicate?: boolean;
}

export interface FeedbackSubmitParams {
  id: string;
  label?: Record<string, any>;
  notes?: string;
  flag?: boolean;
}

export interface PredictionGenerateParams {
  model?: string;
  domain: string;
  config?: GenerationConfigParams;
  metadata?: RequestMetadataParams;
  callbackUrl?: string;
}

export type RequestMetadataParams = {
  environment?: "dev" | "staging" | "prod";
  sessionId?: string | null;
  allowTraining?: boolean;
};

export class RequestMetadata {
  /**
   * The environment where the request was made.
   */
  environment: "dev" | "staging" | "prod" = "dev";

  /**
   * The session ID of the request
   */
  sessionId: string | null = null;

  /**
   * Whether the file can be used for training
   */
  allowTraining: boolean = true;

  constructor(params: Partial<RequestMetadata> = {}) {
    Object.assign(this, params);
  }

  /**
   * Creates the metadata object in the format expected by the API
   */
  toJSON() {
    return {
      environment: this.environment,
      session_id: this.sessionId,
      allow_training: this.allowTraining,
    };
  }
}

export type RequestMetadataInput = RequestMetadata | RequestMetadataParams;

export type GenerationConfigParams = {
  detail?: "auto" | "hi" | "lo";
  responseModel?: ZodType;
  zodToJsonParams?: any;
  jsonSchema?: Record<string, any> | null;
  confidence?: boolean;
  grounding?: boolean;
  gqlStmt?: string | null;
};

export class GenerationConfig {
  /**
   * The detail level to use for processing the images or documents.
   */
  detail: "auto" | "hi" | "lo" = "auto";

  /**
   * The JSON schema to use for the model.
   */
  jsonSchema: Record<string, any> | null = null;

  /**
   * Include confidence scores in the response (included in the `_metadata` field).
   */
  confidence: boolean = false;

  /**
   * Include grounding in the response (included in the `_metadata` field).
   */
  grounding: boolean = false;

  /**
   * The GraphQL statement to use for the model.
   */
  gqlStmt: string | null = null;

  constructor(params: Partial<GenerationConfig> = {}) {
    Object.assign(this, params);
  }

  /**
   * Creates the config object in the format expected by the API
   */
  toJSON() {
    return {
      detail: this.detail,
      json_schema: this.jsonSchema,
      confidence: this.confidence,
      grounding: this.grounding,
      gql_stmt: this.gqlStmt,
    };
  }
}

export type GenerationConfigInput = GenerationConfig | GenerationConfigParams;

export interface SchemaResponse {
  json_schema: Record<string, any>;
  schema_version: string;
  schema_hash: string;
  domain: string;
  gql_stmt: string;
  description: string;
}

export interface ImagePredictionParams extends PredictionGenerateParams {
  batch?: boolean;
  images?: string[];
  urls?: string[];
}

export interface FilePredictionParams extends PredictionGenerateParams {
  batch?: boolean;
  fileId?: string;
  url?: string;
}

export interface FilePredictionSchemaParams {
  fileId?: string;
  url?: string;
}

export interface WebPredictionParams extends PredictionGenerateParams {
  url: string;
  mode: "fast" | "accurate";
}

export interface FinetuningResponse {
  id: string;
  created_at: string;
  completed_at?: string;
  status: JobStatus;
  model: string;
  training_file_id: string;
  validation_file_id?: string;
  num_epochs: number;
  batch_size: number | string;
  learning_rate: number;
  suffix?: string;
  wandb_url?: string;
  message?: string;
}

export interface FinetuningProvisionResponse {
  id: string;
  created_at: string;
  model: string;
  duration: number;
  concurrency: number;
  status: JobStatus;
  message?: string;
}

export interface FinetuningCreateParams {
  callbackUrl?: string;
  model: string;
  trainingFile: string;
  validationFile?: string;
  numEpochs?: number;
  batchSize?: number | string;
  learningRate?: number;
  suffix?: string;
  wandbApiKey?: string;
  wandbBaseUrl?: string;
  wandbProjectName?: string;
}

export interface FinetuningGenerateParams {
  images: string[];
  model: string;
  prompt?: string;
  domain?: string;
  jsonSchema?: Record<string, any>;
  maxNewTokens?: number;
  temperature?: number;
  detail?: "auto" | "hi" | "lo";
  batch?: boolean;
  metadata?: Record<string, any>;
  callbackUrl?: string;
  maxRetries?: number;
  maxTokens?: number;
  confidence?: boolean;
  grounding?: boolean;
  environment?: string;
  sessionId?: string;
  allowTraining?: boolean;
  responseModel?: string;
}

export interface FinetuningProvisionParams {
  model: string;
  duration?: number;
  concurrency?: number;
}

export interface FinetuningListParams {
  skip?: number;
  limit?: number;
}

export interface DatasetListParams {
  skip?: number;
  limit?: number;
}

export interface HubInfoResponse {
  version: string;
}

export interface DomainInfo {
  domain: string;
  name: string;
  description: string;
}

export interface HubSchemaResponse {
  json_schema: Record<string, any>;
  schema_version: string;
  schema_hash: string;
  domain: string;
  gql_stmt: string;
  description: string;
}

export interface DatasetResponse {
  id: string;
  created_at: string;
  completed_at?: string;
  status: JobStatus;
  domain: string;
  dataset_name: string;
  dataset_type: "images" | "videos" | "documents";
  file_id: string;
  wandb_url?: string;
  message?: string;
}

export interface DatasetCreateParams {
  datasetDirectory: string;
  domain: string;
  datasetName: string;
  datasetType: "images" | "videos" | "documents";
  wandbBaseUrl?: string;
  wandbProjectName?: string;
  wandbApiKey?: string;
}

export interface VlmRunError extends Error {
  message: string;
  code?: string;
  cause?: Error;
}

export interface HubSchemaParams {
  domain: string;
  gql_stmt?: string;
}

export interface AgentGetParams {
  name: string;
  version?: string;
}

export interface AgentExecuteParams {
  name: string;
  version?: string;
  fileIds?: string[];
  urls?: string[];
  batch?: boolean;
  config?: GenerationConfigInput;
  metadata?: RequestMetadataInput;
  callbackUrl?: string;
}
