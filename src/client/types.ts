import { ZodType } from "zod";

export type JobStatus = string;

export type FilePurpose = string;

export type DetailLevel = string;

// URL pattern for http/https URLs
const URL_PATTERN = /^https?:\/\/.+/;

/**
 * Validate that the string is a valid HTTP/HTTPS URL.
 */
export function validateHttpUrl(url: string): boolean {
  return URL_PATTERN.test(url);
}

/**
 * Image URL with optional detail level.
 */
export interface ImageUrl {
  url: string;
  detail?: "auto" | "low" | "high";
}

/**
 * Base interface for file URLs.
 */
export interface FileUrl {
  url: string;
}

/**
 * Video URL.
 */
export interface VideoUrl extends FileUrl {
  url: string;
}

/**
 * Audio URL.
 */
export interface AudioUrl extends FileUrl {
  url: string;
}

/**
 * Document URL.
 */
export interface DocumentUrl extends FileUrl {
  url: string;
}

/**
 * Message content type.
 */
export type MessageContentType =
  | "text"
  | "image_url"
  | "video_url"
  | "audio_url"
  | "file_url"
  | "input_file";

/**
 * Message content with various input types.
 */
export interface MessageContent {
  type: MessageContentType;
  text?: string;
  image_url?: ImageUrl;
  video_url?: VideoUrl;
  audio_url?: AudioUrl;
  file_url?: FileUrl;
  file_id?: string;
}

/**
 * Validate MessageContent - ensures the content matches the type.
 */
export function validateMessageContent(content: MessageContent): void {
  if (content.type === "input_file") {
    if (!content.file_id && !content.file_url) {
      throw new Error("Must have either file_id or file_url");
    }
    return;
  }

  const typeFieldMap: Record<string, keyof MessageContent> = {
    text: "text",
    image_url: "image_url",
    video_url: "video_url",
    audio_url: "audio_url",
    file_url: "file_url",
  };

  const field = typeFieldMap[content.type];
  if (field && !content[field]) {
    throw new Error(`Must have ${content.type}`);
  }
}

// Artifact reference types with pattern validation
const IMAGE_REF_PATTERN = /^img_\w{6}$/;
const AUDIO_REF_PATTERN = /^aud_\w{6}$/;
const VIDEO_REF_PATTERN = /^vid_\w{6}$/;
const DOCUMENT_REF_PATTERN = /^doc_\w{6}$/;
const RECON_REF_PATTERN = /^recon_\w{6}$/;
const ARRAY_REF_PATTERN = /^arr_\w{6}$/;
const URL_REF_PATTERN = /^url_\w{6}$/;

/**
 * Image reference with pattern validation.
 */
export interface ImageRef {
  id: string;
}

/**
 * Audio reference with pattern validation.
 */
export interface AudioRef {
  id: string;
}

/**
 * Video reference with pattern validation.
 */
export interface VideoRef {
  id: string;
}

/**
 * Document reference with pattern validation.
 */
export interface DocumentRef {
  id: string;
}

/**
 * Reconstruction reference with pattern validation.
 */
export interface ReconRef {
  id: string;
}

/**
 * Array reference with pattern validation.
 */
export interface ArrayRef {
  id: string;
}

/**
 * URL reference with pattern validation.
 */
export interface UrlRef {
  id: string;
}

/**
 * Validate an artifact reference ID against its expected pattern.
 */
export function validateRefId(
  id: string,
  type: "img" | "aud" | "vid" | "doc" | "recon" | "arr" | "url"
): boolean {
  const patterns: Record<string, RegExp> = {
    img: IMAGE_REF_PATTERN,
    aud: AUDIO_REF_PATTERN,
    vid: VIDEO_REF_PATTERN,
    doc: DOCUMENT_REF_PATTERN,
    recon: RECON_REF_PATTERN,
    arr: ARRAY_REF_PATTERN,
    url: URL_REF_PATTERN,
  };
  return patterns[type]?.test(id) ?? false;
}

export interface FileResponse {
  id: string;
  filename: string;
  bytes: number;
  purpose: FilePurpose;
  created_at: string;
  object: "file";
  public_url?: string;
}

export interface PresignedUrlResponse {
  id?: string;
  filename: string;
  content_type?: string;
  url: string;
  upload_method?: string;
  public_url?: string;
  created_at?: string;
}

