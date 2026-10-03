/**
 * System One — typed, calibrated decisions served on the VLM Run gateway.
 *
 * `POST {gateway}/typesafe/v1/systemone` answers named questions about text,
 * JSON, images and PDFs by reading the model's own distribution over each
 * answer slot: nothing is generated and nothing is parsed, so an answer can
 * never be off-schema.
 *
 * The route is wire-compatible with TypeSafe's Jev API. Media, `steps` and
 * `samples` are gateway extensions carried as `content` — the OpenAI content
 * parts a caller already sends to chat completions, read after the state.
 */

import * as dns from "dns";
import * as fs from "fs";
import * as nodePath from "path";
import axios from "axios";
import { APIRequestor, Client } from "./base_requestor";
import { InputError } from "./exceptions";
import { TYPESAFE_BASE_URL_ENV, gatewayBaseUrl, readEnv } from "../constants";

/** The route's default engine. `models()` lists what the gateway serves. */
export const SYSTEMONE_MODEL = "google/diffusiongemma-26b-a4b-it";

/** The gateway mounts TypeSafe's paths under this prefix. */
export const TYPESAFE_PREFIX = "typesafe";

/** Images per read; a PDF's rasterised pages share this budget. */
export const MAX_IMAGES = 8;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Only a PDF's first pages are read. */
export const MAX_PDF_PAGES = 8;
/** Default read timeout in milliseconds. */
export const DEFAULT_READ_TIMEOUT_MS = 120000;

export const MAX_CHOICE_OPTIONS = 128;
export const MAX_SCORE_LEVELS = 10;
export const MIN_CHOICE_OPTIONS = 2;
export const MIN_SCORE_LEVELS = 2;

export const QUESTION_TYPES = ["noul", "choice", "score"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Thinking budget before the answer. Generative engines only. */
export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high";
export const REASONING_EFFORTS: readonly ReasoningEffort[] = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
];

/** Vision budget: `high` reads at 280 vision tokens, `auto` and `low` at 70. */
export type ImageDetail = "auto" | "low" | "high";

/** Opt out of the private-address guard for an internal image host. */
export const ALLOW_PRIVATE_URLS_ENV = "VLMRUN_ALLOW_PRIVATE_URLS";
export const MAX_REDIRECTS = 5;
export const DEFAULT_STREAM_CONCURRENCY = 4;

const CRITERIA_ALIAS: Record<string, string> = {
  choice: "options",
  score: "levels",
};
const NOUL_OUTCOME_ALIAS: Record<string, string> = { yes: "true", no: "false" };
const COMMON_KEYS = new Set(["id", "type", "instructions", "criteria"]);

/** A choice option: a bare label, or a label with a description. */
export type ChoiceOption = string | { name: string; description?: string | null };

/** A question in the friendly or wire dialect. */
export interface SystemOneQuestion {
  id?: string;
  type: QuestionType;
  instructions?: string | null;
  /** Wire spelling of `options` (choice), `levels` (score) or noul outcomes. */
  criteria?: any;
  /** Choice options: a list of labels/objects or a label->description map. */
  options?: ChoiceOption[] | Record<string, string | null>;
  /** Score levels, ordered lowest first. */
  levels?: any[];
}

/** Questions as a list (each with an `id`), a mapping of id to question, or either wrapped in `{ questions }`. */
export type SystemOneQuestions =
  | SystemOneQuestion[]
  | Record<string, SystemOneQuestion>
  | { questions: SystemOneQuestion[] | Record<string, SystemOneQuestion> };

/** A wire question object, as sent to the route. */
export interface WireQuestion {
  type: QuestionType;
  instructions?: string;
  criteria?: any;
}

/** An image input: a local path, an http(s) URL, a data URL, or raw bytes. */
export type SystemOneImage = string | Buffer | Uint8Array;

