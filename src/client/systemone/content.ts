import { readFileSync, statSync } from "fs";
import { basename, resolve } from "path";
import { isIP } from "net";
import { lookup } from "dns";
import { promisify } from "util";
import axios from "axios";
import { InputError } from "../exceptions";
import type { ContentPart, ImageDetail } from "./types";

const lookupAsync = promisify(lookup);
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOW_PRIVATE_URLS_ENV = "VLMRUN_ALLOW_PRIVATE_URLS";
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const DATA_URL_RE = /^data:([^;,]+);base64,(.+)$/s;

export function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  return null;
}

export function dataUrl(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split(".").map((part) => Number(part));
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80") ||
      lower.startsWith("ff")
    );
  }
  return false;
}

async function guardFetchable(url: string): Promise<void> {
  if (process.env[ALLOW_PRIVATE_URLS_ENV]) {
    return;
  }
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new InputError(
      `${JSON.stringify(url)} has no host to fetch from`,
      "input_error",
      "Pass an absolute http(s) URL."
    );
  }
  if (isPrivateAddress(hostname)) {
    throw new InputError(
      `refusing to fetch ${JSON.stringify(url)}: ${hostname} is a non-public address`,
      "input_error",
      `Set ${ALLOW_PRIVATE_URLS_ENV}=1 to allow internal hosts, or pass the image as a local path.`
    );
  }
  try {
    const resolved = await lookupAsync(hostname, { all: true });
    const records = Array.isArray(resolved) ? resolved : [resolved];
    for (const record of records) {
      if (isPrivateAddress(record.address)) {
        throw new InputError(
          `refusing to fetch ${JSON.stringify(url)}: ${hostname} resolves to the non-public address ${record.address}`,
          "input_error",
          `Set ${ALLOW_PRIVATE_URLS_ENV}=1 to allow internal hosts, or pass the image as a local path.`
        );
      }
    }
  } catch (error) {
    if (error instanceof InputError) {
      throw error;
    }
    throw new InputError(
      `cannot resolve ${JSON.stringify(hostname)}`,
      "input_error",
      "Check the URL, or pass the image as a local path."
    );
  }
}

async function fetchImage(url: string, timeoutMs: number): Promise<Uint8Array> {
  await guardFetchable(url);
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: timeoutMs,
    maxRedirects: 0,
    maxContentLength: MAX_IMAGE_BYTES,
  });
  const buffer = Buffer.from(response.data);
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new InputError(
      `image at ${JSON.stringify(url)} is larger than the ${MAX_IMAGE_BYTES} byte limit`,
      "input_error",
      "Downscale the image before sending it."
    );
  }
  return buffer;
}

function decodeDataUrl(raw: string): Uint8Array {
  const match = DATA_URL_RE.exec(raw);
  if (!match) {
    throw new InputError(
      "an image data URL must be base64-encoded",
      "input_error",
      "Use data:image/...;base64,."
    );
  }
  return Buffer.from(match[2] ?? "", "base64");
}

async function readImage(source: string, timeoutMs: number): Promise<Uint8Array> {
  if (source.startsWith("data:")) {
    return decodeDataUrl(source);
  }
  if (isHttpUrl(source)) {
    return fetchImage(source, timeoutMs);
  }
  const filePath = resolve(source);
  let info;
  try {
    info = statSync(filePath);
  } catch {
    throw new InputError(
      `image ${JSON.stringify(source)} is not a file`,
      "input_error",
      "Pass a local path, an http(s) URL, or a data: URL."
    );
  }
  if (!info.isFile()) {
    throw new InputError(
      `image ${JSON.stringify(source)} is not a file`,
      "input_error",
      "Pass a local path, an http(s) URL, or a data: URL."
    );
  }
  if (info.size > MAX_IMAGE_BYTES) {
    throw new InputError(
      `image ${JSON.stringify(source)} is ${info.size} bytes; the limit is ${MAX_IMAGE_BYTES}`,
      "input_error",
      "Downscale the image before sending it."
    );
  }
  return readFileSync(filePath);
}

async function imagePart(
  source: string,
  detail: ImageDetail,
  timeoutMs: number
): Promise<ContentPart> {
  const content = await readImage(source, timeoutMs);
  const sniffed = sniffMime(content.subarray(0, 16));
  if (sniffed === null || !IMAGE_MIME_TYPES.has(sniffed)) {
    throw new InputError(
      `${source} is not a recognized image`,
      "input_error",
      "This route reads JPEG, PNG, WebP and GIF."
    );
  }
  return {
    type: "image_url",
    image_url: { url: dataUrl(content, sniffed), detail },
  };
}

async function filePart(source: string, detail: ImageDetail): Promise<ContentPart> {
  if (isHttpUrl(source) || source.startsWith("data:")) {
    return { type: "file", file: { file_data: source, detail } };
  }
  const filePath = resolve(source);
  let content: Buffer;
  try {
    content = readFileSync(filePath);
  } catch {
    throw new InputError(
      `document ${JSON.stringify(source)} is not a file`,
      "input_error",
      "Pass a local .pdf path or an http(s) URL."
    );
  }
  if (sniffMime(content.subarray(0, 4)) !== "application/pdf") {
    throw new InputError(
      `document ${JSON.stringify(source)} is not a PDF`,
      "input_error",
      "This route reads one PDF; convert other formats first."
    );
  }
  return {
    type: "file",
    file: {
      filename: basename(filePath),
      file_data: dataUrl(content, "application/pdf"),
      detail,
    },
  };
}

export async function buildContent(options: {
  images?: readonly string[];
  document?: string;
  text?: string | readonly string[];
  detail?: ImageDetail;
  timeoutMs?: number;
}): Promise<ContentPart[] | undefined> {
  const detail = options.detail ?? "auto";
  const timeoutMs = options.timeoutMs ?? 30_000;
  const parts: ContentPart[] = [];
  const images = options.images ? Array.from(options.images) : [];
  if (images.length > MAX_IMAGES) {
    throw new InputError(
      `${images.length} images; the limit is ${MAX_IMAGES}`,
      "input_error",
      "Split the inputs across requests."
    );
  }
  for (const image of images) {
    parts.push(await imagePart(image, detail, timeoutMs));
  }
  if (options.document) {
    parts.push(await filePart(options.document, detail));
  }
  const texts =
    options.text === undefined
      ? []
      : typeof options.text === "string"
        ? [options.text]
        : Array.from(options.text);
  for (const text of texts) {
    parts.push({ type: "text", text });
  }
  return parts.length === 0 ? undefined : parts;
}
