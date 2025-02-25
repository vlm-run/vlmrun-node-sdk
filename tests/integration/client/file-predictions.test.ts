import { config } from "dotenv";

import { VlmRun } from "../../../src/index";
import { z } from "zod";

jest.setTimeout(60000);

describe("Integration: File Predictions", () => {
  let client: VlmRun;

  beforeAll(() => {
    config({ path: ".env.test" });

    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY as string,
      baseURL: process.env.TEST_BASE_URL as string,
    });
  });

  describe("DocumentPredictions", () => {
    const testFilePath = "tests/integration/assets/google_invoice.pdf";

    it("should generate document predictions using file id", async () => {
      const uploadedDocument = await client.files.upload({
        filePath: testFilePath,
        purpose: "vision",
        checkDuplicate: true,
      });

      const result = await client.document.generate({
        fileId: uploadedDocument.id,
        model: "vlm-1",
        domain: "document.invoice",
      });

      expect(result).toHaveProperty("id");
      expect(result.status).toBe("completed");
      expect(result.response.invoice_id).toContain("23413561D");
      expect(result.response.invoice_issue_date).toBe("2019-09-24");

      expect(result.response.customer).toBe("Jane Smith");
      expect(result.response.customer_billing_address.street).toContain(
        "1600 Amphitheatre Pkwy"
      );
      expect(result.response.customer_billing_address.city).toContain(
        "Mountain View"
      );
      expect(result.response.customer_billing_address.state).toBe("CA");
      expect(result.response.customer_billing_address.postal_code).toBe(
        "94043"
      );

      expect(result.response.subtotal).toBe(22379.39);
      expect(result.response).toHaveProperty("total");
      expect(result.response.tax).toBe(1767.97);
      expect(result.response.items.length).toBe(6);
    });

    it("should generate document predictions using url from custom zod schema", async () => {
      const documentUrl =
        "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";

      const schema = z.object({
        invoice_id: z.string(),
        total: z.number(),
        sub_total: z.number(),
        tax: z.number(),
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.number(),
            price: z.number(),
            total: z.number(),
          })
        ),
      });

      const result = await client.document.generate({
        url: documentUrl,
        model: "vlm-1",
        domain: "document.invoice",
        config: {
          responseModel: schema,
        },
      });

      const response = result.response as z.infer<typeof schema>;

      expect(result).toHaveProperty("id");
      expect(result.status).toBe("completed");
      expect(response.invoice_id).toContain("23413561D");
      expect(response.total).toBe(19647.68);

      expect(result.response).not.toHaveProperty("invoice_issue_date");
      expect(result.response).not.toHaveProperty("customer");
      expect(result.response).not.toHaveProperty("customer_email");
      expect(result.response).not.toHaveProperty("customer_phone");
      expect(result.response).not.toHaveProperty("customer_billing_address");
      expect(result.response).not.toHaveProperty("customer_shipping_address");
    });

    it("should generate document predictions when batch is true using url from custom zod schema", async () => {
      const documentUrl =
        "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";

      const schema = z.object({
        invoice_id: z.string(),
        total: z.number(),
        sub_total: z.number(),
        tax: z.number(),
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.number(),
            price: z.number(),
            total: z.number(),
          })
        ),
      });

      const result = await client.document.generate({
        url: documentUrl,
        domain: "document.invoice",
        batch: true,
        config: {
          responseModel: schema,
        },
      });

      expect(result.status).toBe("pending");

      const waitResponse = await client.predictions.wait(result.id);
      const response = waitResponse.response as z.infer<typeof schema>;

      expect(waitResponse.status).toBe("completed");
      expect(waitResponse.response).toHaveProperty("invoice_id");
      expect(waitResponse.response).toHaveProperty("total");
      expect(waitResponse.response).toHaveProperty("sub_total");
      expect(waitResponse.response).toHaveProperty("tax");
      expect(waitResponse.response).toHaveProperty("items");

      // Test get endpoint
      const getResponse = await client.predictions.get(result.id);
      expect(getResponse.status).toBe("completed");
      expect(getResponse.response).toHaveProperty("invoice_id");
    });
    it("should generate document predictions when confidence is true", async () => {
      const documentUrl =
        "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";

      const schema = z.object({
        invoice_id: z.string(),
        total: z.number(),
        sub_total: z.number(),
        tax: z.number(),
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.number(),
            price: z.number(),
            total: z.number(),
          })
        ),
      });

      const result = await client.document.generate({
        url: documentUrl,
        domain: "document.invoice",
        batch: false,
        config: {
          responseModel: schema,
          confidence: true,
        },
      });

      expect(result.status).toBe("completed");

      expect(result.response).toHaveProperty("invoice_id");
      expect(result.response).toHaveProperty("total");
      expect(result.response).toHaveProperty("sub_total");
      expect(result.response).toHaveProperty("tax");
      expect(result.response).toHaveProperty("items");

      expect(result.response.invoice_id_metadata).toHaveProperty("confidence");
      expect(result.response.total_metadata).toHaveProperty("confidence");
      expect(result.response.invoice_id_metadata).toHaveProperty("bbox");
      expect(result.response.invoice_id_metadata).toHaveProperty(
        "bbox_content"
      );
    });
  });
});
