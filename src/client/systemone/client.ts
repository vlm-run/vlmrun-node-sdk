import axios, { AxiosError } from "axios";
import {
  APIError,
  AuthenticationError,
  InputError,
  NetworkError,
  RateLimitError,
  RequestTimeoutError,
  ResourceNotFoundError,
  ServerError,
  ValidationError,
} from "../exceptions";
import { Client } from "../base_requestor";
import { buildContent } from "./content";
import { isForestry, resolveQuestionSpec } from "./forestry";
import type { Forestry } from "./forestry";
import { DecisionResult } from "./result";
import { DecisionStream } from "./stream";
import type { StreamOptions } from "./stream";
import {
  DEFAULT_READ_TIMEOUT_MS,
  REASONING_EFFORTS,
  SYSTEMONE_MODEL,
  TYPESAFE_API_KEY_ENV,
  TYPESAFE_DEFAULT_MODEL_ENV,
  env,
  resolveTypesafeRoot,
} from "./urls";
import type {
  ImageDetail,
  ListModelsResponse,
  Questions,
  ReasoningEffort,
  Transport,
  Usage,
  WireQuestions,
} from "./types";
import { WebSocketStream } from "./websocket";

export interface DecideOptions<Q extends Questions = Questions> {
  state: unknown;
  questions?: unknown;
  forestry?: Forestry<Q> | unknown;
  model?: string;
  images?: readonly string[];
  document?: string;
  text?: string | readonly string[];
  detail?: ImageDetail;
  steps?: number;
  samples?: number;
  reasoningEffort?: ReasoningEffort;
  timeoutMs?: number;
  extraBody?: Record<string, unknown>;
  extraHeaders?: Record<string, string>;
}

export interface StreamStartOptions<Q extends Questions = Questions>
  extends Omit<
    DecideOptions<Q>,
    "images" | "document" | "text" | "extraHeaders" | "state"
  > {
  state?: unknown;
  concurrency?: number;
  transport?: Transport;
}

export interface SystemOneOptions {
  baseUrl?: string;
  gatewayUrl?: string;
  model?: string;
  timeoutMs?: number;
}

/**
 * Typed decisions on `POST {gateway}/typesafe/v1/systemone`.
 *
 * Mirrors the Python SDK's `client.gateway.systemone` resource: named
 * questions (or a Forestry) about text, JSON, images and PDFs, over HTTP
 * or a pipelined websocket session.
 */
export class SystemOne {
  private readonly client: Client;
  private readonly timeoutMs: number;
  readonly baseUrl: string;
  readonly model: string;

  constructor(client: Client, options: SystemOneOptions = {}) {
    this.client = client;
    this.baseUrl = resolveTypesafeRoot({
      baseUrl: options.baseUrl,
      gatewayUrl: options.gatewayUrl,
    });
    this.model =
      options.model || env(TYPESAFE_DEFAULT_MODEL_ENV) || SYSTEMONE_MODEL;
    this.timeoutMs =
      options.timeoutMs ?? client.timeout ?? DEFAULT_READ_TIMEOUT_MS;
  }

  get apiKey(): string {
    return this.client.apiKey || env(TYPESAFE_API_KEY_ENV) || "EMPTY";
  }

  /**
   * The request body `decide()` would send, without sending it.
   *
   * Media is not inlined here — that happens on `decide()` so a dry-run
   * of the question spec stays offline.
   */
  buildRequest<Q extends Questions>(
    options: DecideOptions<Q>
  ): Record<string, unknown> {
    const { questions, model, extra } = this.requestParts(options);
    return {
      state: options.state,
      model,
      questions,
      ...extra,
    };
  }

  async decide<Q extends Questions>(
    options: DecideOptions<Q>
  ): Promise<DecisionResult<Q>> {
    const started = nowMs();
    const { questions, model, extra } = await this.prepare(options);
    const prepMs = nowMs() - started;
    const apiStarted = nowMs();
    const payload = await this.request<{
      model?: string;
      answers?: Record<string, unknown>;
      usage?: Usage;
    }>("POST", "/v1/systemone", {
      body: {
        state: options.state,
        model,
        questions,
        ...extra,
      },
      timeoutMs: options.timeoutMs,
      headers: options.extraHeaders,
    });
    const apiMs = nowMs() - apiStarted;
    return new DecisionResult<Q>({
      model: payload.model ?? model,
      answers: payload.answers ?? {},
      usage: payload.usage,
      timings: {
        prepMs,
        apiMs,
        totalMs: nowMs() - started,
      },
    });
  }

