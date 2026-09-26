import type {
  EntryType,
  ModelCard,
  Questions,
  SystemOneResult,
  TypeSafeClient,
} from "@typesafe-ai/sdk";
import type WebSocket from "ws";
import { Client } from "./base_requestor";
import { DependencyError } from "./exceptions";

const DEFAULT_MODEL = "google/diffusiongemma-26b-a4b-it";

export type SystemOneContent = string | Record<string, unknown>[];

export interface SystemOneRequest<Q extends Questions> {
  state: EntryType;
  questions: Q;
  model?: string;
  content?: SystemOneContent;
  steps?: number;
  samples?: number;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
  timeout?: number;
  extraHeaders?: Record<string, string>;
  extraBody?: Record<string, unknown>;
}

export interface SystemOneStreamOptions<Q extends Questions> {
  questions: Q;
  state?: EntryType;
  model?: string;
  steps?: number;
  samples?: number;
  reasoningEffort?: SystemOneRequest<Q>["reasoningEffort"];
  concurrency?: number;
  timeout?: number;
  transport?: "http" | "ws";
}

export class SystemOne {
  readonly baseUrl: string;
  readonly model: string;
  private readonly clientConfig: Client;
  private typeSafeClient?: TypeSafeClient;

  constructor(client: Client, gatewayUrl: string) {
    this.clientConfig = client;
    const env = typeof process !== "undefined" ? process.env : undefined;
    this.baseUrl = (
      env?.TYPESAFE_BASE_URL ||
      `${gatewayUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "")}/typesafe`
    ).replace(/\/+$/, "");
    this.model = env?.TYPESAFE_DEFAULT_MODEL || DEFAULT_MODEL;
  }

  private async getClient(): Promise<TypeSafeClient> {
    if (!this.typeSafeClient) {
      let TypeSafe: typeof import("@typesafe-ai/sdk").TypeSafeClient;
      try {
        ({ TypeSafeClient: TypeSafe } = await import("@typesafe-ai/sdk"));
      } catch {
        throw new DependencyError(
          "TypeSafe SDK is not installed",
          "missing_dependency",
          "Install it with `npm install @typesafe-ai/sdk`",
        );
      }
      this.typeSafeClient = new TypeSafe({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
        defaultModel: this.model,
        timeout: this.clientConfig.timeout ?? 120000,
        retry: { maxRetries: this.clientConfig.maxRetries ?? 2 },
      });
    }
    return this.typeSafeClient;
  }

  buildRequest<Q extends Questions>(
    request: SystemOneRequest<Q>,
  ): Record<string, unknown> {
    const {
      state,
      questions,
      model,
      content,
      steps,
      samples,
      reasoningEffort,
      extraBody,
    } = request;
    return {
      state,
      questions,
      model: model ?? this.model,
      ...(content !== undefined && { content }),
      ...(steps !== undefined && { steps }),
      ...(samples !== undefined && { samples }),
      ...(reasoningEffort !== undefined && {
        reasoning_effort: reasoningEffort,
      }),
      ...extraBody,
    };
  }

  async decide<Q extends Questions>(
    request: SystemOneRequest<Q>,
  ): Promise<SystemOneResult<Q>> {
    const client = await this.getClient();
    return client.systemOne(
      this.buildRequest(
        request,
      ) as unknown as import("@typesafe-ai/sdk").SystemOneRequest<Q>,
      {
        ...(request.timeout !== undefined && { timeout: request.timeout }),
        ...(request.extraHeaders !== undefined && {
          headers: request.extraHeaders,
        }),
      },
    );
  }

  async models(): Promise<ModelCard[]> {
    const client = await this.getClient();
    return client.models.list();
  }

  stream<Q extends Questions>(
    options: SystemOneStreamOptions<Q>,
  ): DecisionStream<Q> {
    return new DecisionStream(this, options);
  }

  get apiKey(): string {
    return (
      this.clientConfig.apiKey ||
      (typeof process !== "undefined"
        ? process.env.TYPESAFE_API_KEY
        : undefined) ||
      "EMPTY"
    );
  }
}

