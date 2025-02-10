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
  jsonSchema?: Record<string, any> | null;
  confidence?: boolean;
  grounding?: boolean;
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
    };
  }
}

export type GenerationConfigInput = GenerationConfig | GenerationConfigParams;

export interface ImagePredictionParams extends PredictionGenerateParams {
  batch?: boolean;
  images: string[];
}

export interface FilePredictionParams extends PredictionGenerateParams {
  batch?: boolean;
  fileId?: string;
  url?: string;
}

export interface WebPredictionParams extends PredictionGenerateParams {
  url: string;
  mode: "fast" | "accurate";
}

export class APIError extends Error {
  constructor(
    message: string,
    public http_status?: number,
    public headers?: Record<string, string>
  ) {
    super(message);
    this.name = "APIError";
  }
}
