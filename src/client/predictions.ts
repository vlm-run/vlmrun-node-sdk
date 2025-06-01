import { Client, APIRequestor } from "./base_requestor";
import {
  PredictionResponse,
  DetailLevel,
  ListParams,
  ImagePredictionParams,
  FilePredictionParams,
  WebPredictionParams,
  SchemaResponse,
  GenerationConfigParams,
  FeedbackResponse,
  FeedbackParams,
} from "./types";
import { processImage } from "../utils/image";
import { convertToJsonSchema } from "../utils/utils";
import { InputError, RequestTimeoutError } from "./exceptions";

export class Predictions {
  protected client: Client;
  protected requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  /**
   * Cast response to schema if a schema is provided
   * @param prediction - The prediction response
   * @param domain - The domain used for the prediction
   * @param config - The generation config used for the prediction
   * @protected
   */
  protected _castResponseToSchema(
    prediction: PredictionResponse,
    domain: string,
    config?: GenerationConfigParams
  ): void {
    // This is a placeholder for schema casting logic
    // In the Python SDK, this method is used to cast the response to a schema
    // based on the domain and config
    // For now, we'll just return the prediction as is
  }

  async list(params: ListParams = {}): Promise<PredictionResponse[]> {
    const [response] = await this.requestor.request<PredictionResponse[]>(
      "GET",
      "predictions",
      { skip: params.skip, limit: params.limit }
    );
    return response;
  }

  async get(id: string): Promise<PredictionResponse> {
    const [response] = await this.requestor.request<PredictionResponse>(
      "GET",
      `predictions/${id}`
    );
    return response;
  }

  async getFeedbacks(requestId: string): Promise<FeedbackResponse[]> {
    const [response] = await this.requestor.request<FeedbackResponse[]>(
      "GET",
      `predictions/${requestId}/feedback`
    );
    return response;
  }

  async createFeedback(feedback: FeedbackParams): Promise<FeedbackResponse> {
    const [response] = await this.requestor.request<FeedbackResponse>(
      "POST",
      `predictions/${feedback.request_id}/feedback`,
      undefined,
      feedback
    );
    return response;
  }

  /**
   * Wait for prediction to complete
   * @param params.id - ID of prediction to wait for
   * @param params.timeout - Timeout in seconds (default: 60)
   * @param params.sleep - Sleep time in seconds (default: 1)
   * @returns Promise containing the prediction response
   * @throws TimeoutError if prediction doesn't complete within timeout
   */
  async wait(
    id: string,
    timeout: number = 60,
    sleep: number = 1
  ): Promise<PredictionResponse> {
    const startTime = Date.now();
    const timeoutMs = timeout * 1000;

    while (Date.now() - startTime < timeoutMs) {
      const response = await this.get(id);
      if (response.status === "completed") {
        return response;
      }
      await new Promise((resolve) => setTimeout(resolve, sleep * 1000));
    }

    throw new RequestTimeoutError(
      `Prediction ${id} did not complete within ${timeout} seconds`,
      undefined,
      undefined,
      undefined,
      "prediction_timeout",
      "Try increasing the timeout or check if the prediction is taking longer than expected"
    );
  }
}

export class ImagePredictions extends Predictions {
  /**
   * Handle images and URLs input validation and processing
   * @param images - Array of image inputs (file paths or base64 encoded strings)
   * @param urls - Array of URL strings pointing to images
   * @returns Processed image data array
   * @private
   */
  private _handleImagesOrUrls(
    images?: string[],
    urls?: string[]
  ): string[] {
    // Input validation
    if (!images && !urls) {
      throw new InputError("Either `images` or `urls` must be provided", "missing_parameter", "Provide either images or urls parameter");
    }
    if (images && urls) {
      throw new InputError("Only one of `images` or `urls` can be provided", "invalid_parameters", "Provide either images or urls, not both");
    }

    if (images) {
      if (!images.length) {
        throw new InputError("Images array cannot be empty", "empty_array", "Provide at least one image");
      }
      return images.map((image) => processImage(image));
    } else if (urls) {
      if (!urls.length) {
        throw new InputError("URLs array cannot be empty", "empty_array", "Provide at least one URL");
      }
      if (!urls.every((url) => typeof url === "string")) {
        throw new InputError("All URLs must be strings", "invalid_type", "Ensure all URLs are string values");
      }
      if (!urls.every((url) => url.startsWith("http"))) {
        throw new InputError("URLs must start with 'http'", "invalid_format", "Ensure all URLs start with http or https");
      }
      return urls;
    }

    throw new InputError("Either `images` or `urls` must be provided", "missing_parameter", "Provide either images or urls parameter");
  }

  /**
   * Generate predictions from images
   * @param params.images - Array of image inputs. Each image can be:
   *   - A local file path string
   *   - A base64 encoded image string
   * @param params.urls - Array of URL strings pointing to images
   * @param params.model - Model ID to use for prediction eg. 'vlm-1'
   * @param params.domain - Domain for the prediction eg. 'document.invoice'
   * @param params.batch - Whether to process as batch (default: false)
   * @param params.config - Configuration options for the prediction
   * @param params.metadata - Additional metadata to include
   * @param params.callbackUrl - URL to receive prediction completion webhook
   * @returns Promise containing the prediction response
   */
  async generate(params: ImagePredictionParams): Promise<PredictionResponse> {
    const {
      images,
      urls,
      model = "vlm-1",
      domain,
      batch = false,
      config,
      metadata,
      callbackUrl,
    } = params;

    const imagesData = this._handleImagesOrUrls(images, urls);
    
    let jsonSchema = config?.jsonSchema;
    if (config?.responseModel) {
      jsonSchema = convertToJsonSchema(
        config.responseModel,
        config.zodToJsonParams
      );
    }

    const [response] = await this.requestor.request<PredictionResponse>(
      "POST",
      "image/generate",
      undefined,
      {
        images: imagesData,
        model,
        domain,
        batch,
        config: {
          detail: config?.detail ?? "auto",
          json_schema: jsonSchema,
          confidence: config?.confidence ?? false,
          grounding: config?.grounding ?? false,
          gql_stmt: config?.gqlStmt ?? null,
        },
        metadata: {
          environment: metadata?.environment ?? "dev",
          session_id: metadata?.sessionId,
          allow_training: metadata?.allowTraining ?? true,
        },
        callback_url: callbackUrl,
      }
    );

    this._castResponseToSchema(response, domain, config);
    
    return response;
  }

