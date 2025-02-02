export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type FilePurpose = 
  | 'fine-tune'
  | 'assistants'
  | 'assistants_output'
  | 'batch'
  | 'batch_output'
  | 'vision'
  | 'datasets';

export type DetailLevel = 'auto' | 'lo' | 'hi';

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
