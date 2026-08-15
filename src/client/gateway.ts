/**
 * VLM Run OpenAI-compatible model gateway resource.
 *
 * The gateway (`https://gateway.vlm.run/v1`) exposes an OpenAI-compatible
 * surface for third-party OCR / vision-language models (e.g. `glm-ocr`,
 * `paddle-ocrv6`, `qwen3.6-0.8b`). It authenticates with the same API key used
 * everywhere else in the SDK.
 *
 * This mirrors the `Agent` completions pattern: the OpenAI SDK is pointed at
 * `{gatewayUrl}/openai` and the familiar chat-completions / models interface is
 * reused.
 */

import { Client } from "./base_requestor";
import { DependencyError } from "./exceptions";

export const DEFAULT_GATEWAY_URL = "https://gateway.vlm.run/v1";

/** Gateway calls (especially multi-page PDF OCR) routinely exceed the client's
 * 120s default, so the floor is raised to 600s — but only when the user is
 * still at that default. An explicit timeout (whether a longer deadline or a
 * shorter fail-fast) is theirs to keep. */
const DEFAULT_CLIENT_TIMEOUT_MS = 120000;
const GATEWAY_TIMEOUT_MS = 600000;

function requireOpenAI(): any {
  try {
    // Dynamic import to handle optional dependency
    return require("openai").default;
  } catch (e) {
    throw new DependencyError(
      "OpenAI SDK is not installed",
      "missing_dependency",
      "Install it with `npm install openai` or `yarn add openai`"
    );
  }
}

export class Gateway {
  private client: Client;
  private _baseUrl: string;
  private _openai: any;

  /**
   * Initialize the Gateway resource.
   *
   * @param client - VLM Run API client configuration (provides the API key)
   * @param baseUrl - Optional gateway base URL override. Falls back to the
   *   `VLMRUN_GATEWAY_URL` environment variable, then the default.
   */
  constructor(client: Client, baseUrl?: string) {
    this.client = client;
    this._baseUrl =
      baseUrl ?? process.env.VLMRUN_GATEWAY_URL ?? DEFAULT_GATEWAY_URL;
  }

  /** Gateway base URL (without trailing slash). */
  get baseUrl(): string {
    return this._baseUrl.replace(/\/+$/, "");
  }

  /** OpenAI-compatible base URL used by the OpenAI SDK. */
  get openaiBaseUrl(): string {
    return `${this.baseUrl}/openai`;
  }

  private get timeout(): number {
    const timeout = this.client.timeout;
    if (timeout === undefined || timeout === DEFAULT_CLIENT_TIMEOUT_MS) {
      return GATEWAY_TIMEOUT_MS;
    }
    return timeout;
  }

  private get openai(): any {
    if (!this._openai) {
      const OpenAI = requireOpenAI();
      this._openai = new OpenAI({
        apiKey: this.client.apiKey,
        baseURL: this.openaiBaseUrl,
        timeout: this.timeout,
        maxRetries: this.client.maxRetries ?? 1,
      });
    }
    return this._openai;
  }

  /**
   * OpenAI-compatible chat completions interface.
   *
   * ```typescript
   * const response = await client.gateway.completions.create({
   *   model: "glm-ocr",
   *   messages: [
   *     {
   *       role: "user",
   *       content: [
   *         {
   *           type: "document_url",
   *           document_url: { url: "data:application/pdf;base64,..." },
   *         },
   *       ],
   *     },
   *   ],
   * });
   * ```
   *
   * @throws {DependencyError} If the openai package is not installed
   */
  get completions(): any {
    return this.openai.chat.completions;
  }

  /**
   * OpenAI-compatible embeddings interface.
   *
   * Multimodal input nests content parts one level deeper than plain text:
   * `input` is a list whose items are either a string or a *list* of content
   * parts.
   *
   * ```typescript
   * const response = await client.gateway.embeddings.create({
   *   model: "qwen/qwen3-vl-embedding-2b",
   *   input: [[{ type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }]],
   * });
   * ```
   *
   * @throws {DependencyError} If the openai package is not installed
   */
  get embeddings(): any {
    return this.openai.embeddings;
  }

  /**
   * OpenAI-compatible audio transcriptions interface.
   *
   * ```typescript
   * import fs from "fs";
   *
   * const response = await client.gateway.transcriptions.create({
   *   model: "nvidia/parakeet-tdt-0.6b-v3",
   *   file: fs.createReadStream("clip.mp3"),
   * });
   * ```
   *
   * @throws {DependencyError} If the openai package is not installed
   */
  get transcriptions(): any {
    return this.openai.audio.transcriptions;
  }

  /**
   * List models available on the gateway.
   *
   * Returns the raw OpenAI `Model` objects. Gateway models carry extra
   * metadata (input/output pricing, modality support, etc.) beyond the
   * standard OpenAI fields.
   *
   * @throws {DependencyError} If the openai package is not installed
   */
  async models(): Promise<any[]> {
    const response = await this.openai.models.list();
    return response.data ?? [];
  }

  /**
   * Check gateway liveness.
   *
   * Attempts a `GET {gateway}/health` request and falls back to listing models
   * as a liveness probe if no dedicated health endpoint responds.
   *
   * @returns true if the gateway is reachable and authenticated, else false
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: { Authorization: `Bearer ${this.client.apiKey}` },
        signal: AbortSignal.timeout(30000),
      });
      if (response.status !== 404) {
        return response.ok;
      }
    } catch {
      // No dedicated health route reachable — fall back to a real call below.
    }

    try {
      await this.models();
      return true;
    } catch {
      return false;
    }
  }
}
