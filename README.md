<div align="center">
<p align="center" style="width: 100%;">
    <img src="https://raw.githubusercontent.com/vlm-run/.github/refs/heads/main/profile/assets/vlm-black.svg" alt="VLM Run Logo" width="80" style="margin-bottom: -5px; color: #2e3138; vertical-align: middle; padding-right: 5px;"><br>
</p>
<h2>Node.js SDK</h2>
<p align="center"><a href="https://docs.vlm.run"><b>Website</b></a> | <a href="https://app.vlm.run/"><b>Platform</b></a> | <a href="https://docs.vlm.run/"><b>Docs</b></a> | <a href="https://docs.vlm.run/blog"><b>Blog</b></a> | <a href="https://discord.gg/AMApC2UzVY"><b>Discord</b></a>
</p>
<p align="center">
<a href="https://www.npmjs.com/package/vlmrun"><img alt="npm Version" src="https://img.shields.io/npm/v/vlmrun.svg"></a>
<a href="https://www.npmjs.com/package/vlmrun"><img alt="npm Downloads" src="https://img.shields.io/npm/dm/vlmrun.svg"></a>
<a href="https://www.npmjs.com/package/vlmrun"><img alt="npm Types" src="https://img.shields.io/npm/types/vlmrun.svg"></a><br>
<a href="https://github.com/vlm-run/vlmrun-node-sdk/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue"></a>
<a href="https://discord.gg/AMApC2UzVY"><img alt="Discord" src="https://img.shields.io/badge/discord-chat-purple?color=%235765F2&label=discord&logo=discord"></a>
<a href="https://twitter.com/vlmrun"><img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/vlmrun.svg?style=social&logo=twitter"></a>
</p>
</div>

The [VLM Run Node.js SDK](https://www.npmjs.com/package/vlmrun) is the official Node.js client for [VLM Run API platform](https://docs.vlm.run), providing a convenient way to interact with our REST APIs.

## 🚀 Getting Started

### Installation

```bash
# Using npm
npm install vlmrun

# Using yarn
yarn add vlmrun

# Using pnpm
pnpm add vlmrun
```

### Basic Usage

### Image Predictions

```typescript
import { VlmRun } from "vlmrun";

// Initialize the client
const client = new VlmRun({
  apiKey: "your-api-key",
});

// Process an image (using image url)
const imageUrl =
  "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/invoice_1.jpg";
const response = await client.image.generate({
  images: [imageUrl],
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
console.log(response);

// Process an image passing zod schema
import { z } from "zod";

const imageUrl =
  "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/invoice_1.jpg";

const schema = z.object({
  invoice_number: z.string(),
  total_amount: z.number(),
});

const response = await client.image.generate({
  images: [imageUrl],
  domain: "document.invoice",
  config: {
    responseModel: schema,
  },
});
const response = response.response as z.infer<typeof schema>;
console.log(response);

// Process an image (using local file path)
const response = await client.image.generate({
  images: ["tests/integration/assets/invoice.jpg"],
  model: "vlm-1",
  domain: "document.invoice",
});
console.log(response);
```

### Document Predictions

```typescript
import { VlmRun } from "vlmrun";

// Initialize the client
const client = new VlmRun({
  apiKey: "your-api-key",
});

// Upload a document
const file = await client.files.upload({
  filePath: "path/to/invoice.pdf",
});

// Process a document (using file id)
const response = await client.document.generate({
  fileId: file.id,
  model: "vlm-1",
  domain: "document.invoice",
});
console.log(response);

// Process a document (using url)
const documentUrl =
  "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";
const response = await client.document.generate({
  url: documentUrl,
  model: "vlm-1",
  domain: "document.invoice",
});
console.log(response);

// Process a document passing zod schema
import { z } from "zod";

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

const response = await client.document.generate({
  url: documentUrl,
  domain: "document.invoice",
  config: { responseModel: schema },
});

const response = response.response as z.infer<typeof schema>;
console.log(response);
```

### Using Callback URLs for Async Processing

VLM Run supports callback URLs for asynchronous processing. When you provide a callback URL, the API will send a webhook notification to your endpoint when the prediction is complete.

```typescript
import { VlmRun } from "vlmrun";

// Initialize the client
const client = new VlmRun({
  apiKey: "your-api-key",
});

// Process a document with callback URL
const url =
  "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";
const response = await client.document.generate({
  url: url,
  domain: "document.invoice",
  batch: true, // Enable batch processing for async execution
  callbackUrl: "https://your-webhook-endpoint.com/vlm-callback",
});

console.log(response.status); // "pending"
console.log(response.id); // Use this ID to track the prediction
```

#### Webhook Payload

When the prediction is complete, VLM Run will send a POST request to your callback URL with the following payload:

```json
{
  "id": "pred_abc123",
  "status": "completed",
  "response": {
    "invoice_id": "INV-001",
    "total": 1250.0,
    "items": []
  },
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:30:45Z"
}
```

### Document Predictions with Zod Definitions

```typescript
import { VlmRun } from "vlmrun";
import { z } from "zod";
// Initialize the client
const client = new VlmRun({
  apiKey: "your-api-key",
});

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
```

## 🛠️ Examples

Check out the [examples](./examples) directory for more detailed usage examples:

- [Models](./examples/models.ts) - List available models
- [Files](./examples/files.ts) - Upload and manage files
- [Predictions](./examples/predictions.ts) - Make predictions with different types of inputs
- [Feedback](./examples/feedback.ts) - Submit feedback for predictions

## 🔑 Authentication

To use the VLM Run API, you'll need an API key. You can obtain one by:

1. Create an account at [VLM Run](https://app.vlm.run)
2. Navigate to dashboard Settings -> API Keys

Then use it to initialize the client:

```typescript
const client = new VlmRun({
  apiKey: "your-api-key",
});
```

## 📚 Documentation

For detailed documentation and API reference, visit our [documentation site](https://docs.vlm.run).

## 🤝 Contributing

We welcome contributions! Please check out our [contributing guidelines](docs/CONTRIBUTING.md) for details.

## 📝 License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.
