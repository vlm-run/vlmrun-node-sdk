import { type Agent } from './_shims/index';
import * as Core from './core';
import * as Errors from './error';
import * as Uploads from './uploads';
import * as API from './resources/index';
import { Audio, AudioGenerateParams } from './resources/audio';
import { Document, DocumentGenerateParams } from './resources/document';
import {
  FileCreateParams,
  FileListParams,
  FileListResponse,
  Files,
  StoreFileResponse,
} from './resources/files';
import { Image, ImageGenerateParams } from './resources/image';
import { ModelInfoResponse, ModelListResponse, Models } from './resources/models';
import { Response } from './resources/response';
import { Schema, SchemaGenerateParams } from './resources/schema';
import { HealthResponse } from './resources/top-level';
import { Web, WebGenerateParams } from './resources/web';
import { Experimental, ExperimentalHealthResponse } from './resources/experimental/experimental';
import { OpenAI, OpenAIHealthResponse } from './resources/openai/openai';

export interface ClientOptions {
  /**
   * The API Key used for authenticating API requests
   */
  apiKey?: string | undefined;

  /**
   * Override the default base URL for the API, e.g., "https://api.example.com/v2/"
   *
   * Defaults to process.env['VLMRUN_BASE_URL'].
   */
  baseURL?: string | null | undefined;

  /**
   * The maximum amount of time (in milliseconds) that the client should wait for a response
   * from the server before timing out a single request.
   *
   * Note that request timeouts are retried by default, so in a worst-case scenario you may wait
   * much longer than this timeout before the promise succeeds or fails.
   */
  timeout?: number;

  /**
   * An HTTP agent used to manage HTTP(S) connections.
   *
   * If not provided, an agent will be constructed by default in the Node.js environment,
   * otherwise no agent is used.
   */
  httpAgent?: Agent;

  /**
   * Specify a custom `fetch` function implementation.
   *
   * If not provided, we use `node-fetch` on Node.js and otherwise expect that `fetch` is
   * defined globally.
   */
  fetch?: Core.Fetch | undefined;

  /**
   * The maximum number of times that the client will retry a request in case of a
   * temporary failure, like a network error or a 5XX error from the server.
   *
   * @default 2
   */
  maxRetries?: number;

  /**
   * Default headers to include with every request to the API.
   *
   * These can be removed in individual requests by explicitly setting the
   * header to `undefined` or `null` in request options.
   */
  defaultHeaders?: Core.Headers;

  /**
   * Default query parameters to include with every request to the API.
   *
   * These can be removed in individual requests by explicitly setting the
   * param to `undefined` in request options.
   */
  defaultQuery?: Core.DefaultQuery;
}

/**
 * API Client for interfacing with the Vlm API.
 */
export class VlmRun extends Core.APIClient {
  apiKey: string;

  private _options: ClientOptions;

  /**
   * API Client for interfacing with the Vlm API.
   *
   * @param {string | undefined} [opts.apiKey=process.env['VLMRUN_API_KEY'] ?? undefined]
   * @param {string} [opts.baseURL=process.env['VLMRUN_BASE_URL'] ?? https://api.vlm.run] - Override the default base URL for the API.
   * @param {number} [opts.timeout=1 minute] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
   * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
   */
  constructor({
    baseURL = Core.readEnv('VLMRUN_BASE_URL'),
    apiKey = Core.readEnv('VLMRUN_API_KEY'),
    ...opts
  }: ClientOptions = {}) {
    if (apiKey === undefined) {
      throw new Errors.VlmError(
        "The VLMRUN_API_KEY environment variable is missing or empty; either provide it, or instantiate the Vlm client with an apiKey option, like new Vlm({ apiKey: 'My API Key' }).",
      );
    }

    const options: ClientOptions = {
      apiKey,
      ...opts,
      baseURL: baseURL || `https://api.vlm.run`,
    };

    super({
      baseURL: options.baseURL!,
      timeout: options.timeout ?? 60000 /* 1 minute */,
      httpAgent: options.httpAgent,
      maxRetries: options.maxRetries,
      fetch: options.fetch,
    });

    this._options = options;

    this.apiKey = apiKey;
  }