export interface NoulAnswer {
  type: "noul";
  /** P(yes), from 0 to 1. */
  noul: number;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ScoreAnswer {
  type: "score";
  /** Expected level, `sum(i * p_i)`. */
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

export type SystemOneAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface SystemOneUsage {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: {
    cached_tokens?: number;
    image_tokens?: number;
    text_tokens?: number;
  };
  reads?: number;
  cost?: number;
  [key: string]: any;
}

/** Where a read's wall-clock time went, in milliseconds. */
export interface RequestTimings {
  /** Local work: encoding media and normalizing questions. */
  prepMs: number;
  /** Around the HTTP call itself. */
  apiMs: number;
  totalMs: number;
}

export interface SystemOneResponse {
  model: string;
  /** Answers keyed by question id. */
  answers: Record<string, SystemOneAnswer>;
  usage?: SystemOneUsage;
  /** The `noul` answers, keyed by question id. */
  nouls: Record<string, NoulAnswer>;
  /** The `choice` answers, keyed by question id. */
  choices: Record<string, ChoiceAnswer>;
  /** The `score` answers, keyed by question id. */
  scores: Record<string, ScoreAnswer>;
  /** The `x-typesafe-request-id` (or `x-request-id`) response header. */
  requestId?: string;
  timings?: RequestTimings;
}

export interface SystemOneModel {
  id: string;
  [key: string]: any;
}

export interface SystemOneListModelsResponse {
  object?: string;
  data: SystemOneModel[];
  [key: string]: any;
}

/** Options shared by every read. */
export interface SystemOneReadOptions {
  /** Model override. */
  model?: string;
  /** Vision budget for this request: auto, low or high. */
  detail?: ImageDetail;
  /** Denoise steps per read (1-8); the contract's default is 1. */
  steps?: number;
  /** Noise draws to average (1-32). Every draw is billed. */
  samples?: number;
  /** Thinking budget before the answer; a diffusion engine rejects it with a 422. */
  reasoningEffort?: ReasoningEffort;
  /** Per-call timeout in milliseconds (also bounds remote image fetches). */
  timeout?: number;
  /** Extra top-level body fields, merged last (wins). */
  extraBody?: Record<string, any>;
}

export interface SystemOneRequestParams extends SystemOneReadOptions {
  /** Text, a JSON object or an array the questions are about. */
  state: any;
  /** Questions in either dialect (see {@link normalizeQuestions}). */
  questions: SystemOneQuestions;
  /** Up to 8 images (paths, http(s) URLs, data URLs or bytes). */
  images?: SystemOneImage[];
  /** One PDF path, http(s) URL or data URL; its first pages are read. */
  document?: string;
  /** Extra text parts, read after the state. */
  text?: string | string[];
}

export interface SystemOneDecideParams extends SystemOneRequestParams {
  /** Extra request headers. */
  extraHeaders?: Record<string, string>;
}

export interface SystemOneStreamParams extends SystemOneReadOptions {
  questions: SystemOneQuestions;
  /** State every read is about. Overridable per `send`. */
  state?: any;
  /** Reads in flight at once. */
  concurrency?: number;
}

/** One read in a stream, with where its input came from. */
export interface FrameDecision {
  /** Position in the stream (or the frame's own `index`), counting from 0. */
  index: number;
  /** Presentation time in seconds for a timed frame, else null. */
  timestampS: number | null;
  response: SystemOneResponse;
}

/** A frame-like input carrying its own place on a timeline. */
export interface SampledFrame {
  frame: SystemOneImage;
  index?: number;
  timestampS?: number;
}

export interface SystemOneOptions {
  /** Explicit `/typesafe` root. Falls back to `TYPESAFE_BASE_URL`, then the gateway-derived URL. */
  baseUrl?: string;
  /** Gateway base URL the route is mounted beside. */
  gatewayUrl?: string;
  /** Default model; falls back to `TYPESAFE_DEFAULT_MODEL`, then {@link SYSTEMONE_MODEL}. */
  model?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
}

/**
 * TypeSafe base URL derived from a gateway URL:
 * `https://gateway.vlm.run/v1` -> `https://gateway.vlm.run/typesafe`.
 */
export function typesafeBaseUrl(gatewayUrl?: string | null): string {
  let root = gatewayBaseUrl(gatewayUrl);
  if (root.endsWith("/v1")) {
    root = root.slice(0, -"/v1".length);
  }
  return `${root.replace(/\/+$/, "")}/${TYPESAFE_PREFIX}`;
}

function specError(message: string, suggestion: string): InputError {
  return new InputError(message, "question_spec", suggestion);
}

function isPlainObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array)
  );
}

