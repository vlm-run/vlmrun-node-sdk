import crypto from "crypto";

/**
 * Verify webhook HMAC signature
 * 
 * This function verifies that a webhook request came from VLM Run by validating
 * the HMAC signature in the X-VLMRun-Signature header. The signature is computed
 * using SHA256 HMAC with your webhook secret.
 * 
 * @param rawBody - Raw request body as Buffer or string
 * @param signatureHeader - X-VLMRun-Signature header value (format: "sha256=<hex>")
 * @param secret - Your webhook secret from VLM Run dashboard
 * @returns True if the signature is valid, false otherwise
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { verifyWebhook } from 'vlmrun';
 * 
 * app.post('/webhook',
 *   express.raw({ type: 'application/json' }),
 *   (req, res) => {
 *     const rawBody = req.body;
 *     const signature = req.headers['x-vlmrun-signature'];
 *     const secret = process.env.WEBHOOK_SECRET;
 *     
 *     if (!verifyWebhook(rawBody, signature, secret)) {
 *       return res.status(401).json({ error: 'Invalid signature' });
 *     }
 *     
 *     // Process webhook
 *     const data = JSON.parse(rawBody.toString('utf8'));
 *     res.json({ status: 'success' });
 *   }
 * );
 * ```
 */
export function verifyWebhook(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  if (!secret) {
    return false;
  }

  const receivedSig = signatureHeader.replace("sha256=", "");

  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody, "utf8");

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(bodyBuffer)
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
