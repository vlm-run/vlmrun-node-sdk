/**
 * VLM Run OpenAI-compatible model gateway resource.
 *
 * The gateway (`https://gateway.vlm.run/v1`) exposes an OpenAI-compatible
 * surface for third-party OCR / vision-language models (e.g. `zai-org/glm-ocr`,
 * `paddleocr/pp-ocrv6`, `qwen/qwen3.5-0.8b`). It authenticates with the same
 * `VLMRUN_API_KEY` used everywhere else in the SDK.
 *
 * This mirrors the `Agent` completions pattern: we point the OpenAI SDK at
 * `{gatewayURL}/openai` and reuse the familiar chat-completions / models
 * interface.
 */

import { Client } from "./base_requestor";
import { DependencyError } from "./exceptions";

/**
 * OpenAI-compatible model gateway (third-party OCR / VLM models).
 * Override with the `VLMRUN_GATEWAY_URL` environment variable.
 */
export const DEFAULT_GATEWAY_URL = "https://gateway.vlm.run/v1";

/** Client default timeout in ms, mirroring APIRequestor's DEFAULT_TIMEOUT. */
const DEFAULT_CLIENT_TIMEOUT = 120000;

/** Gateway calls (multi-page PDF OCR) routinely exceed the 120s default. */
const DEFAULT_GATEWAY_TIMEOUT = 600000;

export class Gateway {
  private client: Client;
  private _baseURL: string;
  private _openai: any = null;

  /**
   * Initialize the Gateway resource.
   *
   * @param client - VLM Run API client configuration (provides the API key)
   * @param baseURL - Optional gateway base URL override. Falls back to the
   *   `VLMRUN_GATEWAY_URL` environment variable, then the default.
   */
  constructor(client: Client, baseURL?: string) {
    this.client = client;
    this._baseURL =
      baseURL ??
      (typeof process !== "undefined" ? process.env.VLMRUN_GATEWAY_URL : undefined) ??
      DEFAULT_GATEWAY_URL;
  }

  /** Gateway base URL (without trailing slash). */
  get baseURL(): string {
    return this._baseURL.replace(/\/+$/, "");
  }

  /** OpenAI-compatible base URL used by the OpenAI SDK. */
  get openaiBaseURL(): string {
    return `${this.baseURL}/openai`;
  }

  /**
   * Raise the timeout floor to 600s when the user is still at the client
   * default. An explicit timeout (longer deadline or shorter fail-fast) is
   * theirs to keep.
   */
  private get timeout(): number {
    const timeout = this.client.timeout;
    if (timeout === undefined || timeout === DEFAULT_CLIENT_TIMEOUT) {
      return DEFAULT_GATEWAY_TIMEOUT;
    }
    return timeout;
  }

  /**
   * OpenAI client pointed at the gateway.
   *
   * @throws {DependencyError} If the openai package is not installed
   */
  private get openai(): any {
    if (this._openai) {
      return this._openai;
    }

    let OpenAI: any;
    try {
      // Dynamic import to handle optional dependency
      OpenAI = require("openai").default;
    } catch (e) {
      throw new DependencyError(
        "OpenAI SDK is not installed",
        "missing_dependency",
        "Install it with `npm install openai` or `yarn add openai`",
      );
    }

    this._openai = new OpenAI({
      apiKey: this.client.apiKey,
      baseURL: this.openaiBaseURL,
      timeout: this.timeout,
      maxRetries: this.client.maxRetries ?? 1,
    });
    return this._openai;
  }

  /**
   * OpenAI-compatible chat completions interface.
   *
   * @example
   * ```typescript
   * import { VlmRun } from "vlmrun";
   *
   * const client = new VlmRun({ apiKey: "your-key" });
   *
   * const response = await client.gateway.completions.create({
   *   model: "paddleocr/pp-ocrv6",
   *   messages: [
   *     {
   *       role: "user",
   *       content: [
   *         { type: "document_url", document_url: { url: "https://example.com/doc.pdf" } },
   *       ],
   *     },
   *   ],
   * });
   * ```
   *
   * @throws {DependencyError} If openai package is not installed
   */
  get completions(): any {
    return this.openai.chat.completions;
  }

  /**
   * OpenAI-compatible embeddings interface.
   *
   * Multimodal input nests content parts one level deeper than plain text:
   * `input` is an array whose items are either a string or an *array* of
   * content parts.
   *
   * @example
   * ```typescript
   * const response = await client.gateway.embeddings.create({
   *   model: "qwen/qwen3-vl-embedding-2b",
   *   input: [[{ type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }]],
   * });
   * ```
   *
   * @throws {DependencyError} If openai package is not installed
   */
  get embeddings(): any {
    return this.openai.embeddings;
  }

  /**
   * OpenAI-compatible audio transcriptions interface.
   *
   * @throws {DependencyError} If openai package is not installed
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
   * @throws {DependencyError} If openai package is not installed
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
      const response = await fetch(`${this.baseURL}/health`, {
        headers: { Authorization: `Bearer ${this.client.apiKey}` },
      });
      if (response.status !== 404) {
        return response.ok;
      }
    } catch {
      // No dedicated health route reachable — fall back to a real call.
    }

    try {
      await this.models();
      return true;
    } catch {
      return false;
    }
  }
}
