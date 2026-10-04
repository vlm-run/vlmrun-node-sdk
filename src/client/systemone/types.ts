export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type EntryType = string | { [key: string]: JsonValue } | JsonValue[] | null;

export type Description = EntryType;
export type QuestionType = "noul" | "choice" | "score";
export type ImageDetail = "auto" | "low" | "high";
export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high";
export type Transport = "http" | "ws";

export interface NoulQuestion {
  type: "noul";
  instructions?: EntryType;
  criteria?: { true?: EntryType; false?: EntryType } | null;
}

export type ChoiceCriteria = { [label: string]: Description };

export interface ChoiceQuestion<T extends ChoiceCriteria = ChoiceCriteria> {
  type: "choice";
  instructions?: EntryType;
  criteria: T;
}

export type ScoreCriteria = readonly [EntryType, EntryType, ...EntryType[]];

export interface ScoreQuestion<T extends ScoreCriteria = ScoreCriteria> {
  type: "score";
  instructions?: EntryType;
  criteria: T;
}

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface Questions {
  [name: string]: Question;
}

export interface NoulResponse {
  readonly type: "noul";
  readonly noul: number;
}

export interface ChoiceResponse<T extends ChoiceCriteria = ChoiceCriteria> {
  readonly type: "choice";
  readonly choice: keyof T & string;
  readonly confidence: number;
  readonly probabilities: { readonly [label in keyof T]: number };
}

export interface ScoreResponse {
  readonly type: "score";
  readonly score: number;
  readonly confidence: number;
  readonly legend: { readonly [score: number]: EntryType };
  readonly probabilities: { readonly [score: number]: number };
}

export type ResultFor<T> = T extends NoulQuestion
  ? NoulResponse
  : T extends ScoreQuestion
    ? ScoreResponse
    : T extends ChoiceQuestion<infer C>
      ? ChoiceResponse<C>
      : never;

export interface Usage {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly input_tokens_details?: {
    cached_tokens?: number;
    image_tokens?: number;
    text_tokens?: number;
  };
  readonly reads?: number;
  readonly cost?: number;
}

export interface ModelCard {
  readonly name: string;
  readonly description?: string;
  readonly release_date?: string;
  readonly released?: string;
}

export interface ListModelsResponse {
  readonly object?: string;
  readonly data: ModelCard[];
  readonly default?: string;
}

export interface RequestTimings {
  prepMs: number;
  apiMs: number | null;
  totalMs: number;
}

export interface WireQuestion {
  type: QuestionType;
  instructions?: EntryType;
  criteria?: unknown;
}

export type WireQuestions = Record<string, WireQuestion>;

export interface ContentImagePart {
  type: "image_url";
  image_url: { url: string; detail: ImageDetail };
}

export interface ContentFilePart {
  type: "file";
  file: { file_data: string; filename?: string; detail: ImageDetail };
}

export interface ContentTextPart {
  type: "text";
  text: string;
}

export type ContentPart = ContentImagePart | ContentFilePart | ContentTextPart;

export interface SessionLimits {
  type?: string;
  session_id?: string;
  model?: string;
  questions?: unknown;
  max_inflight?: number;
  max_frame_bytes?: number;
  expires_in?: number;
  [key: string]: unknown;
}

export interface SessionStats {
  type?: string;
  session_id?: string;
  decisions?: number;
  reads?: number;
  cost?: number;
  [key: string]: unknown;
}
