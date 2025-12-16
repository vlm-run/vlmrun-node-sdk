import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import axios from "axios";
import { Client } from "./base_requestor";

const VLMRUN_CACHE_DIR = path.join(os.homedir(), ".vlmrun", "cache");

function ensureCacheDir(): void {
  if (!fs.existsSync(VLMRUN_CACHE_DIR)) {
    fs.mkdirSync(VLMRUN_CACHE_DIR, { recursive: true });
  }
}

function getDispositionParams(disposition: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parts = disposition.split(";");
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    const eqIndex = part.indexOf("=");
    if (eqIndex !== -1) {
      const key = part.substring(0, eqIndex).trim();
      let value = part.substring(eqIndex + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      params[key] = value;
    }
  }
  return params;
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
   * @returns The artifact content - Buffer for raw/image/unknown types, string URL for url_ types, string path for vid_ types
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
    } else if (objType === "vid") {
      const contentType = headers["content-type"];
      if (contentType && !contentType.startsWith("video/")) {
        throw new Error(`Expected video content type, got ${contentType}`);
      }

      let ext = "mp4";
      const disposition =
        headers["content-disposition"] || headers["Content-Disposition"];
      if (disposition) {
        const dispositionParams = getDispositionParams(disposition);
        const filename = dispositionParams["filename"];
        if (filename) {
          const extMatch = filename.match(/\.([^.]+)$/);
          if (extMatch) {
            ext = extMatch[1];
          }
        }
      }

      const safeSessionId = sessionId.replace(/-/g, "");
      const cachePath = path.join(
        VLMRUN_CACHE_DIR,
        `${safeSessionId}_${objectId}.${ext}`
      );

      if (fs.existsSync(cachePath)) {
        return cachePath;
      }

      ensureCacheDir();
      fs.writeFileSync(cachePath, data);
      return cachePath;
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
