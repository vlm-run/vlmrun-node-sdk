import { Client, APIRequestor } from "./base_requestor";
import {
  PredictionResponse,
  DetailLevel,
  ListParams,
  ImagePredictionParams,
  FilePredictionParams,
} from "./types";
import { processImage } from "../utils/image";

export class Predictions {
  protected client: Client;
  protected requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  async list(params: ListParams = {}): Promise<PredictionResponse[]> {
    const [response] = await this.requestor.request<PredictionResponse[]>(
      "GET",
      "predictions",
      { skip: params.skip, limit: params.limit }
    );
    return response;
  }

  async get(params: { id: string }): Promise<PredictionResponse> {
    const [response] = await this.requestor.request<PredictionResponse>(
      "GET",
      `predictions/${params.id}`
    );
    return response;
  }
}

export class ImagePredictions extends Predictions {
  /**
   * Generate predictions from images
   * @param params.images - Array of image inputs. Each image can be:
   *   - A URL string pointing to an image
   *   - A local file path string
   *   - A base64 encoded image string
   * @param params.model - Model ID to use for prediction eg. 'vlm-1'
   * @param params.domain - Domain for the prediction eg. 'document.invoice'
   * @param params.jsonSchema - JSON schema for selected fields of structured output
   * @param params.detail - Detail level for the prediction (default: 'auto')
   * @param params.batch - Whether to process as batch (default: false)
   * @param params.metadata - Additional metadata to include
   * @param params.callbackUrl - URL to receive prediction completion webhook
   * @returns Promise containing the prediction response
   */
  async generate(params: ImagePredictionParams): Promise<PredictionResponse> {
    const {
      images,
      model,
      domain,
      jsonSchema,
      detail = "auto",
      batch = false,
      metadata = {},
      callbackUrl,
    } = params;

    const encodedImages = images.map((image) => processImage(image));

    const [response] = await this.requestor.request<PredictionResponse>(
      "POST",
      "image/generate",
      undefined,
      {
        image: encodedImages[0],
        model,
        domain,
        json_schema: jsonSchema,
        detail,
        batch,
        metadata,
        callback_url: callbackUrl,
      }
    );
    return response;
  }
}

export class FilePredictions extends Predictions {
  private route: "document" | "audio" | "video";

  constructor(client: Client, route: "document" | "audio" | "video") {
    super(client);
    this.route = route;
  }

  async generate(params: FilePredictionParams): Promise<PredictionResponse> {
    const {
      fileId,
      url,
      model,
      domain,
      jsonSchema,
      detail = "auto",
      batch = false,
      metadata = {},
      callbackUrl,
    } = params;

    const [response] = await this.requestor.request<PredictionResponse>(
      "POST",
      `/${this.route}/generate`,
      undefined,
      {
        ...(fileId ? { file_id: fileId } : { url }),
        model,
        domain,
        json_schema: jsonSchema,
        detail,
        batch,
        metadata,
        callback_url: callbackUrl,
      }
    );
    return response;
  }
}

// Create specialized instances for different file types
export const DocumentPredictions = (client: Client) =>
  new FilePredictions(client, "document");
export const AudioPredictions = (client: Client) =>
  new FilePredictions(client, "audio");
export const VideoPredictions = (client: Client) =>
  new FilePredictions(client, "video");