  /**
   * Auto-generate a schema for a given image or document.
   * @param params - Schema generation parameters
   * @param params.images - Array of image inputs. Each image can be:
   *   - A local file path string
   *   - A base64 encoded image string
   * @param params.urls - Array of URL strings pointing to images
   * @returns Promise containing the prediction response with schema information
   */
  async schema(params: {
    images?: string[];
    urls?: string[];
  }): Promise<PredictionResponse> {
    const { images, urls } = params;
    const imagesData = this._handleImagesOrUrls(images, urls);
    
    const [response] = await this.requestor.request<PredictionResponse>(
      "POST",
      "image/schema",
      undefined,
      {
        images: imagesData,
      }
    );
    
    if (response.response) {
      response.response = response.response as SchemaResponse;
    }
    
    return response;
  }
}

export class FilePredictions extends Predictions {
  private route: "document" | "audio" | "video";

  constructor(client: Client, route: "document" | "audio" | "video") {
    super(client);
    this.route = route;
  }

  /**
   * Handle file or URL input validation
   * @param fileId - File ID to use
   * @param url - URL to use
   * @returns Object with the appropriate parameter name and value
   * @private
   */
  private _handleFileOrUrl(
    fileId?: string,
    url?: string
  ): { [key: string]: string } {
    // Input validation
    if (!fileId && !url) {
      throw new InputError("Either `fileId` or `url` must be provided", "missing_parameter", "Provide either a fileId or url parameter");
    }
    if (fileId && url) {
      throw new InputError("Only one of `fileId` or `url` can be provided", "invalid_parameters", "Provide either fileId or url, not both");
    }

    return fileId ? { file_id: fileId } : { url: url! };
  }

  async generate(params: FilePredictionParams): Promise<PredictionResponse> {
    const {
      fileId,
      url,
      model,
      domain,
      batch = false,
      config,
      metadata,
      callbackUrl,
    } = params;

    const fileOrUrl = this._handleFileOrUrl(fileId, url);

    let jsonSchema = config?.jsonSchema;
    if (config?.responseModel) {
      jsonSchema = convertToJsonSchema(
        config.responseModel,
        config.zodToJsonParams
      );
    }

    const [response] = await this.requestor.request<PredictionResponse>(
      "POST",
      `/${this.route}/generate`,
      undefined,
      {
        ...fileOrUrl,
        model,
        domain,
        batch,
        config: {
          detail: config?.detail ?? "auto",
          json_schema: jsonSchema,
          confidence: config?.confidence ?? false,
          grounding: config?.grounding ?? false,
          gql_stmt: config?.gqlStmt ?? null,
        },
        metadata: {
          environment: metadata?.environment ?? "dev",
          session_id: metadata?.sessionId,
          allow_training: metadata?.allowTraining ?? true,
        },
        callback_url: callbackUrl,
      }
    );
    
    // Cast response to schema if needed
    this._castResponseToSchema(response, domain!, config);
    
    return response;
  }

  /**
   * Auto-generate a schema for a given document, audio, or video file
   * @param params - Schema generation parameters
   * @param params.fileId - File ID to generate schema from
   * @param params.url - URL to generate schema from
   * @returns Promise containing the prediction response with schema information
   */
  async schema(params: {
    fileId?: string;
    url?: string;
  }): Promise<PredictionResponse> {
    const { fileId, url } = params;
    const fileOrUrl = this._handleFileOrUrl(fileId, url);
    
    const [response] = await this.requestor.request<PredictionResponse>(
      "POST",
      `/${this.route}/schema`,
      undefined,
      fileOrUrl
    );
    
    // Cast response to SchemaResponse
    if (response.response) {
      response.response = response.response as SchemaResponse;
    }
    
    return response;
  }
}

export class WebPredictions extends Predictions {
  async generate(params: WebPredictionParams): Promise<PredictionResponse> {
    const { url, model, domain, mode, metadata, callbackUrl, config } = params;
    const [response] = await this.requestor.request<PredictionResponse>(
      "POST",
      `/web/generate`,
      undefined,
      {
        url,
        model,
        domain,
        mode,
        config: {
          detail: config?.detail ?? "auto",
          json_schema: config?.jsonSchema ?? null,
          confidence: config?.confidence ?? false,
          grounding: config?.grounding ?? false,
          gql_stmt: config?.gqlStmt ?? null,
        },
        metadata: {
          environment: metadata?.environment ?? "dev",
          session_id: metadata?.sessionId,
          allow_training: metadata?.allowTraining ?? true,
        },
        callback_url: callbackUrl,
      }
    );
    return response;
  }
}

export const DocumentPredictions = (client: Client) =>
  new FilePredictions(client, "document");
export const AudioPredictions = (client: Client) =>
  new FilePredictions(client, "audio");
export const VideoPredictions = (client: Client) =>
  new FilePredictions(client, "video");