function normalizeChoiceCriteria(raw: any, where: string): Record<string, any> {
  let criteria: Record<string, any>;
  if (Array.isArray(raw)) {
    criteria = {};
    raw.forEach((option, index) => {
      if (typeof option === "string") {
        criteria[option] = null;
      } else if (isPlainObject(option) && "name" in option) {
        criteria[String(option.name)] = option.description ?? null;
      } else {
        throw specError(
          `${where}: option ${index} must be a label string or {"name": ..., "description": ...}`,
          'Write options as ["a", "b"] or [{"name": "a", "description": "..."}]',
        );
      }
    });
  } else if (isPlainObject(raw)) {
    criteria = { ...raw };
  } else {
    throw specError(
      `${where}: options must be a list of labels or a mapping of label to description`,
      'e.g. "options": ["billing", "technical", "sales"]',
    );
  }
  const count = Object.keys(criteria).length;
  if (count < MIN_CHOICE_OPTIONS || count > MAX_CHOICE_OPTIONS) {
    throw specError(
      `${where}: a choice needs ${MIN_CHOICE_OPTIONS}-${MAX_CHOICE_OPTIONS} options; got ${count}`,
      "Use a noul question for a yes/no decision.",
    );
  }
  return criteria;
}

function normalizeScoreCriteria(raw: any, where: string): any[] {
  if (!Array.isArray(raw)) {
    throw specError(
      `${where}: levels must be an ordered list of level descriptions`,
      'e.g. "levels": ["Calm", "Frustrated", "Very angry"]',
    );
  }
  if (raw.length < MIN_SCORE_LEVELS || raw.length > MAX_SCORE_LEVELS) {
    throw specError(
      `${where}: a score needs ${MIN_SCORE_LEVELS}-${MAX_SCORE_LEVELS} levels; got ${raw.length}`,
      "Collapse adjacent levels, or use a choice question.",
    );
  }
  return [...raw];
}

function normalizeNoulCriteria(raw: any, where: string): Record<string, any> {
  if (!isPlainObject(raw)) {
    throw specError(
      `${where}: criteria must be an object describing the true and false outcomes`,
      'e.g. "criteria": {"true": "Needs action today", "false": "Can wait"}',
    );
  }
  const criteria: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    const lowered = key.toLowerCase();
    const name = NOUL_OUTCOME_ALIAS[lowered] ?? lowered;
    if (name !== "true" && name !== "false") {
      throw specError(
        `${where}: unknown noul outcome '${key}'`,
        'A noul describes only "true"/"yes" and "false"/"no".',
      );
    }
    criteria[name] = value;
  }
  return criteria;
}

function normalizeQuestion(raw: any, where: string): WireQuestion {
  if (!isPlainObject(raw)) {
    throw specError(`${where}: a question must be an object`, 'e.g. {"type": "noul"}');
  }
  const kind = raw.type;
  if (!QUESTION_TYPES.includes(kind)) {
    throw specError(
      `${where}: type must be one of ${QUESTION_TYPES.join(", ")}; got ${JSON.stringify(kind)}`,
      "noul is yes/no, choice picks a label, score reads an ordered rubric.",
    );
  }

  const alias = CRITERIA_ALIAS[kind];
  const allowed = new Set(COMMON_KEYS);
  if (alias) allowed.add(alias);
  const unknown = Object.keys(raw).filter((k) => !allowed.has(k));
  if (unknown.length) {
    const aliases = new Set(Object.values(CRITERIA_ALIAS));
    const wrongAlias = unknown.some((k) => aliases.has(k));
    throw specError(
      `${where}: unknown key(s) ${unknown.sort().map((k) => `'${k}'`).join(", ")}`,
      wrongAlias
        ? `A ${kind} question uses "${alias ?? "criteria"}".`
        : `Allowed keys: ${[...allowed].sort().join(", ")}.`,
    );
  }

  const question: WireQuestion = { type: kind };
  if (raw.instructions !== undefined && raw.instructions !== null) {
    question.instructions = raw.instructions;
  }

  let criteria = raw.criteria ?? null;
  if (alias && raw[alias] !== undefined && raw[alias] !== null) {
    if (criteria !== null) {
      throw specError(
        `${where}: set either "${alias}" or "criteria", not both`,
        `"${alias}" is the friendly spelling of "criteria".`,
      );
    }
    criteria = raw[alias];
  }

  if (kind === "choice") {
    if (criteria === null) {
      throw specError(
        `${where}: a choice question needs options`,
        'e.g. "options": ["billing", "technical", "sales"]',
      );
    }
    question.criteria = normalizeChoiceCriteria(criteria, where);
  } else if (kind === "score") {
    if (criteria === null) {
      throw specError(
        `${where}: a score question needs levels`,
        'e.g. "levels": ["Calm", "Frustrated", "Very angry"]',
      );
    }
    question.criteria = normalizeScoreCriteria(criteria, where);
  } else if (criteria !== null) {
    question.criteria = normalizeNoulCriteria(criteria, where);
  }
  return question;
}

