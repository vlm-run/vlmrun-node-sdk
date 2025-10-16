import { createHash } from "crypto";
import axios from "axios";
import { Client, APIRequestor } from "./base_requestor";
import {
  FileResponse,
  ListParams,
  FileUploadParams,
  PresignedUrlResponse,
  PresignedUrlRequest,
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
   * @param fileInput Either a file path string or a File object
   * @returns MD5 hash of the file as a hex string
   * @private
   */
  private async calculateMD5(fileInput: string | File): Promise<string> {
    if (typeof window !== "undefined") {
      throw new DependencyError(
        "File hashing is not supported in the browser",
        "browser_limitation",
        "Use server-side file hashing instead"
      );
    }

    const hash = createHash("md5");
    const chunkSize = 4 * 1024 * 1024; // 4MB chunks, same as Python implementation

    if (typeof fileInput !== "string") {
      const arrayBuffer = await fileInput.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.subarray(i, Math.min(i + chunkSize, buffer.length));
        hash.update(chunk);
      }
      
      return hash.digest("hex");
    }

    const fs = require("fs");

    return new Promise<string>((resolve, reject) => {
      const stream = fs.createReadStream(fileInput, {
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
   * @param fileInput Either a file path string or a File object
   * @returns FileResponse if the file exists, null otherwise
   */
  async getCachedFile(fileInput: string | File): Promise<FileResponse | null> {
    const fileHash = await this.calculateMD5(fileInput);

    try {
      const [response] = await this.requestor.request<FileResponse>(
        "GET",
        `files/hash/${fileHash}`
      );
      return response;
    } catch (error) {
      return null;
    }
  }

  async checkFileExists(fileInput: string | File): Promise<FileResponse | null> {
    return this.getCachedFile(fileInput);
  }

  async upload(params: FileUploadParams): Promise<FileResponse> {
    let fileToUpload: File;
    let filePath: string | undefined;

    if (params.file) {
      fileToUpload = params.file;
      
      if (params.checkDuplicate !== false && !params.force) {
        const existingFile = await this.getCachedFile(params.file);
        if (existingFile) {
          return existingFile;
        }
      }
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
        {
          purpose: params.purpose ?? "assistants",
          generate_public_url: params.generatePublicUrl ?? true,
        },
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

  async get(
    fileId: string,
    generatePublicUrl?: boolean
  ): Promise<FileResponse> {
    const [response] = await this.requestor.request<FileResponse>(
      "GET",
      `files/${fileId}`,
      generatePublicUrl !== undefined
        ? { generate_public_url: generatePublicUrl }
        : undefined
    );
    return response;
  }

  async delete(fileId: string): Promise<void> {
    await this.requestor.request<void>("DELETE", `files/${fileId}`);
  }

  async generatePresignedUrl(
    params: PresignedUrlRequest
  ): Promise<PresignedUrlResponse> {
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
}
