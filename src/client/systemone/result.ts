import type {
  ChoiceResponse,
  NoulResponse,
  Questions,
  RequestTimings,
  ResultFor,
  ScoreResponse,
  Usage,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function coerceAnswer(answer: unknown): unknown {
  if (!isRecord(answer) || answer.type !== "score") {
    return answer;
  }
  const coerced: Record<string, unknown> = { ...answer };
  for (const field of ["legend", "probabilities"]) {
    const value = coerced[field];
    if (isRecord(value)) {
      const next: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) {
        next[/^-?\d+$/.test(key) ? Number(key) : key] = item;
      }
      coerced[field] = next;
    }
  }
  return coerced;
}

export class DecisionResult<Q extends Questions = Questions> {
  readonly model: string;
  readonly answers: { readonly [K in keyof Q]: ResultFor<Q[K]> };
  readonly usage: Usage;
  readonly timings: RequestTimings;
  readonly rawUsage: Record<string, unknown>;

  constructor(options: {
    model: string;
    answers: Record<string, unknown>;
    usage?: Usage | Record<string, unknown>;
    timings?: Partial<RequestTimings>;
  }) {
    this.model = options.model;
    const answers: Record<string, unknown> = {};
    for (const [name, answer] of Object.entries(options.answers)) {
      answers[name] = coerceAnswer(answer);
    }
    this.answers = answers as { readonly [K in keyof Q]: ResultFor<Q[K]> };
    const usage = (options.usage ?? {}) as Usage;
    this.usage = {
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      input_tokens_details: usage.input_tokens_details,
      reads: usage.reads,
      cost: usage.cost,
    };
    this.rawUsage = { ...(options.usage ?? {}) };
    this.timings = {
      prepMs: options.timings?.prepMs ?? 0,
      apiMs: options.timings?.apiMs ?? null,
      totalMs: options.timings?.totalMs ?? 0,
    };
  }

  get nouls(): Record<string, NoulResponse> {
    return this.byType("noul") as Record<string, NoulResponse>;
  }

  get choices(): Record<string, ChoiceResponse> {
    return this.byType("choice") as Record<string, ChoiceResponse>;
  }

  get scores(): Record<string, ScoreResponse> {
    return this.byType("score") as Record<string, ScoreResponse>;
  }

  private byType(type: "noul" | "choice" | "score"): Record<string, unknown> {
    const selected: Record<string, unknown> = {};
    for (const [name, answer] of Object.entries(this.answers)) {
      if (isRecord(answer) && answer.type === type) {
        selected[name] = answer;
      }
    }
    return selected;
  }
}

export interface StreamedDecision<Q extends Questions = Questions> {
  index: number;
  input: string;
  timestampS?: number;
  response: DecisionResult<Q>;
}