  openai: API.OpenAI = new API.OpenAI(this);
  experimental: API.Experimental = new API.Experimental(this);
  models: API.Models = new API.Models(this);
  files: API.Files = new API.Files(this);
  response: API.Response = new API.Response(this);
  document: API.Document = new API.Document(this);
  audio: API.Audio = new API.Audio(this);
  image: API.Image = new API.Image(this);
  web: API.Web = new API.Web(this);
  schema: API.Schema = new API.Schema(this);

  /**
   * Health check endpoint.
   */
  health(options?: Core.RequestOptions): Core.APIPromise<unknown> {
    return this.get('/v1/health', options);
  }

  protected override defaultQuery(): Core.DefaultQuery | undefined {
    return this._options.defaultQuery;
  }

  protected override defaultHeaders(opts: Core.FinalRequestOptions): Core.Headers {
    return {
      ...super.defaultHeaders(opts),
      ...this._options.defaultHeaders,
    };
  }

  protected override authHeaders(opts: Core.FinalRequestOptions): Core.Headers {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  static Vlm = this;
  static DEFAULT_TIMEOUT = 60000; // 1 minute

  static VlmError = Errors.VlmError;
  static APIError = Errors.APIError;
  static APIConnectionError = Errors.APIConnectionError;
  static APIConnectionTimeoutError = Errors.APIConnectionTimeoutError;
  static APIUserAbortError = Errors.APIUserAbortError;
  static NotFoundError = Errors.NotFoundError;
  static ConflictError = Errors.ConflictError;
  static RateLimitError = Errors.RateLimitError;
  static BadRequestError = Errors.BadRequestError;
  static AuthenticationError = Errors.AuthenticationError;
  static InternalServerError = Errors.InternalServerError;
  static PermissionDeniedError = Errors.PermissionDeniedError;
  static UnprocessableEntityError = Errors.UnprocessableEntityError;

  static toFile = Uploads.toFile;
  static fileFromPath = Uploads.fileFromPath;
}

VlmRun.OpenAI = OpenAI;
VlmRun.Experimental = Experimental;
VlmRun.Models = Models;
VlmRun.Files = Files;
VlmRun.Response = Response;
VlmRun.Document = Document;
VlmRun.Audio = Audio;
VlmRun.Image = Image;
VlmRun.Web = Web;
VlmRun.Schema = Schema;
export declare namespace VlmRun {
  export type RequestOptions = Core.RequestOptions;

  export { type HealthResponse as HealthResponse };

  export { OpenAI as OpenAI, type OpenAIHealthResponse as OpenAIHealthResponse };

  export { Experimental as Experimental, type ExperimentalHealthResponse as ExperimentalHealthResponse };

  export {
    Models as Models,
    type ModelInfoResponse as ModelInfoResponse,
    type ModelListResponse as ModelListResponse,
  };

  export {
    Files as Files,
    type StoreFileResponse as StoreFileResponse,
    type FileListResponse as FileListResponse,
    type FileCreateParams as FileCreateParams,
    type FileListParams as FileListParams,
  };

  export { Response as Response };

  export { Document as Document, type DocumentGenerateParams as DocumentGenerateParams };

  export { Audio as Audio, type AudioGenerateParams as AudioGenerateParams };

  export { Image as Image, type ImageGenerateParams as ImageGenerateParams };

  export { Web as Web, type WebGenerateParams as WebGenerateParams };

  export { Schema as Schema, type SchemaGenerateParams as SchemaGenerateParams };

  export type PredictionResponse = API.PredictionResponse;
}

export { toFile, fileFromPath } from './uploads';
export {
  VlmError,
  APIError,
  APIConnectionError,
  APIConnectionTimeoutError,
  APIUserAbortError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BadRequestError,
  AuthenticationError,
  InternalServerError,
  PermissionDeniedError,
  UnprocessableEntityError,
} from './error';

export default VlmRun;
