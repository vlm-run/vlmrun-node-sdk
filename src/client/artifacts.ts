import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import axios from "axios";
import { Client } from "./base_requestor";

const VLMRUN_ARTIFACTS_DIR = path.join(os.homedir(), ".vlmrun", "artifacts");

function ensureArtifactsDir(sessionId: string): string {
  const artifactsDir = path.join(VLMRUN_ARTIFACTS_DIR, sessionId);
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  return artifactsDir;
}

// Extension and content-type mappings for file-based artifacts
const EXT_MAPPING: Record<string, string> = {
  vid: "mp4",
  aud: "mp3",
  doc: "pdf",
  recon: "spz",
};

const CONTENT_TYPE_MAPPING: Record<string, string> = {
  vid: "video/mp4",
  aud: "audio/mpeg",
  doc: "application/pdf",
  recon: "application/octet-stream",
};

export type ArtifactResponse = Buffer | string;

export interface ArtifactGetParams {
  objectId: string;
  sessionId?: string;
  executionId?: string;
  rawResponse?: boolean;
}

export class Artifacts {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Get an artifact by session ID or execution ID and object ID.
   *
   * Supported artifact types:
   *   - img: Returns Buffer (JPEG image data)
   *   - url: Returns string (URL), downloads file if URL points to a file
   *   - vid: Returns string path to MP4 file
   *   - aud: Returns string path to MP3 file
   *   - doc: Returns string path to PDF file
   *   - recon: Returns string path to SPZ file
   *
   * @param params - Parameters for getting the artifact
   * @param params.objectId - Object ID for the artifact (format: <type>_<6-hex-chars>)
   * @param params.sessionId - Session ID for the artifact (mutually exclusive with executionId)
   * @param params.executionId - Execution ID for the artifact (mutually exclusive with sessionId)
   * @param params.rawResponse - Whether to return the raw response as Buffer (default: false)
   * @returns The artifact content - type depends on objectId prefix and rawResponse flag
   * @throws Error if neither sessionId nor executionId is provided, or if both are provided
   */
  async get(params: ArtifactGetParams): Promise<ArtifactResponse> {
    const { objectId, sessionId, executionId, rawResponse = false } = params;

    // Validate that exactly one of sessionId or executionId is provided
    if (!sessionId && !executionId) {
      throw new Error("Either `sessionId` or `executionId` is required");
    }
    if (sessionId && executionId) {
      throw new Error(
        "Only one of `sessionId` or `executionId` is allowed, not both"
      );
    }

    // Use the new API endpoint format with data payload
    const response = await axios.get(`${this.client.baseURL}/artifacts`, {
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
      },
      params: {
        session_id: sessionId,
        execution_id: executionId,
        object_id: objectId,
      },
      responseType: "arraybuffer",
      timeout: this.client.timeout ?? 120000,
    });

    const data = Buffer.from(response.data);
    const headers = response.headers as Record<string, string>;

    if (rawResponse) {
      return data;
    }

    // Validate object ID format
    const parts = objectId.split("_");
    if (parts.length < 2) {
      throw new Error(
        `Invalid object ID: ${objectId}, expected format: <obj_type>_<6-digit-hex-string>`
      );
    }

    // Handle special case for 'recon' which has format 'recon_XXXXXX'
    const objType = parts[0] === "recon" ? "recon" : parts[0];
    const objIdSuffix = parts[parts.length - 1];

    if (objIdSuffix.length !== 6) {
      throw new Error(
        `Invalid object ID: ${objectId}, expected format: <obj_type>_<6-digit-hex-string>`
      );
    }

    // Get session/execution ID for artifacts directory
    const sessId = sessionId || executionId;
    const artifactsDir = ensureArtifactsDir(sessId!);

    if (objType === "img") {
      const contentType = headers["content-type"];
      if (contentType && contentType !== "image/jpeg") {
        throw new Error(`Expected image/jpeg, got ${contentType}`);
      }
      return data;
    } else if (objType === "url") {
      // URL artifact - decode the URL and optionally download the file
      const url = data.toString("utf-8");

      // Extract filename from URL, stripping query parameters
      const urlPath = new URL(url).pathname;
      const filename = path.basename(urlPath).split("?")[0];
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      const tmpPath = path.join(artifactsDir, `${filename}.${ext}`);

      // Return cached version if it exists
      if (fs.existsSync(tmpPath)) {
        return tmpPath;
      }

      // Download the file
      const fileResponse = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: this.client.timeout ?? 120000,
      });
      fs.writeFileSync(tmpPath, Buffer.from(fileResponse.data));
      return tmpPath;
    } else if (["vid", "aud", "doc", "recon"].includes(objType)) {
      // Validate content type
      const expectedContentType = CONTENT_TYPE_MAPPING[objType];
      const actualContentType = headers["content-type"];
      if (actualContentType && actualContentType !== expectedContentType) {
        throw new Error(
          `Expected ${expectedContentType}, got ${actualContentType}`
        );
      }

      // Build file path with appropriate extension
      const ext = EXT_MAPPING[objType];
      if (!ext) {
        throw new Error(
          `Unsupported file type [file_type=${objType}, object_id=${objectId}]`
        );
      }
      const tmpPath = path.join(artifactsDir, `${objectId}.${ext}`);

      // Return cached version if it exists
      if (fs.existsSync(tmpPath)) {
        return tmpPath;
      }

      // Write the binary response to file
      fs.writeFileSync(tmpPath, data);
      return tmpPath;
    } else {
      // Unknown type - return raw buffer
      return data;
    }
  }

  /**
   * List artifacts for a session.
   *
   * @param sessionId - Session ID to list artifacts for
   * @throws NotImplementedError - This method is not yet implemented
   */
  async list(sessionId: string): Promise<never> {
    throw new Error("Artifacts.list() is not yet implemented");
  }
}
