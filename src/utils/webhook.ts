import * as crypto from "crypto";

/**
 * Verify webhook HMAC signature from VLM Run
 * @param rawBody - Raw request body as Buffer
 * @param signatureHeader - X-VLMRUN-Signature header value
 * @param secret - Your webhook secret from VLM Run dashboard
 * @returns True if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const receivedSig = signatureHeader.replace("sha256=", "");

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch (error) {
    return false;
  }
}

/**
 * Webhook payload interface for VLM Run predictions
 */
export interface WebhookPayload {
  id: string;
  status: "completed" | "failed" | "cancelled";
  response?: any;
  error?: string;
  created_at: string;
  completed_at?: string;
  failed_at?: string;
  cancelled_at?: string;
}

/**
 * Parse and verify webhook payload from VLM Run
 * @param rawBody - Raw request body as Buffer
 * @param signatureHeader - X-VLMRUN-Signature header value
 * @param secret - Your webhook secret from VLM Run dashboard
 * @returns Parsed webhook payload if signature is valid, null otherwise
 */
export function parseWebhookPayload(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string
): WebhookPayload | null {
  if (!verifyWebhookSignature(rawBody, signatureHeader, secret)) {
    return null;
  }

  try {
    return JSON.parse(rawBody.toString("utf8")) as WebhookPayload;
  } catch (error) {
    return null;
  }
}
