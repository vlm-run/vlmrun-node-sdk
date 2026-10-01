import { InputError } from "../exceptions";
import { DecisionResult, StreamedDecision } from "./result";
import type { ImageDetail, Questions, ReasoningEffort, WireQuestions } from "./types";
import type { SystemOne } from "./client";

export interface StreamOptions {
  questions: WireQuestions;
  state?: unknown;
  model?: string;
  detail?: ImageDetail;
  steps?: number;
  samples?: number;
  reasoningEffort?: ReasoningEffort;
  timeoutMs?: number;
  extraBody?: Record<string, unknown>;
  concurrency?: number;
}

export interface DecisionInput {
  image?: string;
  state?: unknown;
  timestampS?: number;
}

const DEFAULT_STREAM_CONCURRENCY = 4;

function asInput(value: string | DecisionInput): DecisionInput {
  return typeof value === "string" ? { image: value } : value;
}

export class DecisionStream<Q extends Questions = Questions> {
  protected readonly resource: SystemOne;
  protected readonly questions: WireQuestions;
  protected readonly options: StreamOptions & { detail: ImageDetail; concurrency: number };
  protected opened = false;
  protected count = 0;

  constructor(resource: SystemOne, options: StreamOptions) {
    if ((options.concurrency ?? DEFAULT_STREAM_CONCURRENCY) < 1) {
      throw new InputError(
        "concurrency must be at least 1",
        "input_error",
        "Use 1 for serial reads, or a higher value to overlap them."
      );
    }
    this.resource = resource;
    this.questions = options.questions;
    this.options = {
      ...options,
      detail: options.detail ?? "auto",
      concurrency: options.concurrency ?? DEFAULT_STREAM_CONCURRENCY,
    };
  }

  get isOpen(): boolean {
    return this.opened;
  }

  async open(): Promise<this> {
    this.opened = true;
    return this;
  }

  async close(): Promise<void> {
    this.opened = false;
  }

  protected checkOpen(): void {
    if (!this.opened) {
      throw new InputError(
        "the decision stream is not open",
        "input_error",
        "Await client.gateway.systemone.stream(...) before sending reads."
      );
    }
  }

  async send(input: string | DecisionInput): Promise<StreamedDecision<Q>> {
    this.checkOpen();
    const item = asInput(input);
    const response = await this.read(item);
    const index = this.count;
    this.count += 1;
    return {
      index,
      input: item.image ?? "",
      timestampS: item.timestampS,
      response,
    };
  }

  async *map(
    inputs: Iterable<string | DecisionInput> | AsyncIterable<string | DecisionInput>
  ): AsyncGenerator<StreamedDecision<Q>> {
    this.checkOpen();
    const window = this.options.concurrency;
    const iterator = asyncIterator(inputs);
    const pending = new Map<number, Promise<StreamedDecision<Q>>>();
    let nextIndex = 0;
    let emitIndex = 0;
    let done = false;

    const fill = async (): Promise<void> => {
      while (!done && pending.size < window) {
        const step = await iterator.next();
        if (step.done) {
          done = true;
          return;
        }
        const index = nextIndex;
        nextIndex += 1;
        const item = asInput(step.value);
        const read = this.read(item).then((response) => ({
          index,
          input: item.image ?? "",
          timestampS: item.timestampS,
          response,
        }));
        // Reads finish out of order. Observe each one now so a later read
        // failing while an earlier one is awaited is not an unhandled
        // rejection; the error still surfaces when its index is awaited.
        read.catch(() => undefined);
        pending.set(index, read);
      }
    };

    await fill();
    while (pending.size > 0) {
      const current = pending.get(emitIndex);
      if (current === undefined) {
        throw new InputError(
          "decision stream lost an in-flight read",
          "input_error",
          "This is an SDK bug; please report it."
        );
      }
      const decision = await current;
      pending.delete(emitIndex);
      emitIndex += 1;
      this.count = emitIndex;
      yield decision;
      await fill();
    }
  }

  protected async read(input: DecisionInput): Promise<DecisionResult<Q>> {
    return this.resource.decide<Q>({
      state: input.state ?? this.options.state ?? "",
      questions: this.questions,
      model: this.options.model,
      images: input.image ? [input.image] : undefined,
      detail: this.options.detail,
      steps: this.options.steps,
      samples: this.options.samples,
      reasoningEffort: this.options.reasoningEffort,
      timeoutMs: this.options.timeoutMs,
      extraBody: this.options.extraBody,
    });
  }
}

async function* asyncIterator<T>(
  source: Iterable<T> | AsyncIterable<T>
): AsyncGenerator<T> {
  if (isAsyncIterable(source)) {
    for await (const item of source) {
      yield item;
    }
    return;
  }
  for (const item of source) {
    yield item;
  }
}

function isAsyncIterable<T>(
  value: Iterable<T> | AsyncIterable<T>
): value is AsyncIterable<T> {
  return Symbol.asyncIterator in (value as AsyncIterable<T>);
}
