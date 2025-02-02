<div align="center">
<p align="center" style="width: 100%;">
    <img src="https://raw.githubusercontent.com/vlm-run/.github/refs/heads/main/profile/assets/vlm-black.svg" alt="VLM Run Logo" width="80" style="margin-bottom: -5px; color: #2e3138; vertical-align: middle; padding-right: 5px;"><br>
</p>
<h2>Node.js SDK</h2>
<p align="center"><a href="https://docs.vlm.run"><b>Website</b></a> | <a href="https://docs.vlm.run/"><b>Docs</b></a> | <a href="https://docs.vlm.run/blog"><b>Blog</b></a> | <a href="https://discord.gg/AMApC2UzVY"><b>Discord</b></a>
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

```typescript
import { VlmRun } from "vlmrun";

// Initialize the client
const client = new VlmRun({
  apiKey: "your-api-key",
});

// Process an image
async function processImage() {
  const response = await client.imagePredictions.generate(
    ["path/to/invoice.jpg"],
    "vlm-1",
    "document.invoice",
    {
      jsonSchema: {
        type: "object",
        properties: {
          invoice_number: { type: "string" },
          total_amount: { type: "number" },
          date: { type: "string" },
        },
      },
    }
  );
  console.log(response);
}
```

### Image Utilities

```typescript
import { encodeImage, isImage } from "vlmrun/utils/image";

// Convert image to base64
const base64Image = encodeImage("path/to/image.jpg");

// Check if file is an image
const isImageFile = isImage("path/to/file.jpg"); // true
```

## 📂 Directory Structure

```bash
src/
├── client/               # Client implementation
│   ├── base_requestor.ts # Low-level request logic
│   ├── files.ts         # File operations
│   ├── models.ts        # Model operations
│   ├── predictions.ts   # Prediction operations
│   ├── feedback.ts      # Feedback operations
│   └── types.ts         # Type definitions
├── utils/               # Utility functions
│   └── image.ts         # Image processing utilities
└── index.ts            # Main entry point
```

## 🛠️ Examples

Check out the [examples](./examples) directory for more detailed usage examples:

- [Models](./examples/models.ts) - List available models
- [Files](./examples/files.ts) - Upload and manage files
- [Predictions](./examples/predictions.ts) - Make predictions with different types of inputs
- [Feedback](./examples/feedback.ts) - Submit feedback for predictions

## 🔑 Authentication

To use the VLM Run API, you'll need an API key. You can obtain one by:

1. Creating an account at [VLM Run](https://vlm.run)
2. Navigating to your dashboard
3. Creating a new API key

Then use it to initialize the client:

```typescript
const client = new VlmRun({
  apiKey: "your-api-key",
});
```

## 📚 Documentation

For detailed documentation and API reference, visit our [documentation site](https://docs.vlm.run).

## 🤝 Contributing

We welcome contributions! Please check out our [contributing guidelines](CONTRIBUTING.md) for details.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