/**
 * Normalize either question dialect into the wire mapping of id to question.
 *
 * Accepts a list of questions each carrying an `id`, the wire mapping of id
 * to question, or either wrapped in `{ questions }`. `options` (choice) and
 * `levels` (score) are accepted as the friendly spellings of `criteria`.
 *
 * @throws {InputError} If the spec is empty, malformed, or uses an unknown key.
 */
export function normalizeQuestions(spec: any): Record<string, WireQuestion> {
  if (isPlainObject(spec) && Object.keys(spec).length === 1 && "questions" in spec) {
    spec = spec.questions;
  }

  const questions: Record<string, WireQuestion> = {};
  if (Array.isArray(spec)) {
    spec.forEach((raw, index) => {
      const where = `questions[${index}]`;
      if (!isPlainObject(raw) || !raw.id) {
        throw specError(
          `${where}: every question in a list needs an "id"`,
          "The id is the key its answer comes back under.",
        );
      }
      const name = String(raw.id);
      if (name in questions) {
        throw specError(
          `${where}: duplicate question id '${name}'`,
          "Answers are keyed by id, so each must be unique.",
        );
      }
      const { id: _id, ...body } = raw;
      questions[name] = normalizeQuestion(body, `${where} "${name}"`);
    });
  } else if (isPlainObject(spec)) {
    for (const [name, raw] of Object.entries(spec)) {
      const where = `questions.${name}`;
      let body = raw;
      if (isPlainObject(raw) && "id" in raw) {
        if (String(raw.id) !== name) {
          throw specError(
            `${where}: "id" is '${raw.id}' but the key is '${name}'`,
            "In the mapping form the key is the id; drop the id field.",
          );
        }
        const { id: _id, ...rest } = raw;
        body = rest;
      }
      questions[name] = normalizeQuestion(body, where);
    }
  } else {
    throw specError(
      "questions must be a list of questions or a mapping of id to question",
      'e.g. [{"id": "is_urgent", "type": "noul"}]',
    );
  }

  if (!Object.keys(questions).length) {
    throw specError("no questions were given", "Ask at least one question.");
  }
  return questions;
}

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** The image MIME type identified by magic bytes, or null. */
export function sniffImageMime(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "image/png";
  }
  const ascii = (start: number, end: number) =>
    Buffer.from(b.subarray(start, end)).toString("latin1");
  if (b.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function dataUrl(content: Uint8Array, mime: string): string {
  return `data:${mime};base64,${Buffer.from(content).toString("base64")}`;
}

function decodeDataUrl(raw: string): Buffer {
  const comma = raw.indexOf(",");
  const header = comma === -1 ? raw : raw.slice(0, comma);
  const payload = comma === -1 ? "" : raw.slice(comma + 1).replace(/\s+/g, "");
  if (!header.includes(";base64")) {
    throw new InputError(
      "an image data URL must be base64-encoded",
      "input_error",
      "Use data:image/...;base64,<payload>.",
    );
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload) || payload.length % 4 !== 0) {
    throw new InputError(
      "image data is not valid base64",
      "input_error",
      "Re-encode the image, or pass it as a local path.",
    );
  }
  return Buffer.from(payload, "base64");
}

