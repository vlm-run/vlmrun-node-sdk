import { createHash } from "crypto";
import axios from "axios";
import { Client, APIRequestor } from "./base_requestor";
import {
  FileResponse,
  ListParams,
  FileUploadParams,
  PresignedUrlResponse,
  PresignedUrlRequest,
  PreviewUrlResponse,
} from "./types";
import { readFileFromPathAsFile } from "../utils/file";
import { DependencyError, InputError } from "./exceptions";

export class Files {
  private client: Client;
  private requestor: APIRequestor;

  constructor(client: Client) {
    this.client = client;
    this.requestor = new APIRequestor(client);
  }

  async list(params: ListParams = {}): Promise<FileResponse[]> {
    const [response] = await this.requestor.request<FileResponse[]>(
      "GET",
      "files",
      { skip: params.skip, limit: params.limit }
    );
    return response;
  }

  /**
   * Calculate the MD5 hash of a file by reading it in chunks
   * @param filePath Path to the file to hash
   * @returns MD5 hash of the file as a hex string
   * @private
   */
  private async calculateMD5(filePath: string): Promise<string> {
    if (typeof window !== "undefined") {
      throw new DependencyError(
        "File hashing is not supported in the browser",
        "browser_limitation",
        "Use server-side file hashing instead"
      );
    }

    const fs = require("fs");
    const hash = createHash("md5");
    const chunkSize = 4 * 1024 * 1024; // 4MB chunks, same as Python implementation

    return new Promise<string>((resolve, reject) => {
      const stream = fs.createReadStream(filePath, {
        highWaterMark: chunkSize,
      });

      stream.on("data", (chunk: Buffer) => {
        hash.update(chunk);
      });

      stream.on("end", () => {
        const fileHash = hash.digest("hex");
        resolve(fileHash);
      });

      stream.on("error", (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Get a cached file from the API by calculating its MD5 hash
   * @param filePath Path to the file to check
   * @returns FileResponse if the file exists, null otherwise
   */
  async getCachedFile(filePath: string): Promise<FileResponse | null> {
    const fileHash = await this.calculateMD5(filePath);

    try {
      const [response] = await this.requestor.request<FileResponse>(
        "GET",
        `files/hash/${fileHash}`
      );
      return response;
    } catch (error) {
      // If the file doesn't exist or there's an error, return null
      return null;
    }
  }

  // Keep the old method for backward compatibility
  async checkFileExists(filePath: string): Promise<FileResponse | null> {
    return this.getCachedFile(filePath);
  }

  async upload(params: FileUploadParams): Promise<FileResponse> {
    let fileToUpload: File;
    let filePath: string | undefined;

    if (params.file) {
      fileToUpload = params.file;
    } else if (params.filePath) {
      filePath = params.filePath;

      if (typeof window === "undefined") {
        const fs = require("fs");
        if (!fs.existsSync(filePath)) {
          throw new InputError(
            `File does not exist: ${filePath}`,
            "file_not_found",
            "Provide a valid file path"
          );
        }
      }

      if (params.checkDuplicate !== false && !params.force) {
        const existingFile = await this.getCachedFile(params.filePath);
        if (existingFile) {
          return existingFile;
        }
      }

      fileToUpload = await readFileFromPathAsFile(params.filePath);
    } else {
      throw new InputError(
        "Either file or filePath must be provided.",
        "missing_parameter",
        "Provide either a file object or a filePath string"
      );
    }

    let method = params.method || "auto";
    if (method === "auto") {
      if (fileToUpload.size > 32 * 1024 * 1024) {
        method = "presigned-url";
      } else {
        method = "direct";
      }
    }

    if (method === "presigned-url") {
      const [presignedResponse] =
        await this.requestor.request<PresignedUrlResponse>(
          "POST",
          "files/presigned-url",
          undefined,
          {
            filename: fileToUpload.name,
            purpose: params.purpose ?? "assistants",
            expiration: params.expiration ?? 24 * 60 * 60, // 24 hours default
          }
        );

      if (!presignedResponse.url || !presignedResponse.id) {
        throw new Error("Invalid presigned URL response");
      }

      const startTime = Date.now();
      try {
        const putResponse = await axios.put(
          presignedResponse.url,
          fileToUpload,
          {
            headers: {
              "Content-Type":
                presignedResponse.content_type || "application/octet-stream",
            },
          }
        );

        const endTime = Date.now();

        if (putResponse.status === 200) {
          const [verifyResponse] = await this.requestor.request<FileResponse>(
            "GET",
            `files/verify-upload/${presignedResponse.id}`
          );
          return verifyResponse;
        } else {
          throw new Error(
            `Failed to upload file to presigned URL: ${putResponse.statusText}`
          );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(
            `Failed to upload file to presigned URL: ${error.message}`
          );
        }
        throw error;
      }
    } else if (method === "direct") {
      const [response] = await this.requestor.request<FileResponse>(
        "POST",
        "files",
        { purpose: params.purpose ?? "assistants" },
        undefined,
        { file: fileToUpload }
      );
      return response;
    } else {
      throw new InputError(
        `Invalid upload method: ${method}`,
        "invalid_parameter",
        "Use 'auto', 'direct', or 'presigned-url'"
      );
    }
  }

  async get(fileId: string): Promise<FileResponse> {
    const [response] = await this.requestor.request<FileResponse>(
      "GET",
      `files/${fileId}`
    );
    return response;
  }

  async delete(fileId: string): Promise<void> {
    await this.requestor.request<void>("DELETE", `files/${fileId}`);
  }

  /**
   * Generate a presigned URL for file upload
   * @param params Request parameters containing filename and purpose
   * @returns Presigned URL response with upload details
   */
  async generatePresignedUrl(params: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    const [response] = await this.requestor.request<PresignedUrlResponse>(
      "POST",
      "files/presigned-url",
      undefined,
      {
        filename: params.filename,
        purpose: params.purpose,
      }
    );
    return response;
  }

  /**
   * Generate a preview URL for an existing file
   * @param fileId The ID of the file to generate preview URL for
   * @returns Preview URL response
   */
  async generateFilePreviewUrl(fileId: string): Promise<PreviewUrlResponse> {
    const [response] = await this.requestor.request<PreviewUrlResponse>(
      "GET",
      `files/preview-url/${fileId}`
    );
    return response;
  }
}
