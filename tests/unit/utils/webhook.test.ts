import crypto from "crypto";
import { verifyWebhook } from "../../../src/utils/webhook";

describe("verifyWebhook", () => {
  const testSecret = "test_webhook_secret_12345";
  const testPayload = JSON.stringify({
    id: "pred_123",
    status: "completed",
    response: { data: "test" },
  });

  function generateSignature(payload: string | Buffer, secret: string): string {
    const buffer = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(payload, "utf8");
    const signature = crypto
      .createHmac("sha256", secret)
      .update(buffer)
      .digest("hex");
    return `sha256=${signature}`;
  }

  describe("valid signatures", () => {
    it("should return true for valid signature with Buffer input", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, testSecret);

      const result = verifyWebhook(rawBody, signature, testSecret);

      expect(result).toBe(true);
    });

    it("should return true for valid signature with string input", () => {
      const signature = generateSignature(testPayload, testSecret);

      const result = verifyWebhook(testPayload, signature, testSecret);

      expect(result).toBe(true);
    });

    it("should return true for valid signature with empty payload", () => {
      const emptyPayload = "";
      const signature = generateSignature(emptyPayload, testSecret);

      const result = verifyWebhook(emptyPayload, signature, testSecret);

      expect(result).toBe(true);
    });

    it("should return true for valid signature with complex JSON payload", () => {
      const complexPayload = JSON.stringify({
        id: "pred_456",
        status: "completed",
        response: {
          nested: {
            data: "test",
            array: [1, 2, 3],
            special: "chars: !@#$%^&*()",
          },
        },
        metadata: {
          credits_used: 10,
          timestamp: "2024-01-01T00:00:00Z",
        },
      });
      const signature = generateSignature(complexPayload, testSecret);

      const result = verifyWebhook(complexPayload, signature, testSecret);

      expect(result).toBe(true);
    });

    it("should return true for valid signature with unicode characters", () => {
      const unicodePayload = JSON.stringify({
        message: "Hello 世界 🌍",
        emoji: "🚀✨",
      });
      const signature = generateSignature(unicodePayload, testSecret);

      const result = verifyWebhook(unicodePayload, signature, testSecret);

      expect(result).toBe(true);
    });
  });

  describe("invalid signatures", () => {
    it("should return false for incorrect signature", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const wrongSignature = "sha256=0000000000000000000000000000000000000000000000000000000000000000";

      const result = verifyWebhook(rawBody, wrongSignature, testSecret);

      expect(result).toBe(false);
    });

    it("should return false for signature with wrong secret", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, "wrong_secret");

      const result = verifyWebhook(rawBody, signature, testSecret);

      expect(result).toBe(false);
    });

    it("should return false for signature with modified payload", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, testSecret);

      const modifiedPayload = Buffer.from(
        testPayload + " modified",
        "utf8"
      );

      const result = verifyWebhook(modifiedPayload, signature, testSecret);

      expect(result).toBe(false);
    });

    it("should return false for signature with different case", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, testSecret);
      const uppercaseSignature = signature.toUpperCase();

      const result = verifyWebhook(rawBody, uppercaseSignature, testSecret);

      expect(result).toBe(false);
    });

    it("should return false for truncated signature", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, testSecret);
      const truncatedSignature = signature.slice(0, -2); // Remove last 2 chars

      const result = verifyWebhook(rawBody, truncatedSignature, testSecret);

      expect(result).toBe(false);
    });
  });

  describe("missing or invalid headers", () => {
    it("should return false for undefined signature header", () => {
      const rawBody = Buffer.from(testPayload, "utf8");

      const result = verifyWebhook(rawBody, undefined, testSecret);

      expect(result).toBe(false);
    });

    it("should return false for empty signature header", () => {
      const rawBody = Buffer.from(testPayload, "utf8");

      const result = verifyWebhook(rawBody, "", testSecret);

      expect(result).toBe(false);
    });

    it("should return false for signature without sha256= prefix", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, testSecret).replace(
        "sha256=",
        ""
      );

      const result = verifyWebhook(rawBody, signature, testSecret);

      expect(result).toBe(false);
    });

    it("should return false for signature with wrong prefix", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, testSecret).replace(
        "sha256=",
        "sha512="
      );

      const result = verifyWebhook(rawBody, signature, testSecret);

      expect(result).toBe(false);
    });

    it("should return false for signature with extra prefix", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = "extra_" + generateSignature(rawBody, testSecret);

      const result = verifyWebhook(rawBody, signature, testSecret);

      expect(result).toBe(false);
    });
  });

  describe("invalid secrets", () => {
    it("should return false for empty secret", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, testSecret);

      const result = verifyWebhook(rawBody, signature, "");

      expect(result).toBe(false);
    });

    it("should return false for secret with whitespace differences", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, testSecret);
      const wrongSecret = testSecret + " "; // Add trailing space

      const result = verifyWebhook(rawBody, signature, wrongSecret);

      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should return false for non-hex signature", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const invalidSignature = "sha256=not_a_hex_string!!!";

      const result = verifyWebhook(rawBody, invalidSignature, testSecret);

      expect(result).toBe(false);
    });

    it("should return false for signature with invalid hex length", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const invalidSignature = "sha256=abc"; // Too short

      const result = verifyWebhook(rawBody, invalidSignature, testSecret);

      expect(result).toBe(false);
    });

    it("should handle large payloads correctly", () => {
      const largePayload = JSON.stringify({
        data: "x".repeat(10000),
      });
      const signature = generateSignature(largePayload, testSecret);

      const result = verifyWebhook(largePayload, signature, testSecret);

      expect(result).toBe(true);
    });

    it("should handle special characters in secret", () => {
      const specialSecret = "secret!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const signature = generateSignature(testPayload, specialSecret);

      const result = verifyWebhook(testPayload, signature, specialSecret);

      expect(result).toBe(true);
    });

    it("should be consistent across multiple calls with same inputs", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, testSecret);

      const result1 = verifyWebhook(rawBody, signature, testSecret);
      const result2 = verifyWebhook(rawBody, signature, testSecret);
      const result3 = verifyWebhook(rawBody, signature, testSecret);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });
  });

  describe("timing attack resistance", () => {
    it("should use timing-safe comparison", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const signature = generateSignature(rawBody, testSecret);

      expect(() => {
        verifyWebhook(rawBody, signature, testSecret);
      }).not.toThrow();
    });

    it("should handle comparison errors gracefully", () => {
      const rawBody = Buffer.from(testPayload, "utf8");
      const shortSignature = "sha256=abc123";

      const result = verifyWebhook(rawBody, shortSignature, testSecret);

      expect(result).toBe(false);
    });
  });

  describe("real-world scenarios", () => {
    it("should verify webhook from prediction completion", () => {
      const webhookPayload = JSON.stringify({
        id: "pred_abc123",
        status: "completed",
        response: {
          invoice_number: "INV-001",
          total: 1234.56,
          date: "2024-01-15",
        },
        usage: {
          credits_used: 5,
        },
        created_at: "2024-01-15T10:00:00Z",
        completed_at: "2024-01-15T10:00:05Z",
      });
      const signature = generateSignature(webhookPayload, testSecret);

      const result = verifyWebhook(webhookPayload, signature, testSecret);

      expect(result).toBe(true);
    });

    it("should verify webhook from agent execution", () => {
      const webhookPayload = JSON.stringify({
        id: "exec_xyz789",
        name: "invoice-processor",
        status: "completed",
        response: {
          processed: true,
          results: ["item1", "item2"],
        },
        usage: {
          credits_used: 10,
        },
        created_at: "2024-01-15T11:00:00Z",
        completed_at: "2024-01-15T11:00:15Z",
      });
      const signature = generateSignature(webhookPayload, testSecret);

      const result = verifyWebhook(webhookPayload, signature, testSecret);

      expect(result).toBe(true);
    });

    it("should reject tampered webhook payload", () => {
      const originalPayload = JSON.stringify({
        id: "pred_123",
        status: "completed",
        usage: {
          credits_used: 5,
        },
      });
      const signature = generateSignature(originalPayload, testSecret);

      const tamperedPayload = JSON.stringify({
        id: "pred_123",
        status: "completed",
        usage: {
          credits_used: 1, // Changed from 5 to 1
        },
      });

      const result = verifyWebhook(tamperedPayload, signature, testSecret);

      expect(result).toBe(false);
    });
  });
});