function parseIPv4(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  return nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? nums : null;
}

/** Whether an IP address is loopback, private, link-local, reserved, multicast or unspecified. */
export function isNonPublicAddress(address: string): boolean {
  let ip = address.toLowerCase();
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) ip = mapped[1];
  const v4 = parseIPv4(ip);
  if (v4) {
    const [a, b, c] = v4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  return (
    ip === "::" ||
    ip === "::1" ||
    /^f[cd]/.test(ip) ||
    /^fe[89ab]/.test(ip) ||
    /^ff/.test(ip) ||
    ip.startsWith("2001:db8") ||
    ip.startsWith("64:ff9b:")
  );
}

async function guardFetchable(url: string): Promise<void> {
  if (readEnv(ALLOW_PRIVATE_URLS_ENV)) return;
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    host = "";
  }
  if (!host) {
    throw new InputError(`'${url}' has no host to fetch from`, "input_error", "Pass an absolute http(s) URL.");
  }
  let resolved: dns.LookupAddress[];
  try {
    resolved = await dns.promises.lookup(host, { all: true });
  } catch {
    throw new InputError(
      `cannot resolve '${host}'`,
      "input_error",
      "Check the URL, or pass the image as a local path.",
    );
  }
  for (const { address } of resolved) {
    if (isNonPublicAddress(address)) {
      throw new InputError(
        `refusing to fetch '${url}': ${host} resolves to the non-public address ${address}`,
        "input_error",
        `Set ${ALLOW_PRIVATE_URLS_ENV}=1 to allow internal hosts, or pass the image as a local path.`,
      );
    }
  }
}

function tooLarge(source: string, size?: number): InputError {
  return new InputError(
    size === undefined
      ? `image at '${source}' is larger than the ${MAX_IMAGE_BYTES} byte limit`
      : `image '${source}' is ${size} bytes; the limit is ${MAX_IMAGE_BYTES}`,
    "input_error",
    "Downscale the image before sending it.",
  );
}

/** Fetch an image, bounded in size, guarding every redirect hop. */
async function fetchImage(url: string, timeout: number): Promise<Buffer> {
  let target = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await guardFetchable(target);
    let response;
    try {
      response = await axios.get(target, {
        responseType: "arraybuffer",
        maxRedirects: 0,
        maxContentLength: MAX_IMAGE_BYTES,
        timeout,
        validateStatus: () => true,
      });
    } catch (error: any) {
      if (error?.message?.includes("maxContentLength")) throw tooLarge(url);
      throw new InputError(
        `could not fetch '${url}': ${error?.message ?? error}`,
        "input_error",
        "Check the URL, or pass the image as a local path.",
      );
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers?.location;
      if (!location) {
        throw new InputError(
          `'${target}' redirected without a location`,
          "input_error",
          "Pass the file as a local path.",
        );
      }
      target = new URL(location, target).toString();
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new InputError(
        `could not fetch '${url}': HTTP ${response.status}`,
        "input_error",
        "Check the URL, or pass the image as a local path.",
      );
    }
    return Buffer.from(response.data);
  }
  throw new InputError(
    `'${url}' redirected more than ${MAX_REDIRECTS} times`,
    "input_error",
    "Pass the file as a local path.",
  );
}

function expandHome(p: string): string {
  if (p === "~" || p.startsWith("~/")) {
    const home = readEnv("HOME") ?? readEnv("USERPROFILE") ?? "";
    return nodePath.join(home, p.slice(1));
  }
  return p;
}