export interface PresignedUrlRequest {
  filename: string;
  purpose?: string;
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

export interface ListParams {
  skip?: number;
  limit?: number;
}

export interface FileUploadParams {
  filePath?: string;
  file?: File;
  purpose?: string;
  checkDuplicate?: boolean;
  method?: "auto" | "direct" | "presigned-url";
  expiration?: number;
  force?: boolean;
  generatePublicUrl?: boolean;
}

/**
 * Source payload for an inline skill bundle.
 */
export interface InlineSkillSource {
  type?: string;
  mediaType?: string;
  data: string;
}

export interface AgentSkillParams {
  type?: string;
  skillId?: string;
  skillName?: string;
  skillVersion?: string;
  /** @deprecated Use skillVersion instead */
  version?: string;
  name?: string;
  description?: string;
  source?: InlineSkillSource;
  /** @deprecated Use source.data instead */
  bundle?: string;
}

export class AgentSkill {
  type: string = "skill_reference";
  skillId?: string;
  skillName?: string;
  skillVersion: string = "latest";
  name?: string;
  description?: string;
  source?: InlineSkillSource;
  /** @deprecated Use source.data instead */
  bundle?: string;

  constructor(params: AgentSkillParams = {}) {
    const isInline = params.type === "inline";
    if (!isInline && !params.skillId && !params.skillName) {
      throw new Error("Either 'skillId' or 'skillName' must be provided for referenced skills");
    }
    // Handle version -> skillVersion backward compatibility
    if (params.version && !params.skillVersion) {
      params.skillVersion = params.version;
    }
    Object.assign(this, params);
  }

  toJSON(): Record<string, any> {
    const json: Record<string, any> = {
      type: this.type,
    };

    if (this.type === "inline") {
      if (this.name !== undefined) json.name = this.name;
      if (this.description !== undefined) json.description = this.description;
      if (this.source) {
        json.source = {
          type: this.source.type ?? "base64",
          media_type: this.source.mediaType ?? "application/zip",
          data: this.source.data,
        };
      }
      if (this.bundle !== undefined) json.bundle = this.bundle;
    } else {
      if (this.skillId !== undefined) json.skill_id = this.skillId;
      if (this.skillName !== undefined) json.skill_name = this.skillName;
      json.skill_version = this.skillVersion;
    }

    return json;
  }
}

export type AgentSkillInput = AgentSkill | AgentSkillParams;

export interface PredictionGenerateParams {
  model?: string;
  domain?: string;
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
  skills?: AgentSkillInput[];
  confidence?: boolean;
  grounding?: boolean;
  gqlStmt?: string | null;
  serviceTier?: "auto" | "default" | "standard" | "flex" | "priority" | null;
  videoSegmentDuration?: number | null;
  videoFramesPerSegment?: number | null;
  pageIndices?: number[] | null;
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
   * List of skills to enable for this request.
   */
  skills?: AgentSkillInput[];

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

  /**
   * Delivery tier for billing and request routing.
   */
  serviceTier?: "auto" | "default" | "standard" | "flex" | "priority" | null;

  /**
   * Duration in seconds for each video segment when chunking a video.
   */
  videoSegmentDuration?: number | null;

  /**
   * Number of frames to sample per video segment.
   */
  videoFramesPerSegment?: number | null;

  /**
   * 0-indexed page indices to process for document files. If null, all pages are processed.
   */
  pageIndices?: number[] | null;

  constructor(params: Partial<GenerationConfig> = {}) {
    Object.assign(this, params);
  }

