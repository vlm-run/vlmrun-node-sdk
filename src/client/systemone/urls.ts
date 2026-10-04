export const DEFAULT_GATEWAY_URL = "https://gateway.vlm.run/v1";
export const TYPESAFE_PREFIX = "typesafe";
export const TYPESAFE_WEBSOCKET_PATH = "/ws";
export const TYPESAFE_BASE_URL_ENV = "TYPESAFE_BASE_URL";
export const TYPESAFE_API_KEY_ENV = "TYPESAFE_API_KEY";
export const TYPESAFE_DEFAULT_MODEL_ENV = "TYPESAFE_DEFAULT_MODEL";
export const VLMRUN_GATEWAY_BASE_URL_ENV = "VLMRUN_GATEWAY_BASE_URL";
export const VLMRUN_GATEWAY_URL_ENV = "VLMRUN_GATEWAY_URL";
export const SYSTEMONE_MODEL = "google/diffusiongemma-26b-a4b-it";
export const DEFAULT_READ_TIMEOUT_MS = 120_000;
export const REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
] as const;

/**
 * Gateway `/v1` root. Prefers an explicit URL, then
 * `VLMRUN_GATEWAY_BASE_URL`, then the older `VLMRUN_GATEWAY_URL`.
 */
export function gatewayBaseUrl(baseUrl?: string): string {
  return (
    baseUrl ||
    env(VLMRUN_GATEWAY_BASE_URL_ENV) ||
    env(VLMRUN_GATEWAY_URL_ENV) ||
    DEFAULT_GATEWAY_URL
  ).replace(/\/+$/, "");
}

export function env(name: string): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

/**
 * TypeSafe root derived from a gateway URL.
 * `https://gateway.vlm.run/v1` → `https://gateway.vlm.run/typesafe`.
 */
export function typesafeBaseUrl(gatewayUrl: string): string {
  let root = gatewayUrl.replace(/\/+$/, "");
  if (root.endsWith("/v1")) {
    root = root.slice(0, -"/v1".length);
  }
  return `${root.replace(/\/+$/, "")}/${TYPESAFE_PREFIX}`;
}

/**
 * `wss://` session URL, derived from the `/typesafe` root so pointing
 * the client at another deployment moves both HTTP and the socket.
 */
export function typesafeWebsocketUrl(baseUrl: string): string {
  const root = baseUrl.replace(/\/+$/, "");
  const separator = "://";
  const index = root.indexOf(separator);
  if (index === -1) {
    return `wss://${root}${TYPESAFE_WEBSOCKET_PATH}`;
  }
  const scheme = root.slice(0, index);
  const rest = root.slice(index + separator.length);
  return `${scheme === "https" ? "wss" : "ws"}://${rest}${TYPESAFE_WEBSOCKET_PATH}`;
}

export function resolveTypesafeRoot(options: {
  baseUrl?: string;
  gatewayUrl?: string;
} = {}): string {
  return (
    options.baseUrl ||
    env(TYPESAFE_BASE_URL_ENV) ||
    typesafeBaseUrl(options.gatewayUrl || gatewayBaseUrl())
  ).replace(/\/+$/, "");
}
