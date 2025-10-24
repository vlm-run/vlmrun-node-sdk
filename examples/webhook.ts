import express from "express";
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  WebhookPayload,
} from "../src/utils/webhook";

const app = express();

// Webhook endpoint with signature verification
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const rawBody = req.body;
  const signature = req.headers["X-VLMRUN-Signature"] as string;
  const secret = process.env.VLM_WEBHOOK_SECRET || "your-webhook-secret-here";

  console.log("Received webhook request");
  console.log("Signature header:", signature);

  // Method 1: Use parseWebhookPayload (recommended)
  const payload = parseWebhookPayload(rawBody, signature, secret);
  if (!payload) {
    console.log("❌ Invalid webhook signature or payload");
    return res.status(401).json({ error: "Invalid signature or payload" });
  }

  console.log("✅ Webhook signature verified");
  console.log("Payload:", JSON.stringify(payload, null, 2));

  // Process the webhook based on status
  handleWebhookPayload(payload);

  res.json({ status: "success" });
});

// Alternative endpoint using manual verification
app.post(
  "/webhook-manual",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const rawBody = req.body;
    const signature = req.headers["X-VLMRUN-Signature"] as string;
    const secret = process.env.VLM_WEBHOOK_SECRET || "your-webhook-secret-here";

    // Method 2: Manual verification
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      console.log("❌ Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    console.log("✅ Webhook signature verified");

    // Parse the payload manually
    try {
      const payload = JSON.parse(rawBody.toString("utf8")) as WebhookPayload;
      console.log("Payload:", JSON.stringify(payload, null, 2));

      handleWebhookPayload(payload);

      res.json({ status: "success" });
    } catch (error) {
      console.log("❌ Failed to parse webhook payload:", error);
      res.status(400).json({ error: "Invalid JSON payload" });
    }
  }
);

function handleWebhookPayload(payload: WebhookPayload) {
  switch (payload.status) {
    case "completed":
      console.log(`🎉 Prediction ${payload.id} completed successfully`);
      console.log("Response:", payload.response);
      // Handle successful completion
      break;

    case "failed":
      console.log(`❌ Prediction ${payload.id} failed`);
      console.log("Error:", payload.error);
      // Handle failure
      break;

    case "cancelled":
      console.log(`⏹️ Prediction ${payload.id} was cancelled`);
      // Handle cancellation
      break;

    default:
      console.log(
        `❓ Unknown status for prediction ${payload.id}: ${payload.status}`
      );
  }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
  console.log(`📝 Endpoints:`);
  console.log(`   POST /webhook - Webhook with parseWebhookPayload`);
  console.log(`   POST /webhook-manual - Webhook with manual verification`);
  console.log(`🔐 Make sure to set VLM_WEBHOOK_SECRET environment variable`);
});

export default app;
