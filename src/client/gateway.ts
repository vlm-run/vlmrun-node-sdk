/**
 * VLM Run OpenAI-compatible model gateway resource.
 *
 * The gateway (`https://gateway.vlm.run/v1`) exposes an OpenAI-compatible
 * surface for third-party OCR / vision-language models (e.g. `zai-org/glm-ocr`,
 * `paddleocr/pp-ocrv6`, `qwen/qwen3.5-0.8b`). It authenticates with the same
 * `VLMRUN_API_KEY` used everywhere else in the SDK.
 */

import axios from "axios";
import { Client } from "./base_requestor";
import { DependencyError } from "./exceptions";

/**
 * Default OpenAI-compatible model gateway URL.
 * Override with the `VLMRUN_GATEWAY_URL` environment variable.
 */
export const DEFAULT_GATEWAY_URL = "https://gateway.vlm.run/v1";

const DEFAULT_CLIENT_TIMEOUT = 120000;
const GATEWAY_MIN_TIMEOUT = 600000;

export class Gateway {
  /**
   * OpenAI-compatible model gateway resource for VLM Run.
   *
   * Provides access to third-party OCR / VLM models hosted behind the VLM Run
   * gateway using the standard OpenAI chat-completions, embeddings, audio
   * transcription and models interfaces.
   */
  private client: Client;
  private _baseURL: string;
  private _openai: any = null;

  constructor(client: Client, baseURL?: string) {
    /**
     * Initialize the Gateway resource.
     *
     * @param client - VLM Run API instance (provides the API key)
     * @param baseURL - Optional gateway base URL override. Falls back to the
     *   `VLMRUN_GATEWAY_URL` environment variable, then the default.
     */
    this.client = client;
    this._baseURL =
      baseURL ?? process.env.VLMRUN_GATEWAY_URL ?? DEFAULT_GATEWAY_URL;
  }

  /**
   * Gateway base URL (without trailing slash).
   */
  get baseURL(): string {
    return this._baseURL.replace(/\/+$/, "");
  }

  /**
   * OpenAI-compatible base URL used by the OpenAI SDK.
   */
  get openaiBaseURL(): string {
    return `${this.baseURL}/openai`;
  }

  /**
   * Gateway calls (especially multi-page PDF OCR) routinely exceed the client's
   * 120s default, so raise the floor to 600s — but only when the user is still
   * at that default. An explicit timeout is theirs to keep.
   */
  private get timeout(): number {
    const timeout = this.client.timeout;
    if (timeout === undefined || timeout === DEFAULT_CLIENT_TIMEOUT) {
      return GATEWAY_MIN_TIMEOUT;
    }
    return timeout;
  }

  /**
   * OpenAI client pointed at the gateway.
   *
   * @throws {DependencyError} If the `openai` package is not installed
   */
  private get openai(): any {
    if (this._openai) {
      return this._openai;
    }

    let OpenAI: any;
    try {
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
   * const client = new VlmRun({ apiKey: "<VLMRUN_API_KEY>" });
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
   * @throws {DependencyError} If the `openai` package is not installed
   * @returns OpenAI Completions object configured for the VLM Run gateway
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
   * @throws {DependencyError} If the `openai` package is not installed
   * @returns OpenAI Embeddings object configured for the VLM Run gateway
   */
  get embeddings(): any {
    return this.openai.embeddings;
  }

  /**
   * OpenAI-compatible audio transcriptions interface.
   *
   * @throws {DependencyError} If the `openai` package is not installed
   * @returns OpenAI Transcriptions object configured for the VLM Run gateway
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
   * @throws {DependencyError} If the `openai` package is not installed
   * @returns List of OpenAI `Model` objects
   */
  async models(): Promise<any[]> {
    const page = await this.openai.models.list();
    return page.data ?? [];
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
      const response = await axios.get(`${this.baseURL}/health`, {
        headers: { Authorization: `Bearer ${this.client.apiKey}` },
        timeout: 30000,
        validateStatus: () => true,
      });
      if (response.status !== 404) {
        return response.status >= 200 && response.status < 300;
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
