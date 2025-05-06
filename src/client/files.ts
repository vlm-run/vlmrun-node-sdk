import { createHash } from "crypto";
import { Client, APIRequestor } from "./base_requestor";
import { FileResponse, ListParams, FileUploadParams } from "./types";
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
      throw new DependencyError("File hashing is not supported in the browser", "browser_limitation", "Use server-side file hashing instead");
    }

    const fs = require("fs");
    const hash = createHash("md5");
    const chunkSize = 4 * 1024 * 1024; // 4MB chunks, same as Python implementation
    
    return new Promise<string>((resolve, reject) => {
      const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
      
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

    if (params.file) {
      fileToUpload = params.file;
    } else if (params.filePath) {
      if (params.checkDuplicate !== false) {
        const existingFile = await this.getCachedFile(params.filePath);

        if (existingFile) {
          return existingFile;
        }
      }

      fileToUpload = await readFileFromPathAsFile(params.filePath);
    } else {
      throw new InputError("Either file or filePath must be provided.", "missing_parameter", "Provide either a file object or a filePath string");
    }

    const [response] = await this.requestor.request<FileResponse>(
      "POST",
      "files",
      { purpose: params.purpose ?? "assistants" },
      undefined,
      { file: fileToUpload }
    );
    return response;
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
}
