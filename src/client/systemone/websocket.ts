import { APIError, DependencyError, InputError, RequestTimeoutError } from "../exceptions";
import { buildContent } from "./content";
import { DecisionResult } from "./result";
import { DecisionStream, DecisionInput, StreamOptions } from "./stream";
import type { Questions, SessionLimits, SessionStats } from "./types";
import { typesafeWebsocketUrl } from "./urls";
import type { SystemOne } from "./client";

const WEBSOCKET_OPEN_TIMEOUT_MS = 30_000;
const WEBSOCKET_CLOSE_TIMEOUT_MS = 5_000;
export const WEBSOCKET_MAX_INFLIGHT = 8;

interface PendingRead {
  resolve: (value: Record<string, unknown>) => void;
  reject: (error: Error) => void;
}

function requireWs(): typeof import("ws") {
  try {
    return require("ws");
  } catch {
    throw new DependencyError(
      "websockets are not installed",
      "missing_dependency",
      "Install it with `npm install ws` or `yarn add ws`"
    );
  }
}

export class WebSocketStream<Q extends Questions = Questions> extends DecisionStream<Q> {
  private socket: import("ws") | null = null;
  private pending = new Map<string, PendingRead>();
  private handshake: PendingRead | null = null;
  private ids = 0;
  private window: number;
  private inflight = 0;
  private inflightWaiters: Array<() => void> = [];
  private stateLock: Promise<void> = Promise.resolve();
  private sentState: unknown = undefined;
  private _limits: SessionLimits = {};
  private _stats: SessionStats = {};
  private pumpError: Error | null = null;

  constructor(resource: SystemOne, options: StreamOptions) {
    super(resource, options);
    if (options.extraBody && Object.keys(options.extraBody).length > 0) {
      throw new InputError(
        "extra_body is not supported on the websocket transport",
        "input_error",
        'The session route rejects unknown fields; use transport: "http".'
      );
    }
    this.window = this.options.concurrency;
  }

  get url(): string {
    return typesafeWebsocketUrl(this.resource.baseUrl);
  }

  get limits(): SessionLimits {
    return { ...this._limits };
  }

  get stats(): SessionStats {
    return { ...this._stats };
  }

  get isOpen(): boolean {
    return this.socket !== null && this.socket.readyState === 1;
  }

  async open(): Promise<this> {
    const WebSocket = requireWs();
    const socket = await this.connect(WebSocket);
    this.socket = socket;
    this.attachPump(socket);
    const create: Record<string, unknown> = {
      type: "session.create",
      model: this.options.model ?? this.resource.model,
      questions: this.questions,
      max_inflight: Math.min(this.options.concurrency, WEBSOCKET_MAX_INFLIGHT),
    };
    if (this.options.steps !== undefined) {
      create.steps = this.options.steps;
    }
    if (this.options.samples !== undefined) {
      create.samples = this.options.samples;
    }
    if (this.options.reasoningEffort !== undefined) {
      create.reasoning_effort = this.options.reasoningEffort;
    }
    const ack = await this.waitForHandshake(create);
    if (ack.type !== "session.created") {
      await this.teardown();
      throw new InputError(
        `the gateway refused the session: ${String(ack.message ?? JSON.stringify(ack))}`,
        "input_error",
        "Check the model and question spec with client.gateway.systemone.models()."
      );
    }
    this._limits = ack as SessionLimits;
    const ceiling = Number(ack.max_inflight ?? this.options.concurrency);
    this.window = Math.max(1, Math.min(this.options.concurrency, ceiling));
    this.opened = true;
    if (this.options.state !== undefined && this.options.state !== "") {
      await this.sendState(this.options.state);
    }
    return this;
  }

  async close(cancel = false): Promise<void> {
    if (this.socket !== null && !cancel) {
      try {
        this.sendJson({ type: "session.close" });
        const deadline = Date.now() + WEBSOCKET_CLOSE_TIMEOUT_MS;
        while (Object.keys(this._stats).length === 0 && Date.now() < deadline) {
          await sleep(20);
        }
      } catch {
        // still torn down below
      }
    }
    await this.teardown();
  }

  protected async read(input: DecisionInput): Promise<DecisionResult<Q>> {
    this.checkOpen();
    if (this.pumpError) {
      throw this.pumpError;
    }
    const content = input.image
      ? await buildContent({
          images: [input.image],
          detail: this.options.detail,
          timeoutMs: this.options.timeoutMs ?? 30_000,
        })
      : undefined;

    const state = input.state;
    if (state !== undefined && !sameState(state, this.sentState)) {
      await this.withStateLock(async () => {
        if (!sameState(state, this.sentState)) {
          await this.barrier(state);
        }
      });
    }

    await this.acquire();
    const requestId = String(this.ids);
    this.ids += 1;
    try {
      return this.asResponse(await this.decideOnce(requestId, content));
    } finally {
      this.release();
    }
  }