export class DecisionStream<Q extends Questions> {
  private socket?: WebSocket;
  private nextId = 0;
  private readonly pending = new Map<
    string,
    {
      resolve: (value: SystemOneResult<Q>) => void;
      reject: (reason: Error) => void;
    }
  >();
  private readonly inflight = new Set<Promise<SystemOneResult<Q>>>();
  private dispatchQueue: Promise<void> = Promise.resolve();
  private opening?: Promise<this>;
  private closing = false;
  private state?: EntryType;
  readonly options: SystemOneStreamOptions<Q>;
  limits?: Record<string, unknown>;
  stats?: Record<string, unknown>;

  constructor(
    private readonly resource: SystemOne,
    options: SystemOneStreamOptions<Q>,
  ) {
    if (
      options.concurrency !== undefined &&
      (!Number.isInteger(options.concurrency) || options.concurrency < 1)
    ) {
      throw new RangeError("concurrency must be a positive integer");
    }
    this.options = options;
    this.state = options.state;
  }

  get url(): string {
    return `${this.resource.baseUrl.replace(/^http/, "ws")}/ws`;
  }

  async open(): Promise<this> {
    if (this.closing) throw new Error("System One session is closed");
    if (this.opening) return this.opening;
    if (this.options.transport !== "ws" || this.limits) return this;
    this.opening = this.openSocket();
    try {
      return await this.opening;
    } finally {
      this.opening = undefined;
    }
  }

