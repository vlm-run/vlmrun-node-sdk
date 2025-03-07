import { config } from "dotenv";

import { VlmRun } from "../../../src/index";
import { z } from "zod";

jest.setTimeout(60000);

describe("Integration: Image Predictions", () => {
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
      expect(result.response.invoice_id).toContain("9999999");
      expect(result.response.invoice_issue_date).toBe("2023-11-11");

      expect(result.response.customer).toBe("Fred Davis");
      expect(result.response.customer_email).toBe("info@invoice.com");
      expect(result.response.customer_phone).toContain("4567");
      expect(result.response.customer_billing_address.street).toContain(
        "1335 Martin Luther King Jr Ave"
      );
      expect(result.response.customer_billing_address.city).toBe("Dunedin");
      expect(result.response.customer_billing_address.state).toBe("FL");
      expect(result.response.customer_billing_address.postal_code).toContain(
        "34698"
      );
      expect(result.response.customer_shipping_address.street).toContain(
        "249 Windward Passage"
      );
      expect(result.response.customer_shipping_address.city).toContain(
        "Clearwater"
      );
      expect(result.response.customer_shipping_address.state).toContain("FL");
      expect(result.response.customer_shipping_address.postal_code).toContain(
        "33767"
      );
      expect(result.response.items.length).toBe(3);

      expect(result.response.subtotal).toBe(400);
      expect(result.response.total).toBe(400);
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
      expect(response.invoice_id).toBe("9999999");
      expect(response.total).toBe(400);
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
      expect(response.invoice_id).toBe("9999999");
      expect(response.total).toBe(400);
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
      expect(result.response.invoice_number).toContain("9999999");
      expect(result.response.total_amount).toBe(400);

      expect(result.response).not.toHaveProperty("invoice_issue_date");
      expect(result.response).not.toHaveProperty("customer");
      expect(result.response).not.toHaveProperty("customer_email");
      expect(result.response).not.toHaveProperty("customer_phone");
      expect(result.response).not.toHaveProperty("customer_billing_address");
      expect(result.response).not.toHaveProperty("customer_shipping_address");
      expect(result.response).not.toHaveProperty("items");
    });

    describe("schema", () => {
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