  async stream<Q extends Questions>(
    options: StreamStartOptions<Q>
  ): Promise<DecisionStream<Q>> {
    const transport: Transport = options.transport ?? "http";
    switch (transport) {
      case "http":
      case "ws":
        break;
      default: {
        const _never: never = transport;
        throw new InputError(
          `transport must be 'http' or 'ws'; got ${JSON.stringify(_never)}`,
          "input_error",
          "Use 'ws' for one pipelined session, 'http' for independent reads."
        );
      }
    }
    const streamOptions: StreamOptions = {
      questions: this.questionSpec(options),
      state: options.state ?? "",
      model: options.model,
      detail: options.detail,
      steps: options.steps,
      samples: options.samples,
      reasoningEffort: options.reasoningEffort,
      timeoutMs: options.timeoutMs,
      extraBody: options.extraBody,
      concurrency: options.concurrency,
    };
    const stream =
      transport === "ws"
        ? new WebSocketStream<Q>(this, streamOptions)
        : new DecisionStream<Q>(this, streamOptions);
    await stream.open();
    return stream;
  }

  async models(): Promise<ListModelsResponse> {
    const payload = await this.request<unknown>("GET", "/v1/models");
    if (Array.isArray(payload)) {
      return { data: payload as ListModelsResponse["data"] };
    }
    if (isRecord(payload) && Array.isArray(payload.data)) {
      return payload as unknown as ListModelsResponse;
    }
    if (isRecord(payload) && Array.isArray(payload.models)) {
      return {
        data: payload.models as ListModelsResponse["data"],
        default:
          typeof payload.default === "string" ? payload.default : undefined,
      };
    }
    return { data: [] };
  }

  private questionSpec(options: {
    questions?: unknown;
    forestry?: unknown;
  }): WireQuestions {
    return resolveQuestionSpec({
      questions: options.questions,
      forestry: options.forestry,
    });
  }

  private requestParts(options: DecideOptions): {
    questions: WireQuestions;
    model: string;
    extra: Record<string, unknown>;
  } {
    if (
      options.reasoningEffort !== undefined &&
      !REASONING_EFFORTS.includes(options.reasoningEffort)
    ) {
      throw new InputError(
        `reasoning_effort ${JSON.stringify(options.reasoningEffort)} is not one of ${REASONING_EFFORTS.join(", ")}`,
        "question_spec",
        "Only a generative engine reasons; see SystemOne.models()."
      );
    }
    return {
      questions: this.questionSpec(options),
      model: options.model ?? this.model,
      extra: {},
    };
  }

  private async prepare(options: DecideOptions): Promise<{
    questions: WireQuestions;
    model: string;
    extra: Record<string, unknown>;
  }> {
    const parts = this.requestParts(options);
    const extra: Record<string, unknown> = { ...parts.extra };
    const content = await buildContent({
      images: options.images,
      document: options.document,
      text: options.text,
      detail: options.detail,
      timeoutMs: options.timeoutMs ?? 30_000,
    });
    if (content) {
      extra.content = content;
    }
    if (options.steps !== undefined) {
      extra.steps = options.steps;
    }
    if (options.samples !== undefined) {
      extra.samples = options.samples;
    }
    if (options.reasoningEffort !== undefined) {
      extra.reasoning_effort = options.reasoningEffort;
    }
    if (options.extraBody) {
      Object.assign(extra, options.extraBody);
    }
    return { ...parts, extra };
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    options: {
      body?: unknown;
      timeoutMs?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    try {
      const response = await axios.request<T>({
        method,
        url: `${this.baseUrl}${path}`,
        data: options.body,
        timeout: options.timeoutMs ?? this.timeoutMs,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
        validateStatus: (status) => status >= 200 && status < 300,
      });
      return response.data;
    } catch (error) {
      throw mapAxiosError(error);
    }
  }
}

export function questionsOf(forestryOrSpec: unknown): WireQuestions {
  if (isForestry(forestryOrSpec)) {
    return forestryOrSpec.toWire();
  }
  return resolveQuestionSpec({ questions: forestryOrSpec });
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapAxiosError(error: unknown): Error {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status;
    const headers = error.response.headers;
    const message = axiosMessage(error);
    if (status === 401) {
      return new AuthenticationError(message, status, headers);
    }
    if (status === 400 || status === 422) {
      return new ValidationError(message, status, headers);
    }
    if (status === 404) {
      return new ResourceNotFoundError(message, status, headers);
    }
    if (status === 429) {
      return new RateLimitError(message, status, headers);
    }
    if (status >= 500 && status < 600) {
      return new ServerError(message, status, headers);
    }
    return new APIError(message, status, headers);
  }
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return new RequestTimeoutError(`Request timed out: ${error.message}`);
    }
    return new NetworkError(`Network error: ${error.message}`);
  }
  return new APIError(
    error instanceof Error ? error.message : "Unknown error occurred"
  );
}

function axiosMessage(error: AxiosError): string {
  const data = error.response?.data;
  if (isRecord(data)) {
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail) && isRecord(data.detail[0])) {
      return String(data.detail[0].msg ?? data.detail[0]);
    }
    if (typeof data.message === "string") {
      return data.message;
    }
  }
  return error.message || "API request failed";
}