  /**
   * Creates the config object in the format expected by the API
   */
  toJSON() {
    const json: Record<string, any> = {
      detail: this.detail,
      json_schema: this.jsonSchema,
      skills: this.skills?.map((s) =>
        s instanceof AgentSkill ? s.toJSON() : new AgentSkill(s).toJSON()
      ),
      confidence: this.confidence,
      grounding: this.grounding,
      gql_stmt: this.gqlStmt,
    };
    if (this.serviceTier !== undefined) json.service_tier = this.serviceTier;
    if (this.videoSegmentDuration !== undefined) json.video_segment_duration = this.videoSegmentDuration;
    if (this.videoFramesPerSegment !== undefined) json.video_frames_per_segment = this.videoFramesPerSegment;
    if (this.pageIndices !== undefined) json.page_indices = this.pageIndices;
    return json;
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

export interface FeedbackSubmitRequest {
  request_id?: string | null;
  agent_execution_id?: string | null;
  chat_id?: string | null;
  response?: Record<string, any> | null;
  notes?: string | null;
}

export interface FeedbackItem {
  id: string;
  request_id?: string | null;
  agent_execution_id?: string | null;
  chat_id?: string | null;
  created_at: string;
  response: Record<string, any> | null;
  notes: string | null;
}

export interface FeedbackListResponse {
  request_id?: string | null;
  agent_execution_id?: string | null;
  chat_id?: string | null;
  items: FeedbackItem[];
}

export interface FeedbackSubmitResponse {
  id: string;
  request_id?: string | null;
  agent_execution_id?: string | null;
  chat_id?: string | null;
  created_at: string;
}

export interface FileExecuteParams {
  name: string;
  version?: string;
  fileId?: string;
  url?: string;
  batch?: boolean;
  config?: GenerationConfigInput;
  metadata?: RequestMetadataInput;
  callbackUrl?: string;
}

export interface AgentExecutionResponse {
  id: string;
  name: string;
  created_at: string;
  completed_at?: string;
  response?: Record<string, any>;
  status: JobStatus;
  usage: CreditUsage;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  prompt: string;
  json_schema?: Record<string, any>;
  json_sample?: Record<string, any>;
  created_at: string;
  updated_at: string;
  status: JobStatus;
}

export interface AgentCreationResponse {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  status: JobStatus;
}

export type AgentExecutionConfigParams = {
  prompt?: string;
  responseModel?: ZodType;
  jsonSchema?: Record<string, any>;
  skills?: AgentSkillInput[];
};

export class AgentExecutionConfig {
  prompt?: string;
  jsonSchema?: Record<string, any>;
  skills?: AgentSkillInput[];

  constructor(params: Partial<AgentExecutionConfig> = {}) {
    Object.assign(this, params);
  }

  toJSON() {
    return {
      prompt: this.prompt,
      json_schema: this.jsonSchema,
      skills: this.skills?.map((s) =>
        s instanceof AgentSkill ? s.toJSON() : new AgentSkill(s).toJSON()
      ),
    };
  }
}

export type AgentCreationConfigParams = {
  prompt?: string;
  responseModel?: ZodType;
  jsonSchema?: Record<string, any>;
  skills?: AgentSkillInput[];
};

export class AgentCreationConfig {
  prompt?: string;
  jsonSchema?: Record<string, any>;
  skills?: AgentSkillInput[];

  constructor(params: Partial<AgentCreationConfig> = {}) {
    Object.assign(this, params);
  }

  toJSON() {
    return {
      prompt: this.prompt,
      json_schema: this.jsonSchema,
      skills: this.skills?.map((s) =>
        s instanceof AgentSkill ? s.toJSON() : new AgentSkill(s).toJSON()
      ),
    };
  }
}

export type AgentExecutionConfigInput = AgentExecutionConfig | AgentExecutionConfigParams;
export type AgentCreationConfigInput = AgentCreationConfig | AgentCreationConfigParams;

export interface AgentCreateParams {
  config: AgentCreationConfigInput;
  name?: string;
  inputs?: Record<string, any>;
  callbackUrl?: string;
}

export interface AgentExecuteParamsNew {
  name?: string;
  inputs?: Record<string, any>;
  batch?: boolean;
  config?: AgentExecutionConfigInput;
  metadata?: RequestMetadataInput;
  callbackUrl?: string;
}

// --- Skills types ---

export interface SkillInfo {
  id: string;
  name: string;
  description?: string;
  skill_version?: string;
  /** @deprecated Use skill_version instead */
  version?: string;
  created_at?: string;
  updated_at?: string;
  status?: JobStatus;
  is_public?: boolean;
}

export interface SkillDownloadResponse {
  download_url: string;
  expires_in?: number;
}

export interface SkillListParams {
  limit?: number;
  offset?: number;
  orderBy?: string;
  descending?: boolean;
  grouped?: boolean;
}

export interface SkillGetParams {
  name?: string;
  id?: string;
  skillVersion?: string;
  /** @deprecated Use skillVersion instead */
  version?: string;
}

export interface SkillCreateParams {
  prompt?: string;
  jsonSchema?: Record<string, any>;
  sessionId?: string;
  fileId?: string;
  name?: string;
  description?: string;
}

export interface SkillUpdateParams {
  skillId: string;
  fileId?: string;
  description?: string;
}


