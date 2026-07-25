/**
 * VLM Run OpenAI-compatible model gateway resource.
 *
 * The gateway (`https://gateway.vlm.run/v1`) exposes an OpenAI-compatible
 * surface for third-party OCR / vision-language models (e.g. `glm-ocr`,
 * `paddle-ocrv6`, `qwen3.6-0.8b`). It authenticates with the same API key
 * used everywhere else in the SDK.
 */

import { Client } from "./base_requestor";
import { DependencyError } from "./exceptions";

export const DEFAULT_GATEWAY_URL = "https://gateway.vlm.run/v1";

function requireOpenAI(): any {
  try {
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
  private _openaiClient: any = null;

  /**
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
  get baseURL(): string {
    return this._baseUrl.replace(/\/+$/, "");
  }

  /** OpenAI-compatible base URL used by the OpenAI SDK. */
  get openaiBaseURL(): string {
    return `${this.baseURL}/openai`;
  }

  /**
   * Gateway calls (especially multi-page PDF OCR) routinely exceed the
   * client's default timeout, so raise the floor to 600s unless the user set
   * an explicit timeout.
   */
  private get timeout(): number | undefined {
    return this.client.timeout ?? 600_000;
  }

  private get openai(): any {
    if (this._openaiClient) {
      return this._openaiClient;
    }
    const OpenAI = requireOpenAI();
    this._openaiClient = new OpenAI({
      apiKey: this.client.apiKey,
      baseURL: this.openaiBaseURL,
      timeout: this.timeout,
      maxRetries: this.client.maxRetries ?? 1,
    });
    return this._openaiClient;
  }

  /**
   * OpenAI-compatible chat completions interface.
   *
   * @example
   * ```typescript
   * const response = await client.gateway.completions.create({
   *   model: "glm-ocr",
   *   messages: [
   *     {
   *       role: "user",
   *       content: [
   *         { type: "document_url", document_url: { url: "data:application/pdf;base64,..." } },
   *       ],
   *     },
   *   ],
   * });
   * ```
   */
  get completions(): any {
    return this.openai.chat.completions;
  }

  /**
   * OpenAI-compatible embeddings interface.
   *
   * Multimodal input nests content parts one level deeper than plain text:
   * `input` is an array whose items are either a string or an array of
   * content parts.
   */
  get embeddings(): any {
    return this.openai.embeddings;
  }

  /** OpenAI-compatible audio transcriptions interface. */
  get transcriptions(): any {
    return this.openai.audio.transcriptions;
  }

  /**
   * List models available on the gateway.
   *
   * Gateway models carry extra metadata (input/output pricing, modality
   * support, etc.) beyond the standard OpenAI fields.
   */
  async models(): Promise<any[]> {
    const response = await this.openai.models.list();
    return response.data ?? [];
  }

  /**
   * Check gateway liveness. Falls back to listing models when no dedicated
   * health endpoint responds.
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