async function readImage(source: SystemOneImage, timeout: number): Promise<[Buffer, string]> {
  if (typeof source !== "string") {
    return [Buffer.from(source), "<bytes>"];
  }
  if (source.startsWith("data:")) return [decodeDataUrl(source), source.slice(0, 32) + "..."];
  if (isHttpUrl(source)) return [await fetchImage(source, timeout), source];
  const filePath = expandHome(source);
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    stat = undefined as any;
  }
  if (!stat || !stat.isFile()) {
    throw new InputError(
      `image '${source}' is not a file`,
      "input_error",
      "Pass a local path, an http(s) URL, or a data: URL.",
    );
  }
  if (stat.size > MAX_IMAGE_BYTES) throw tooLarge(source, stat.size);
  return [await fs.promises.readFile(filePath), source];
}

async function imagePart(source: SystemOneImage, detail: ImageDetail, timeout: number) {
  const [content, label] = await readImage(source, timeout);
  if (content.length > MAX_IMAGE_BYTES) throw tooLarge(label, content.length);
  const mime = sniffImageMime(content.subarray(0, 16));
  if (!mime || !IMAGE_MIME_TYPES.has(mime)) {
    throw new InputError(
      `${label} is not a recognized image`,
      "input_error",
      "This route reads JPEG, PNG, WebP and GIF.",
    );
  }
  return { type: "image_url", image_url: { url: dataUrl(content, mime), detail } };
}

async function filePart(source: string, detail: ImageDetail) {
  if (isHttpUrl(source) || source.startsWith("data:")) {
    return { type: "file", file: { file_data: source, detail } };
  }
  const filePath = expandHome(source);
  let content: Buffer;
  try {
    content = await fs.promises.readFile(filePath);
  } catch {
    throw new InputError(
      `document '${source}' is not a file`,
      "input_error",
      "Pass a local .pdf path or an http(s) URL.",
    );
  }
  if (content.subarray(0, 4).toString("latin1") !== "%PDF") {
    throw new InputError(
      `document '${source}' is not a PDF`,
      "input_error",
      "This route reads one PDF; convert other formats first.",
    );
  }
  return {
    type: "file",
    file: {
      filename: nodePath.basename(filePath),
      file_data: dataUrl(content, "application/pdf"),
      detail,
    },
  };
}

/**
 * Assemble the `content` parts that carry a read's media: the document first,
 * then images (always inlined as data URLs), then extra text parts.
 *
 * @returns The `content` list, or null when there is no media.
 * @throws {InputError} Too many images, an unsupported type, or a missing file.
 */
export async function buildContent(params: {
  images?: SystemOneImage[];
  document?: string;
  text?: string | string[];
  detail?: ImageDetail;
  /** Milliseconds allowed for fetching a remote image. */
  timeout?: number;
} = {}): Promise<Record<string, any>[] | null> {
  const { images = [], document, detail = "auto", timeout = 30000 } = params;
  if (images.length > MAX_IMAGES) {
    throw new InputError(
      `${images.length} images; the limit is ${MAX_IMAGES}`,
      "input_error",
      "Split the inputs across requests.",
    );
  }
  const parts: Record<string, any>[] = [];
  if (document !== undefined && document !== null) {
    parts.push(await filePart(document, detail));
  }
  for (const image of images) {
    parts.push(await imagePart(image, detail, timeout));
  }
  const texts = typeof params.text === "string" ? [params.text] : params.text ?? [];
  for (const item of texts) {
    if (item) parts.push({ type: "text", text: item });
  }
  return parts.length ? parts : null;
}

function toResponse(
  data: any,
  headers: Record<string, any> = {},
  timings?: RequestTimings,
): SystemOneResponse {
  const answers: Record<string, SystemOneAnswer> = data?.answers ?? {};
  const nouls: Record<string, NoulAnswer> = {};
  const choices: Record<string, ChoiceAnswer> = {};
  const scores: Record<string, ScoreAnswer> = {};
  for (const [id, answer] of Object.entries(answers)) {
    if (answer?.type === "noul") nouls[id] = answer;
    else if (answer?.type === "choice") choices[id] = answer;
    else if (answer?.type === "score") scores[id] = answer;
  }
  const requestId = headers["x-typesafe-request-id"] ?? headers["x-request-id"];
  return {
    ...data,
    model: data?.model,
    answers,
    usage: data?.usage,
    nouls,
    choices,
    scores,
    ...(requestId ? { requestId } : {}),
    ...(timings ? { timings } : {}),
  };
}

