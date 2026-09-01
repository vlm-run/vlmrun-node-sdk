/**
 * VLM Run OpenAI-compatible model gateway resource.
 *
 * The gateway (`https://gateway.vlm.run/v1`) exposes an OpenAI-compatible
 * surface for third-party OCR / vision-language models (e.g. `glm-ocr`,
 * `paddle-ocrv6`, `qwen3.6-0.8b`). It authenticates with the same
 * `VLMRUN_API_KEY` used everywhere else in the SDK.
 *
 * This mirrors the {@link Agent} completions pattern: we point the OpenAI SDK
 * at `{gateway_url}/openai` and reuse the familiar chat-completions /
 * embeddings / transcriptions / models interface.
 */

import axios from "axios";
import { Client } from "./base_requestor";
import { DependencyError } from "./exceptions";

/**
 * Default gateway base URL. Overridable via the `VLMRUN_GATEWAY_URL`
 * environment variable or the constructor `baseUrl` argument.
 */
export const DEFAULT_GATEWAY_URL = "https://gateway.vlm.run/v1";

/** The `openai` SDK default timeout in milliseconds (10 minutes). */
const GATEWAY_TIMEOUT_MS = 600000;

/** The VLM Run SDK default request timeout in milliseconds. */
const SDK_DEFAULT_TIMEOUT_MS = 120000;

/**
 * OpenAI-compatible model gateway resource for VLM Run.
 *
 * Provides access to third-party OCR / VLM models hosted behind the VLM Run
 * gateway using the standard OpenAI chat-completions, embeddings,
 * transcriptions and models interfaces.
 */
export class Gateway {
  private client: Client;
  private _baseUrl: string;
  private _openaiClient: any = null;

  /**
   * Initialize the Gateway resource.
   *
   * @param client - VLM Run API client configuration (provides the API key).
   * @param baseUrl - Optional gateway base URL override. Falls back to the
   *   `VLMRUN_GATEWAY_URL` environment variable, then {@link DEFAULT_GATEWAY_URL}.
   */
  constructor(client: Client, baseUrl?: string) {
    this.client = client;
    this._baseUrl =
      baseUrl ??
      (typeof process !== "undefined"
        ? process.env?.VLMRUN_GATEWAY_URL
        : undefined) ??
      DEFAULT_GATEWAY_URL;
  }

  /** Gateway base URL (without trailing slash). */
  get baseUrl(): string {
    return this._baseUrl.replace(/\/+$/, "");
  }

  /** OpenAI-compatible base URL used by the OpenAI SDK. */
  get openaiBaseUrl(): string {
    return `${this.baseUrl}/openai`;
  }

  /**
   * Resolve the timeout for gateway calls.
   *
   * Gateway calls (especially multi-page PDF OCR) routinely exceed the
   * client's 120s default, so raise the floor to 600s — but only when the
   * user is still at that default. An explicit timeout (whether a longer
   * deadline or a shorter fail-fast) is theirs to keep.
   */
  private _timeout(): number | undefined {
    const timeout = this.client.timeout;
    if (timeout === undefined || timeout === null) {
      return GATEWAY_TIMEOUT_MS;
    }
    if (timeout === SDK_DEFAULT_TIMEOUT_MS) {
      return GATEWAY_TIMEOUT_MS;
    }
    return timeout;
  }

  /**
   * Lazily construct and cache the OpenAI client pointed at the gateway.
   *
   * @throws {DependencyError} If the `openai` package is not installed.
   */
  private get _openai(): any {
    if (this._openaiClient) {
      return this._openaiClient;
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

    this._openaiClient = new OpenAI({
      apiKey: this.client.apiKey,
      baseURL: this.openaiBaseUrl,
      timeout: this._timeout(),
      maxRetries: this.client.maxRetries ?? 1,
    });
    return this._openaiClient;
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
   * @throws {DependencyError} If the `openai` package is not installed.
   * @returns OpenAI Completions object configured for the VLM Run gateway.
   */
  get completions(): any {
    return this._openai.chat.completions;
  }

  /**
   * OpenAI-compatible embeddings interface.
   *
   * Note: multimodal input nests content parts one level deeper than plain
   * text — `input` is a list whose items are either a string or a *list* of
   * content parts.
   *
   * @example
   * ```typescript
   * import { VlmRun } from "vlmrun";
   *
   * const client = new VlmRun({ apiKey: "your-key" });
   * const response = await client.gateway.embeddings.create({
   *   model: "qwen/qwen3-vl-embedding-2b",
   *   input: [
   *     [{ type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }],
   *   ],
   * });
   * ```
   *
   * @throws {DependencyError} If the `openai` package is not installed.
   * @returns OpenAI Embeddings object configured for the VLM Run gateway.
   */
  get embeddings(): any {
    return this._openai.embeddings;
  }

  /**
   * OpenAI-compatible audio transcriptions interface.
   *
   * @example
   * ```typescript
   * import fs from "fs";
   * import { VlmRun } from "vlmrun";
   *
   * const client = new VlmRun({ apiKey: "your-key" });
   * const response = await client.gateway.transcriptions.create({
   *   model: "nvidia/parakeet-tdt-0.6b-v3",
   *   file: fs.createReadStream("clip.mp3"),
   * });
   * ```
   *
   * @throws {DependencyError} If the `openai` package is not installed.
   * @returns OpenAI Transcriptions object configured for the VLM Run gateway.
   */
  get transcriptions(): any {
    return this._openai.audio.transcriptions;
  }

  /**
   * List models available on the gateway.
   *
   * Returns the raw OpenAI `Model` objects. Gateway models carry extra
   * metadata (input/output pricing, modality support, etc.) beyond the
   * standard OpenAI fields.
   *
   * @throws {DependencyError} If the `openai` package is not installed.
   * @returns List of OpenAI `Model` objects.
   */
  async models(): Promise<any[]> {
    const page = await this._openai.models.list();
    return page.data ?? [];
  }

  /**
   * Check gateway liveness.
   *
   * Attempts a `GET {gateway}/health` request and falls back to listing
   * models as a liveness probe if no dedicated health endpoint responds.
   *
   * @returns True if the gateway is reachable and authenticated, else false.
   */
  async health(): Promise<boolean> {
    const headers = { Authorization: `Bearer ${this.client.apiKey}` };
    let status: number;
    try {
      const resp = await axios.get(`${this.baseUrl}/health`, {
        headers,
        timeout: 30000,
        validateStatus: () => true,
      });
      status = resp.status;
    } catch {
      // No dedicated health route reachable — fall back to a real call.
      return this._modelsLivenessProbe();
    }

    if (status === 404) {
      return this._modelsLivenessProbe();
    }
    return status >= 200 && status < 300;
  }

  private async _modelsLivenessProbe(): Promise<boolean> {
    try {
      await this.models();
      return true;
    } catch {
      return false;
    }
  }
}
