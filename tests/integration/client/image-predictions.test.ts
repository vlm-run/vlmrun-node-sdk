import { config } from "dotenv";

import { VlmRun } from "../../../src/index";
import { z } from "zod";

jest.setTimeout(60000);

describe("Integration: Image Predictions (API-aligned)", () => {
  let client: VlmRun;

  beforeAll(() => {
    config({ path: ".env.test" });

    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY as string,
      baseURL: process.env.TEST_BASE_URL as string,
    });
  });

  describe("ImagePredictions", () => {
    it("should generate image predictions with default options", async () => {
      const testImagePath = "tests/integration/assets/invoice.jpg";

      const result = await client.image.generate({
        images: [testImagePath],
        model: "vlm-1",
        domain: "document.invoice",
      });

      expect(result).toHaveProperty("id");
      expect(result.status).toBe("completed");
      expect(result.response).toHaveProperty("invoice_id");
      expect(result.response).toHaveProperty("invoice_issue_date");

      // API returns customer_name (and customer_* fields), not a single "customer" string
      expect(result.response).toHaveProperty("customer_name");
      expect(typeof (result.response as any).customer_name).toBe("string");
      expect(result.response).toHaveProperty("customer_email");
      expect(result.response).toHaveProperty("customer_phone");
      expect(result.response).toHaveProperty("customer_billing_address");
      expect(result.response.customer_billing_address).toHaveProperty("street");
      expect(result.response.customer_billing_address).toHaveProperty("city");
      expect(result.response.customer_billing_address).toHaveProperty("state");
      expect(result.response.customer_billing_address).toHaveProperty(
        "postal_code"
      );
      expect(result.response).toHaveProperty("customer_shipping_address");
      expect(result.response.customer_shipping_address).toHaveProperty(
        "street"
      );
      expect(result.response.customer_shipping_address).toHaveProperty("city");
      expect(result.response.customer_shipping_address).toHaveProperty("state");
      expect(result.response.customer_shipping_address).toHaveProperty(
        "postal_code"
      );
      expect(result.response).toHaveProperty("items");
      expect(result.response).toHaveProperty("subtotal");
      // API may return total_amount and/or total
      expect(
        "total_amount" in result.response || "total" in result.response
      ).toBe(true);
    });

    it("should generate image predictions from path with zod schema", async () => {
      const testImagePath = "tests/integration/assets/invoice.jpg";

      const schema = z.object({
        invoice_id: z.string(),
        invoice_issue_date: z.string(),
        customer: z.string(),
        customer_email: z.string(),
        customer_phone: z.string(),
        total: z.number(),
      });

      const result = await client.image.generate({
        images: [testImagePath],
        model: "vlm-1",
        domain: "document.invoice",
        config: {
          responseModel: schema,
        },
      });

      const response = result.response as z.infer<typeof schema>;
      expect(response).toHaveProperty("invoice_id");
      expect(response).toHaveProperty("total");
    });

    it("should generate image predictions from url with zod schema", async () => {
      const imageUrl =
        "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/invoice_1.jpg";

      const schema = z.object({
        invoice_id: z.string(),
        total: z.number(),
      });

      const result = await client.image.generate({
        images: [imageUrl],
        model: "vlm-1",
        domain: "document.invoice",
        config: {
          responseModel: schema,
        },
      });

      const response = result.response as z.infer<typeof schema>;
      expect(response).toHaveProperty("invoice_id");
      expect(response).toHaveProperty("total");
    });

    it("should generate image predictions with custom options", async () => {
      const imageUrl =
        "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/invoice_1.jpg";

      const result = await client.image.generate({
        urls: [imageUrl],
        model: "vlm-1",
        domain: "document.invoice",
        config: {
          jsonSchema: {
            type: "object",
            properties: {
              invoice_number: { type: "string" },
              total_amount: { type: "number" },
            },
          },
        },
      });

      expect(result).toHaveProperty("id");
      expect(result.status).toBe("completed");
      expect(result.response).toHaveProperty("invoice_number");
      expect(result.response).toHaveProperty("total_amount");

      expect(result.response).not.toHaveProperty("invoice_issue_date");
      expect(result.response).not.toHaveProperty("customer");
      expect(result.response).not.toHaveProperty("customer_email");
      expect(result.response).not.toHaveProperty("customer_phone");
      expect(result.response).not.toHaveProperty("customer_billing_address");
      expect(result.response).not.toHaveProperty("customer_shipping_address");
      expect(result.response).not.toHaveProperty("items");
    });

    // Skipped: schema endpoints do not exist in FastAPI Swagger Docs
    describe.skip("schema", () => {
      it("should generate schema from image path", async () => {
        const testImagePath = "tests/integration/assets/invoice.jpg";

        const result = await client.image.schema({
          images: [testImagePath],
        });

        expect(result).toHaveProperty("id");
        expect(result.status).toBe("completed");
        expect(result.response).toHaveProperty("json_schema");
        expect(result.response).toHaveProperty("schema_version");
        expect(result.response).toHaveProperty("schema_hash");
        expect(result.response).toHaveProperty("domain");
        expect(result.response).toHaveProperty("description");

        // The schema should be for an invoice document
        expect(result.response.json_schema).toHaveProperty("properties");
      });
    });

    // Schema validation: SDK throws before calling the API (no schema endpoint required)
    describe("schema validation", () => {
      it("should throw an error when neither images nor urls are provided", async () => {
        await expect(client.image.schema({})).rejects.toThrow(
          "Either `images` or `urls` must be provided"
        );
      });

      it("should throw an error when both images and urls are provided", async () => {
        const testImagePath = "tests/integration/assets/invoice.jpg";
        const imageUrl =
          "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/invoice_1.jpg";

        await expect(
          client.image.schema({
            images: [testImagePath],
            urls: [imageUrl],
          })
        ).rejects.toThrow("Only one of `images` or `urls` can be provided");
      });
    });
  });
});