/**
 * Typed decisions on `POST {gateway}/typesafe/v1/systemone`.
 *
 * @example
 * ```typescript
 * const result = await client.gateway.systemone.decide({
 *   state: "Invoice #44 was charged twice, I need this fixed today",
 *   questions: [
 *     { id: "is_urgent", type: "noul", instructions: "Is this time-sensitive?" },
 *     { id: "department", type: "choice", options: ["billing", "technical", "sales"] },
 *   ],
 * });
 * result.nouls.is_urgent.noul;       // 0.91
 * result.choices.department.choice;  // "billing"
 * ```
 */
export class SystemOne {
  private client: Client;
  private _baseUrl: string;
  private _model: string;
  private _timeout?: number;
  private _requestor: APIRequestor | null = null;

  constructor(client: Client, options: SystemOneOptions = {}) {
    this.client = client;
    this._baseUrl = (
      options.baseUrl ||
      readEnv(TYPESAFE_BASE_URL_ENV) ||
      typesafeBaseUrl(options.gatewayUrl)
    ).replace(/\/+$/, "");
    this._model = options.model || readEnv("TYPESAFE_DEFAULT_MODEL") || SYSTEMONE_MODEL;
    this._timeout = options.timeout;
  }

  /** TypeSafe base URL (without trailing slash). */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /** Default model used for reads. */
  get model(): string {
    return this._model;
  }

  private get requestor(): APIRequestor {
    if (!this._requestor) {
      this._requestor = new APIRequestor({
        apiKey: this.client.apiKey || readEnv("TYPESAFE_API_KEY") || "",
        baseURL: this._baseUrl,
        timeout: this._timeout ?? DEFAULT_READ_TIMEOUT_MS,
        maxRetries: this.client.maxRetries,
      });
    }
    return this._requestor;
  }

  /**
   * The request body {@link decide} would send, without sending it. State,
   * model and questions come first, then everything else last-write-wins.
   *
   * @throws {InputError} If the questions or media are malformed.
   */
  async buildRequest(params: SystemOneRequestParams): Promise<Record<string, any>> {
    const questions = normalizeQuestions(params.questions);
    const extra: Record<string, any> = {};
    const content = await buildContent({
      images: params.images,
      document: params.document,
      text: params.text,
      detail: params.detail ?? "auto",
      timeout: params.timeout ?? this._timeout ?? 30000,
    });
    if (content) extra.content = content;
    if (params.steps !== undefined && params.steps !== null) extra.steps = params.steps;
    if (params.samples !== undefined && params.samples !== null) extra.samples = params.samples;
    if (params.reasoningEffort !== undefined && params.reasoningEffort !== null) {
      if (!REASONING_EFFORTS.includes(params.reasoningEffort)) {
        throw new InputError(
          `reasoningEffort '${params.reasoningEffort}' is not one of ${REASONING_EFFORTS.join(", ")}`,
          "input_error",
          "Only a generative engine reasons; see SystemOne.models().",
        );
      }
      extra.reasoning_effort = params.reasoningEffort;
    }
    if (params.extraBody) Object.assign(extra, params.extraBody);
    return {
      state: params.state,
      model: params.model || this._model,
      questions,
      ...extra,
    };
  }

  /**
   * Answer named questions about a state, optionally with media.
   *
   * @returns Answers keyed by question id (also grouped as `nouls`,
   *   `choices` and `scores`), plus the model, token usage and timings.
   * @throws {InputError} If the questions or media are malformed.
   * @throws {APIError} If the gateway returns an unsuccessful response.
   */
  async decide(params: SystemOneDecideParams): Promise<SystemOneResponse> {
    const started = Date.now();
    const body = await this.buildRequest(params);
    const prepMs = Date.now() - started;
    const apiStarted = Date.now();
    const [data, , headers] = await this.requestor.request<any>(
      "POST",
      "v1/systemone",
      undefined,
      body,
      undefined,
      { headers: params.extraHeaders, timeout: params.timeout },
    );
    const now = Date.now();
    return toResponse(data, headers, {
      prepMs,
      apiMs: now - apiStarted,
      totalMs: now - started,
    });
  }

