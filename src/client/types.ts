export type JobStatus = string;

export type FilePurpose = string;

export type DetailLevel = string;

export interface FileResponse {
  id: string;
  filename: string;
  bytes: number;
  purpose: FilePurpose;
  created_at: string;
  object: 'file';
}

export interface CreditUsage {
  elements_processed?: number;
  element_type?: 'image' | 'page' | 'video' | 'audio';
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
  filePath: string;
  purpose: string;
  checkDuplicate?: boolean;
}

export interface FeedbackSubmitParams {
  id: string;
  label?: Record<string, any>;
  notes?: string;
  flag?: boolean;
}

export interface PredictionGenerateParams {
  model: string;
  domain: string;
  jsonSchema?: Record<string, any>;
  detail?: DetailLevel;
  batch?: boolean;
  metadata?: Record<string, any>;
  callbackUrl?: string;
}

export interface ImagePredictionParams extends PredictionGenerateParams {
  images: string[];
}

export interface FilePredictionParams extends PredictionGenerateParams {
  fileIds: string[];
}

export class APIError extends Error {
  constructor(
    message: string,
    public http_status?: number,
    public headers?: Record<string, string>
  ) {
    super(message);
    this.name = 'APIError';
  }
}
