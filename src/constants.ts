/** Default VLM Run API base URL. */
export const DEFAULT_BASE_URL = "https://api.vlm.run/v1";

/** Environment variable overriding the API base URL. */
export const VLMRUN_BASE_URL_ENV = "VLMRUN_BASE_URL";

/** Environment variable holding the VLM Run API key. */
export const VLMRUN_API_KEY_ENV = "VLMRUN_API_KEY";

/** Default OpenAI-compatible model gateway base URL. */
export const DEFAULT_GATEWAY_URL = "https://gateway.vlm.run/v1";

/** Preferred environment variable overriding the gateway base URL. */
export const VLMRUN_GATEWAY_BASE_URL_ENV = "VLMRUN_GATEWAY_BASE_URL";

/**
 * The gateway's original variable name. Still honoured, after
 * {@link VLMRUN_GATEWAY_BASE_URL_ENV}, so existing setups keep working.
 */
export const VLMRUN_GATEWAY_URL_ENV = "VLMRUN_GATEWAY_URL";

/** Environment variable overriding the System One (`/typesafe`) root. */
export const TYPESAFE_BASE_URL_ENV = "TYPESAFE_BASE_URL";

/** Read an environment variable, returning `undefined` when empty or unavailable. */
export function readEnv(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const value = process.env?.[name];
  return value ? value : undefined;
}

/**
 * Resolve the gateway's base URL: an explicit argument, then
 * `VLMRUN_GATEWAY_BASE_URL`, then the older `VLMRUN_GATEWAY_URL`, then
 * {@link DEFAULT_GATEWAY_URL}.
 *
 * @param baseUrl - Explicit base URL override.
 * @returns The gateway base URL, without a trailing slash.
 */
export function gatewayBaseUrl(baseUrl?: string | null): string {
  return (
    baseUrl ||
    readEnv(VLMRUN_GATEWAY_BASE_URL_ENV) ||
    readEnv(VLMRUN_GATEWAY_URL_ENV) ||
    DEFAULT_GATEWAY_URL
  ).replace(/\/+$/, "");
}
