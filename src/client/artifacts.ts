import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import axios from "axios";
import { Client } from "./base_requestor";

const VLMRUN_ARTIFACTS_DIR = path.join(os.homedir(), ".vlmrun", "artifacts");

/**
 * Extension mappings for file-based artifacts.
 */
const EXT_MAPPING: Record<string, string> = {
  vid: "mp4",
  aud: "mp3",
  doc: "pdf",
  recon: "spz",
};

/**
 * Content-type mappings for file-based artifacts.
 */
const CONTENT_TYPE_MAPPING: Record<string, string> = {
  vid: "video/mp4",
  aud: "audio/mpeg",
  doc: "application/pdf",
  recon: "application/octet-stream",
};

function ensureArtifactsDir(sessionId: string): string {
  const artifactsDir = path.join(VLMRUN_ARTIFACTS_DIR, sessionId);
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  return artifactsDir;
}

export type ArtifactResponse = Buffer | string;

export interface ArtifactGetParams {
  sessionId: string;
  objectId: string;
  rawResponse?: boolean;
}

export class Artifacts {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Get an artifact by session ID and object ID.
   *
   * @param params - Parameters for getting the artifact
   * @param params.sessionId - Session ID for the artifact
   * @param params.objectId - Object ID for the artifact
   * @param params.rawResponse - Whether to return the raw response as Buffer (default: false)
   * @returns The artifact content - Buffer for raw/image/unknown types, string URL for url_ types,
   *          string path for vid_, aud_, doc_, recon_ types (stored in ~/.vlmrun/artifacts/{sessionId}/)
   */
  async get(params: ArtifactGetParams): Promise<ArtifactResponse> {
    const { sessionId, objectId, rawResponse = false } = params;

    const response = await axios.get(
      `${this.client.baseURL}/artifacts/${sessionId}/${objectId}`,
      {
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
        },
        responseType: "arraybuffer",
        timeout: this.client.timeout ?? 120000,
      }
    );

    const data = Buffer.from(response.data);
    const headers = response.headers as Record<string, string>;

    if (rawResponse) {
      return data;
    }

    const parts = objectId.split("_");
    if (parts.length !== 2) {
      throw new Error(
        `Invalid object ID: ${objectId}, expected format: <obj_type>_<6-digit-hex-string>`
      );
    }

    const [objType, objIdSuffix] = parts;
    if (objIdSuffix.length !== 6) {
      throw new Error(
        `Invalid object ID: ${objectId}, expected format: <obj_type>_<6-digit-hex-string>`
      );
    }

    if (objType === "img") {
      const contentType = headers["content-type"];
      if (contentType && !contentType.startsWith("image/")) {
        throw new Error(`Expected image content type, got ${contentType}`);
      }
      return data;
    } else if (objType === "url") {
      return data.toString("utf-8");
    } else if (objType in EXT_MAPPING) {
      // Handle vid, aud, doc, recon artifact types
      const expectedContentType = CONTENT_TYPE_MAPPING[objType];
      const actualContentType = headers["content-type"];
      if (actualContentType && actualContentType !== expectedContentType) {
        throw new Error(
          `Expected ${expectedContentType}, got ${actualContentType}`
        );
      }

      const ext = EXT_MAPPING[objType];
      const artifactsDir = ensureArtifactsDir(sessionId);
      const artifactPath = path.join(artifactsDir, `${objectId}.${ext}`);

      // Return cached version if it exists
      if (fs.existsSync(artifactPath)) {
        return artifactPath;
      }

      // Write the binary response to file
      fs.writeFileSync(artifactPath, data);
      return artifactPath;
    } else {
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