  /**
   * Open a stream that reads many decisions against one question spec — a
   * video's frames, a camera, a queue. The questions are normalized once, up
   * front, so a malformed question fails here rather than on the first frame.
   *
   * @example
   * ```typescript
   * const stream = client.gateway.systemone.stream({
   *   questions: [{ id: "is_open", type: "noul" }],
   *   state: "Is the door open?",
   * });
   * for await (const decision of stream.map(["f0.jpg", "f1.jpg"])) {
   *   console.log(decision.index, decision.response.nouls.is_open.noul);
   * }
   * ```
   */
  stream(params: SystemOneStreamParams): DecisionStream {
    return new DecisionStream(this, params);
  }

  /** List the models this route serves. */
  async models(): Promise<SystemOneListModelsResponse> {
    const [data] = await this.requestor.request<SystemOneListModelsResponse>(
      "GET",
      "v1/models",
    );
    return data;
  }
}

/**
 * Reads many decisions against one question spec over HTTP. Inputs go out as
 * they arrive, at most `concurrency` reads overlap, and results come back in
 * input order.
 */
export class DecisionStream {
  private resource: SystemOne;
  private _questions: Record<string, WireQuestion>;
  private _state: any;
  private _concurrency: number;
  private _options: SystemOneReadOptions;
  private _count = 0;

  constructor(resource: SystemOne, params: SystemOneStreamParams) {
    const { questions, state = "", concurrency = DEFAULT_STREAM_CONCURRENCY, ...options } = params;
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new InputError(
        `concurrency must be at least 1; got ${concurrency}`,
        "input_error",
        "Pass 1 to read one at a time.",
      );
    }
    this.resource = resource;
    this._questions = normalizeQuestions(questions);
    this._state = state;
    this._concurrency = concurrency;
    this._options = options;
  }

  /** Reads issued on this stream so far. */
  get count(): number {
    return this._count;
  }

  /** The normalized question spec every read in this stream asks. */
  get questions(): Record<string, WireQuestion> {
    return { ...this._questions };
  }

  private describe(item: SystemOneImage | SampledFrame, position: number) {
    if (typeof item === "string" || item instanceof Uint8Array) {
      return { index: position, timestampS: null as number | null, image: item };
    }
    return {
      index: Number.isInteger(item.index) ? (item.index as number) : position,
      timestampS: typeof item.timestampS === "number" ? item.timestampS : null,
      image: item.frame,
    };
  }

  /** Read one input; `state` overrides the stream's for this read only. */
  async send(
    image: SystemOneImage | SampledFrame,
    options: { state?: any } = {},
  ): Promise<SystemOneResponse> {
    this._count += 1;
    return this.resource.decide({
      ...this._options,
      state: options.state === undefined ? this._state : options.state,
      questions: this._questions,
      images: [this.describe(image, 0).image],
    });
  }

  /**
   * Read many inputs lazily, overlapping up to `concurrency` reads, yielding
   * in input order. Stopping iteration early stops issuing reads.
   */
  async *map(
    images: Iterable<SystemOneImage | SampledFrame> | AsyncIterable<SystemOneImage | SampledFrame>,
  ): AsyncGenerator<FrameDecision> {
    const pending: { index: number; timestampS: number | null; promise: Promise<SystemOneResponse> }[] = [];
    let position = 0;
    try {
      for await (const item of images as AsyncIterable<SystemOneImage | SampledFrame>) {
        while (pending.length >= this._concurrency) {
          const done = pending.shift()!;
          yield { index: done.index, timestampS: done.timestampS, response: await done.promise };
        }
        const { index, timestampS, image } = this.describe(item, position++);
        const promise = this.send(image);
        // Settled later in order; avoid unhandled rejections in the meantime.
        promise.catch(() => undefined);
        pending.push({ index, timestampS, promise });
      }
      while (pending.length) {
        const done = pending.shift()!;
        yield { index: done.index, timestampS: done.timestampS, response: await done.promise };
      }
    } finally {
      pending.length = 0;
    }
  }
}