  private async decideOnce(
    requestId: string,
    content: unknown
  ): Promise<Record<string, unknown>> {
    const message: Record<string, unknown> = { type: "decide", id: requestId };
    if (content) {
      message.content = content;
    }
    const timeoutMs = this.options.timeoutMs;
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer =
        timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              this.pending.delete(requestId);
              reject(
                new RequestTimeoutError(
                  `no decision within ${timeoutMs}ms on the websocket session`
                )
              );
            }, timeoutMs);
      this.pending.set(requestId, {
        resolve: (value) => {
          if (timer) clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          if (timer) clearTimeout(timer);
          reject(error);
        },
      });
      try {
        this.sendJson(message);
      } catch (error) {
        this.pending.delete(requestId);
        if (timer) clearTimeout(timer);
        reject(error instanceof Error ? error : new APIError(String(error)));
      }
    });
  }

  private asResponse(payload: Record<string, unknown>): DecisionResult<Q> {
    const answers = (payload.answers ?? {}) as Record<string, unknown>;
    const usage = (payload.usage ?? { input_tokens: 0, output_tokens: 0 }) as {
      input_tokens?: number;
      output_tokens?: number;
    };
    const latency = typeof payload.latency_ms === "number" ? payload.latency_ms : null;
    return new DecisionResult<Q>({
      model: String(this._limits.model ?? this.resource.model),
      answers,
      usage: {
        input_tokens: usage.input_tokens ?? 0,
        output_tokens: usage.output_tokens ?? 0,
        ...usage,
      },
      timings: { prepMs: 0, apiMs: latency, totalMs: latency ?? 0 },
    });
  }

  private async sendState(state: unknown): Promise<void> {
    this.sendJson({ type: "state", state });
    this.sentState = state;
  }

  private async barrier(state: unknown): Promise<void> {
    for (let i = 0; i < this.window; i += 1) {
      await this.acquire();
    }
    try {
      await this.sendState(state);
    } finally {
      for (let i = 0; i < this.window; i += 1) {
        this.release();
      }
    }
  }

  private async acquire(): Promise<void> {
    if (this.inflight < this.window) {
      this.inflight += 1;
      return;
    }
    await new Promise<void>((resolve) => {
      this.inflightWaiters.push(resolve);
    });
    this.inflight += 1;
  }

  private release(): void {
    this.inflight = Math.max(0, this.inflight - 1);
    const next = this.inflightWaiters.shift();
    if (next) next();
  }

  private async withStateLock(fn: () => Promise<void>): Promise<void> {
    const previous = this.stateLock;
    let release = () => undefined as void;
    this.stateLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      await fn();
    } finally {
      release();
    }
  }

  private sendJson(message: Record<string, unknown>): void {
    if (this.socket === null || this.socket.readyState !== 1) {
      throw new InputError(
        "the websocket session closed before this read finished",
        "input_error",
        "Consume the iterator while the stream is open."
      );
    }
    this.socket.send(JSON.stringify(message));
  }

  private attachPump(socket: import("ws")): void {
    socket.on("message", (raw: import("ws").RawData) => {
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch (error) {
        this.abort(
          new APIError(error instanceof Error ? error.message : "invalid websocket frame")
        );
        return;
      }
      const kind = message.type;
      if (kind === "session.created") {
        this.handshake?.resolve(message);
        this.handshake = null;
      } else if (kind === "decision") {
        this.settle(message.id, message);
      } else if (kind === "session.stats") {
        this._stats = message as SessionStats;
      } else if (kind === "error") {
        this.abort(
          new APIError(String(message.message ?? JSON.stringify(message))),
          message.id
        );
      }
    });
    socket.on("error", (error: Error) => {
      this.abort(error);
    });
    socket.on("close", () => {
      this.abort(
        new InputError(
          "the websocket session closed before this read finished",
          "input_error",
          "Consume the iterator while the stream is open."
        )
      );
    });
  }

  private settle(requestId: unknown, message: Record<string, unknown>): void {
    const pending = this.pending.get(String(requestId));
    if (pending) {
      this.pending.delete(String(requestId));
      pending.resolve(message);
    }
  }

  private abort(error: Error, only?: unknown): void {
    this.pumpError = error;
    if (only !== undefined && this.pending.has(String(only))) {
      const pending = this.pending.get(String(only));
      this.pending.delete(String(only));
      pending?.reject(error);
      return;
    }
    for (const pending of Array.from(this.pending.values())) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private async connect(WebSocket: typeof import("ws")): Promise<import("ws")> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url, {
        headers: { authorization: `Bearer ${this.resource.apiKey}` },
        handshakeTimeout: WEBSOCKET_OPEN_TIMEOUT_MS,
      });
      const timer = setTimeout(() => {
        socket.terminate();
        reject(
          new RequestTimeoutError(
            `websocket handshake timed out after ${WEBSOCKET_OPEN_TIMEOUT_MS}ms`
          )
        );
      }, WEBSOCKET_OPEN_TIMEOUT_MS);
      socket.once("open", () => {
        clearTimeout(timer);
        resolve(socket);
      });
      socket.once("error", (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private async waitForHandshake(
    create: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.handshake = null;
        reject(
          new RequestTimeoutError(
            `no session.created ack within ${WEBSOCKET_OPEN_TIMEOUT_MS}ms`
          )
        );
      }, WEBSOCKET_OPEN_TIMEOUT_MS);
      this.handshake = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      try {
        this.sendJson(create);
      } catch (error) {
        this.handshake = null;
        clearTimeout(timer);
        reject(error instanceof Error ? error : new APIError(String(error)));
      }
    });
  }

  private async teardown(): Promise<void> {
    const socket = this.socket;
    this.socket = null;
    this.opened = false;
    this.abort(
      new InputError(
        "the websocket session closed before this read finished",
        "input_error",
        "Consume the iterator while the stream is open."
      )
    );
    if (socket && socket.readyState === 1) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, WEBSOCKET_CLOSE_TIMEOUT_MS);
        socket.once("close", () => {
          clearTimeout(timer);
          resolve();
        });
        socket.close();
      });
    }
  }
}

function sameState(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