  private async openSocket(): Promise<this> {
    let Socket: typeof WebSocket;
    try {
      ({ default: Socket } = await import("ws"));
    } catch {
      throw new DependencyError(
        "WebSocket client is not installed",
        "missing_dependency",
        "Install it with `npm install ws`",
      );
    }
    const socket = new Socket(this.url, {
      headers: { Authorization: `Bearer ${this.resource.apiKey}` },
    });
    this.socket = socket;
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("System One session timed out")),
          this.options.timeout ?? 10000,
        );
        const accept = (): void => {
          clearTimeout(timer);
          resolve();
        };
        const refuse = (error: Error): void => {
          clearTimeout(timer);
          reject(error);
        };
        socket.once("open", () =>
          socket.send(
            JSON.stringify({
              type: "session.create",
              model: this.options.model ?? this.resource.model,
              questions: this.options.questions,
              ...(this.options.steps !== undefined && {
                steps: this.options.steps,
              }),
              ...(this.options.samples !== undefined && {
                samples: this.options.samples,
              }),
              ...(this.options.reasoningEffort !== undefined && {
                reasoning_effort: this.options.reasoningEffort,
              }),
              max_inflight: Math.min(this.options.concurrency ?? 2, 8),
            }),
          ),
        );
        socket.on("message", (raw) => {
          const event = JSON.parse(raw.toString()) as Record<string, unknown>;
          if (event.type === "session.created") {
            this.limits = event;
            accept();
          } else if (event.type === "session.stats") {
            this.stats = event;
          } else if (event.type === "decision") {
            const key = String(event.id);
            const waiter = this.pending.get(key);
            this.pending.delete(key);
            waiter?.resolve({
              model: String(this.limits?.model ?? this.resource.model),
              answers: event.answers,
              usage: event.usage,
            } as SystemOneResult<Q>);
          } else if (event.type === "error") {
            const error = new Error(String(event.message));
            refuse(error);
            this.fail(error);
          }
        });
        socket.once("error", (error) => {
          refuse(error);
          this.fail(error);
        });
        socket.once("close", () => {
          refuse(new Error("System One session closed"));
          this.fail(new Error("System One session closed"));
        });
      });
      if (this.state !== undefined && this.state !== "") {
        await new Promise<void>((resolve, reject) => {
          socket.send(
            JSON.stringify({ type: "state", state: this.state }),
            (error) => (error ? reject(error) : resolve()),
          );
        });
      }
    } catch (error) {
      socket.close();
      this.socket = undefined;
      this.limits = undefined;
      throw error;
    }
    return this;
  }

  private fail(error: Error): void {
    for (const waiter of this.pending.values()) waiter.reject(error);
    this.pending.clear();
  }

  async send(
    content: SystemOneContent,
    state?: EntryType,
  ): Promise<SystemOneResult<Q>> {
    if (this.options.transport !== "ws") {
      return this.resource.decide({
        state: state ?? this.options.state ?? "",
        questions: this.options.questions,
        model: this.options.model,
        content,
        steps: this.options.steps,
        samples: this.options.samples,
        reasoningEffort: this.options.reasoningEffort,
        timeout: this.options.timeout,
      });
    }
    if (this.closing) throw new Error("System One session is closed");
    if (!this.socket || !this.limits)
      throw new Error("Open the WebSocket stream before sending a read");
    const dispatch = this.dispatchQueue.then(async () => {
      if (this.closing) throw new Error("System One session is closed");
      if (state !== undefined && state !== this.state) {
        await Promise.all(
          [...this.inflight].map((read) =>
            read.then(
              () => undefined,
              () => undefined,
            ),
          ),
        );
        if (this.closing) throw new Error("System One session is closed");
        await new Promise<void>((resolve, reject) => {
          this.socket!.send(
            JSON.stringify({ type: "state", state }),
            (error) => (error ? reject(error) : resolve()),
          );
        });
        this.state = state;
      }
      if (this.closing) throw new Error("System One session is closed");
      const id = String(this.nextId++);
      const response = new Promise<SystemOneResult<Q>>((resolve, reject) => {
        const timer = this.options.timeout
          ? setTimeout(() => {
              this.pending.delete(id);
              reject(new Error("System One decision timed out"));
            }, this.options.timeout)
          : undefined;
        this.pending.set(id, {
          resolve: (value) => {
            if (timer) clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            if (timer) clearTimeout(timer);
            reject(error);
          },
        });
        this.socket!.send(
          JSON.stringify({ type: "decide", id, content }),
          (error) => {
            if (error) {
              const waiter = this.pending.get(id);
              this.pending.delete(id);
              waiter?.reject(error);
            }
          },
        );
      });
      this.inflight.add(response);
      response.then(
        () => this.inflight.delete(response),
        () => this.inflight.delete(response),
      );
      return { response };
    });
    this.dispatchQueue = dispatch.then(
      () => undefined,
      () => undefined,
    );
    return (await dispatch).response;
  }

  async *map(
    contents: Iterable<SystemOneContent> | AsyncIterable<SystemOneContent>,
  ): AsyncGenerator<SystemOneResult<Q>> {
    const active: Promise<{ result?: SystemOneResult<Q>; error?: Error }>[] =
      [];
    const concurrency = Math.min(
      this.options.concurrency ?? 2,
      Number(this.limits?.max_inflight ?? Infinity),
    );
    for await (const content of contents) {
      active.push(
        this.send(content).then(
          (result) => ({ result }),
          (error) => ({ error }),
        ),
      );
      if (active.length >= concurrency) {
        const settled = await active.shift()!;
        if (settled.error) throw settled.error;
        yield settled.result!;
      }
    }
    while (active.length) {
      const settled = await active.shift()!;
      if (settled.error) throw settled.error;
      yield settled.result!;
    }
  }

  async close(): Promise<void> {
    this.closing = true;
    if (this.opening) {
      try {
        await this.opening;
      } catch {
        return;
      }
    }
    await this.dispatchQueue;
    if (!this.socket) return;
    const socket = this.socket;
    this.socket = undefined;
    if (socket.readyState === socket.OPEN) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          socket.terminate();
          resolve();
        }, this.options.timeout ?? 10000);
        socket.once("close", () => {
          clearTimeout(timer);
          resolve();
        });
        socket.send(JSON.stringify({ type: "session.close" }));
      });
    } else {
      socket.close();
    }
  }
}
