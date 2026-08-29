/**
 * VLM Run OpenAI-compatible model gateway resource.
 *
 * The gateway (`https://gateway.vlm.run/v1`) exposes an OpenAI-compatible
 * surface for third-party OCR / vision-language models (e.g. `glm-ocr`,
 * `paddle-ocrv6`, `qwen3.6-0.8b`). It authenticates with the same
 * `VLMRUN_API_KEY` used everywhere else in the SDK.
 *
 * This mirrors the `Agent` completions pattern: we point the OpenAI SDK at
 * `{gatewayUrl}/openai` and reuse the familiar chat-completions / models
 * interfaces.
 */

import axios from "axios";

import { Client } from "./base_requestor";
import { DependencyError } from "./exceptions";

export const DEFAULT_GATEWAY_URL = "https://gateway.vlm.run/v1";

const DEFAULT_CLIENT_TIMEOUT = 120000; // ms, matches APIRequestor default
const GATEWAY_TIMEOUT = 600000; // ms

export class Gateway {
  /**
   * OpenAI-compatible model gateway resource for VLM Run.
   *
   * Provides access to third-party OCR / VLM models hosted behind the VLM Run
   * gateway using the standard OpenAI chat-completions, embeddings,
   * transcriptions, and models interfaces.
   */
  private client: Client;
  private _baseURL: string;
  private _openai: any = null;

  constructor(client: Client, baseURL?: string) {
    /**
     * Initialize the Gateway resource.
     *
     * @param client - VLM Run API client instance (provides the API key)
     * @param baseURL - Optional gateway base URL override. Falls back to the
     *   `VLMRUN_GATEWAY_URL` environment variable, then the default.
     */
    this.client = client;
    this._baseURL =
      baseURL || process.env.VLMRUN_GATEWAY_URL || DEFAULT_GATEWAY_URL;
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

  private _timeout(): number {
    // Gateway calls (especially multi-page PDF OCR) routinely exceed the
    // client's 120s default, so raise the floor to 600s — but only when the
    // user is still at that default. An explicit timeout (whether a longer
    // deadline or a shorter fail-fast) is theirs to keep.
    const timeout = this.client.timeout;
    if (timeout === undefined || timeout === DEFAULT_CLIENT_TIMEOUT) {
      return GATEWAY_TIMEOUT;
    }
    return timeout;
  }

  private get openaiClient(): any {
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
      timeout: this._timeout(),
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
   * @returns OpenAI Completions object configured for the VLM Run gateway
   */
  get completions(): any {
    return this.openaiClient.chat.completions;
  }

  /**
   * OpenAI-compatible embeddings interface.
   *
   * Note: multimodal input nests content parts one level deeper than plain
   * text: `input` is a list whose items are either a string or a *list* of
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
   * @throws {DependencyError} If the openai package is not installed
   * @returns OpenAI Embeddings object configured for the VLM Run gateway
   */
  get embeddings(): any {
    return this.openaiClient.embeddings;
  }

  /**
   * OpenAI-compatible audio transcriptions interface.
   *
   * @example
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
   * @returns OpenAI Transcriptions object configured for the VLM Run gateway
   */
  get transcriptions(): any {
    return this.openaiClient.audio.transcriptions;
  }

  /**
   * List models available on the gateway.
   *
   * Returns the raw OpenAI `Model` objects. Gateway models carry extra
   * metadata (input/output pricing, modality support, etc.) beyond the
   * standard OpenAI fields.
   *
   * @throws {DependencyError} If the openai package is not installed
   * @returns List of OpenAI `Model` objects
   */
  async models(): Promise<any[]> {
    const models: any[] = [];
    for await (const model of this.openaiClient.models.list()) {
      models.push(model);
    }
    return models;
  }

  /**
   * Check gateway liveness.
   *
   * Attempts a `GET {gateway}/health` request and falls back to listing
   * models as a liveness probe if no dedicated health endpoint responds.
   *
   * @returns True if the gateway is reachable and authenticated, else false
   */
  async health(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        headers: { Authorization: `Bearer ${this.client.apiKey}` },
        timeout: 30000,
        validateStatus: () => true,
      });
      if (response.status === 404) {
        return this._modelsProbe();
      }
      return response.status >= 200 && response.status < 300;
    } catch (e) {
      // No dedicated health route reachable — fall back to a real call.
      return this._modelsProbe();
    }
  }

  private async _modelsProbe(): Promise<boolean> {
    try {
      await this.models();
      return true;
    } catch (e) {
      return false;
    }
  }
}
