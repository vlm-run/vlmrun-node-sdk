# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build
- `npm run build` or `./scripts/build` - Full production build with TypeScript compilation and package preparation
- `npm run clean` - Remove dist directory

### Testing
- `npm test` or `./scripts/test` - Run unit tests with automatic mock server setup
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage reporting  
- `npm run test:integration` - Run integration tests only
- `npm run test:integration:all` - Run all integration tests including those requiring real API keys

### Linting & Type Checking
- `./scripts/lint` - Run ESLint and TypeScript type checking
- No separate lint script in package.json, use the shell script

## Project Architecture

### Core Structure
This is the official TypeScript SDK for the VLM Run API platform. The main entry point is `src/index.ts` which exports the `VlmRun` class and all client modules.

### Client Architecture
The SDK follows a modular client pattern where each API resource has its own client class:

- `VlmRun` class (src/index.ts) - Main SDK entry point that initializes all sub-clients
- `Client` interface (src/client/base_requestor.ts) - Base HTTP client configuration
- Resource clients in `src/client/`:
  - `Models` - Model listing and info
  - `Files` - File upload/management 
  - `Predictions` - Core prediction functionality
  - `ImagePredictions`, `DocumentPredictions`, `AudioPredictions`, `VideoPredictions`, `WebPredictions` - Specialized prediction clients
  - `Feedback` - Submit prediction feedback
  - `Finetuning` - Model fine-tuning
  - `Datasets` - Dataset management
  - `Hub` - Schema and domain information
  - `Agent` - Agent execution
  - `Domains` - Domain listing

### Key Features
- **Zod Integration**: Native support for Zod schemas via `responseModel` parameter
- **File Handling**: Automatic file upload for local paths, supports URLs and file IDs
- **Type Safety**: Full TypeScript support with comprehensive type definitions in `src/client/types.ts`
- **Retry Logic**: Built-in retry mechanism via axios-retry
- **Multiple Input Types**: Support for images, documents, audio, video, and web content

### Configuration
- Main config interface: `VlmRunConfig` with apiKey, baseURL, timeout, maxRetries
- Generation config: `GenerationConfig` class for prediction parameters (detail level, JSON schema, confidence, grounding)
- Request metadata: `RequestMetadata` class for environment, session tracking, training permissions

### Testing Strategy
- Unit tests in `tests/unit/` mirror the `src/` structure
- Integration tests in `tests/integration/` test real API interactions
- Mock server setup using Prism for unit tests
- Test assets in `tests/integration/assets/`

## Important Notes

- The SDK uses CommonJS module format (`"type": "commonjs"`)
- Build process creates both CJS and ESM outputs in `dist/`
- File uploads have special timeout handling (timeout: 0 for `Files` client)
- Integration tests require `TEST_API_BASE_URL` environment variable or running mock server
- Package uses Yarn as package manager (`packageManager: "yarn@1.22.22"`)