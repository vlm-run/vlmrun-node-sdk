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
      expect(result.response).toHaveProperty("invoice_id");
      expect(result.response).toHaveProperty("invoice_issue_date");

      expect(typeof result.response.customer).toBe("string");
      expect(result.response.customer_billing_address).toHaveProperty("street");
      expect(typeof result.response.customer_billing_address.city).toBe(
        "string"
      );
      expect(typeof result.response.customer_billing_address.state).toBe(
        "string"
      );
      expect(typeof result.response.customer_billing_address.postal_code).toBe(
        "string"
      );

      expect(result.response).toHaveProperty("subtotal");
      expect(result.response).toHaveProperty("total");
      expect(result.response).toHaveProperty("tax");
      expect(result.response).toHaveProperty("items");
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
      expect(response).toHaveProperty("invoice_id");

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
    });
    it("should generate document predictions when zod schema definition is provided", async () => {
      // Define enums and base schemas
      enum PaymentStatus {
        PAID = "Paid",
        UNPAID = "Unpaid",
        PARTIAL = "Partial",
        OVERDUE = "Overdue",
      }

      enum PaymentMethod {
        CREDIT_CARD = "Credit Card",
        BANK_TRANSFER = "Bank Transfer",
        CHECK = "Check",
        CASH = "Cash",
        PAYPAL = "PayPal",
        OTHER = "Other",
      }

      const currencySchema = z
        .number()
        .min(0, "Currency values must be non-negative");

      const dateSchema = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

      // Define address schema
      const addressSchema = z.object({
        street: z.string().nullable(),
        city: z.string().nullable(),
        state: z.string().nullable(),
        postal_code: z.string().nullable(),
        country: z.string().nullable(),
      });

      // Define line item schema
      const lineItemSchema = z.object({
        description: z.string(),
        quantity: z.number().positive(),
        unit_price: currencySchema,
        total: currencySchema,
      });

      // Define company schema
      const companySchema = z.object({
        name: z.string(),
        address: addressSchema.nullable(),
        tax_id: z.string().nullable(),
        phone: z.string().nullable(),
        email: z.string().nullable(),
        website: z.string().nullable(),
      });

      // Define invoice schema using the definitions
      const invoiceSchema = z.object({
        invoice_id: z.string(),
        invoice_date: dateSchema,
        due_date: dateSchema.nullable(),
        vendor: companySchema,
        customer: companySchema,
        items: z.array(lineItemSchema),
        subtotal: currencySchema,
        tax: currencySchema.nullable(),
        total: currencySchema,
        payment_status: z.nativeEnum(PaymentStatus).nullable(),
        payment_method: z.nativeEnum(PaymentMethod).nullable(),
        notes: z.string().nullable(),
      });

      const documentUrl =
        "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";

      const result = await client.document.generate({
        url: documentUrl,
        domain: "document.invoice",
        config: {
          responseModel: invoiceSchema,
          zodToJsonParams: {
            definitions: {
              address: addressSchema,
              lineItem: lineItemSchema,
              company: companySchema,
            },
            $refStrategy: "none",
          },
        },
      });

      expect(result.status).toBe("completed");
      expect(result.response).toHaveProperty("invoice_id");
      expect(result.response).toHaveProperty("invoice_date");
      expect(result.response).toHaveProperty("vendor");
      expect(result.response).toHaveProperty("customer");
      expect(result.response).toHaveProperty("items");
      expect(result.response).toHaveProperty("subtotal");
      expect(result.response).toHaveProperty("tax");
      expect(result.response).toHaveProperty("total");

      // Check nested properties
      expect(result.response.vendor).toHaveProperty("name");
      expect(result.response.customer).toHaveProperty("name");
      expect(result.response.customer.address).toHaveProperty("street");
      expect(result.response.items.length).toBeGreaterThan(0);
      expect(result.response.items[0]).toHaveProperty("description");
      expect(result.response.items[0]).toHaveProperty("quantity");
    });

    it("should generate document predictions for images", async () => {
      const testImagePath = "tests/integration/assets/invoice.jpg";

      const uploadedDocument = await client.files.upload({
        filePath: testImagePath,
        purpose: "vision",
        checkDuplicate: true,
      });

      const result = await client.document.generate({
        fileId: uploadedDocument.id,
        model: "vlm-1",
        domain: "document.invoice",
        batch: false,
      });

      expect(result).toHaveProperty("id");
      expect(result.status).toBe("completed");
      expect(result.response).toHaveProperty("invoice_id");
      expect(result.response).toHaveProperty("invoice_issue_date");
    });

    describe("schema", () => {
      it("should generate schema from file ID", async () => {
        const uploadedDocument = await client.files.upload({
          filePath: testFilePath,
          purpose: "vision",
          checkDuplicate: true,
        });

        const result = await client.document.schema({
          fileId: uploadedDocument.id,
        });

        expect(result).toHaveProperty("id");
        expect(result.status).toBe("completed");
        expect(result.response).toHaveProperty("json_schema");
        expect(result.response).toHaveProperty("schema_version");
        expect(result.response).toHaveProperty("schema_hash");
        expect(result.response).toHaveProperty("domain");
        expect(result.response).toHaveProperty("description");

        expect(result.response.json_schema).toHaveProperty("properties");
      });

      it("should generate schema from URL", async () => {
        const documentUrl =
          "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";

        const result = await client.document.schema({
          url: documentUrl,
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

      it("should throw an error when neither fileId nor url are provided", async () => {
        await expect(client.document.schema({})).rejects.toThrow(
          "Either `fileId` or `url` must be provided"
        );
      });

      it("should throw an error when both fileId and url are provided", async () => {
        const uploadedDocument = await client.files.upload({
          filePath: testFilePath,
          purpose: "vision",
          checkDuplicate: true,
        });

        const documentUrl =
          "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";

        await expect(
          client.document.schema({
            fileId: uploadedDocument.id,
            url: documentUrl,
          })
        ).rejects.toThrow("Only one of `fileId` or `url` can be provided");
      });
    });
  });
});
