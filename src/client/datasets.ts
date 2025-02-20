import { Client, APIRequestor } from "./base_requestor";
import { DatasetResponse, DatasetCreateParams, DatasetListParams } from "./types";
import { createArchive } from "../utils";
import { Files } from "../index";

export class Datasets {
  private requestor: APIRequestor;
  private files: Files;

  constructor(client: Client) {
    this.requestor = new APIRequestor({
      ...client,
      baseURL: `${client.baseURL}/datasets`,
    });

    this.files = new Files(client);
  }

  /**
   * Create a dataset from a directory of files.
   *
   * @param params Dataset creation parameters.
   * @returns The dataset creation response.
   */
  async create(params: DatasetCreateParams): Promise<DatasetResponse> {
    const validTypes = ["images", "videos", "documents"];

    if (typeof window !== "undefined") {
      throw new Error("createArchive is not supported in a browser environment.");
    }

    if (!validTypes.includes(params.datasetType)) {
      throw new Error("dataset_type must be one of: images, videos, documents");
    }

    // Create tar.gz archive of the dataset directory.
    const tarPath = await createArchive(params.datasetDirectory, params.datasetName);
    const fs = require('fs');
    const tarSizeMB = (fs.statSync(tarPath).size / 1024 / 1024).toFixed(2);
    console.debug(`Created tar.gz file [path=${tarPath}, size=${tarSizeMB} MB]`);

    // Upload the tar.gz file using the client's file upload method.
    const fileResponse = await this.files.upload({
      filePath: tarPath,
      purpose: "datasets",
    });
    const fileSizeMB = (fileResponse.bytes / 1024 / 1024).toFixed(2);
    console.debug(
      `Uploaded tar.gz file [path=${tarPath}, file_id=${fileResponse.id}, size=${fileSizeMB} MB]`
    );

    // Create the dataset by sending a POST request.
    const [response] = await this.requestor.request<DatasetResponse>(
      "POST",
      "create",
      undefined, // No query parameters
      {
        file_id: fileResponse.id,
        domain: params.domain,
        dataset_name: params.datasetName,
        dataset_type: params.datasetType,
        wandb_base_url: params.wandbBaseUrl,
        wandb_project_name: params.wandbProjectName,
        wandb_api_key: params.wandbApiKey,
      }
    );

    return response;
  }

  /**
   * Get dataset information by its ID.
   *
   * @param datasetId The ID of the dataset to retrieve.
   * @returns The dataset information.
   */
  async get(datasetId: string): Promise<DatasetResponse> {
    const [response] = await this.requestor.request<DatasetResponse>(
      "GET",
      datasetId
    );
    return response;
  }

  /**
   * List all datasets with pagination support.
   *
   * @param skip Number of datasets to skip.
   * @param limit Maximum number of datasets to return.
   * @returns A list of dataset responses.
   */
  async list(params?: DatasetListParams): Promise<DatasetResponse[]> {
    const [items] = await this.requestor.request<DatasetResponse[]>(
      "GET",
      "",
      {
        skip: params?.skip ?? 0,
        limit: params?.limit ?? 10,
      }
    );
    if (!Array.isArray(items)) {
      throw new Error("Expected array response");
    }
    return items;
  }
}
