# Vlm

Types:

- <code><a href="./src/resources/top-level.ts">HealthResponse</a></code>

Methods:

- <code title="get /v1/health">client.<a href="./src/index.ts">health</a>() -> unknown</code>

# Shared

Types:

- <code><a href="./src/resources/shared.ts">PredictionResponse</a></code>

# OpenAI

Types:

- <code><a href="./src/resources/openai/openai.ts">OpenAIHealthResponse</a></code>

Methods:

- <code title="get /v1/openai/health">client.openai.<a href="./src/resources/openai/openai.ts">health</a>() -> unknown</code>

## ChatCompletions

Types:

- <code><a href="./src/resources/openai/chat-completions.ts">Completion</a></code>

Methods:

- <code title="post /v1/openai/chat/completions">client.openai.chatCompletions.<a href="./src/resources/openai/chat-completions.ts">create</a>({ ...params }) -> Completion</code>

## Models

Types:

- <code><a href="./src/resources/openai/models.ts">ChatModel</a></code>
- <code><a href="./src/resources/openai/models.ts">Model</a></code>

Methods:

- <code title="get /v1/openai/models/{model}">client.openai.models.<a href="./src/resources/openai/models.ts">retrieve</a>(model) -> ChatModel</code>
- <code title="get /v1/openai/models">client.openai.models.<a href="./src/resources/openai/models.ts">list</a>() -> Model</code>

# Experimental

Types:

- <code><a href="./src/resources/experimental/experimental.ts">ExperimentalHealthResponse</a></code>

Methods:

- <code title="get /v1/experimental/health">client.experimental.<a href="./src/resources/experimental/experimental.ts">health</a>() -> unknown</code>

## Image

### Embeddings

Methods:

- <code title="post /v1/experimental/image/embeddings">client.experimental.image.embeddings.<a href="./src/resources/experimental/image/embeddings.ts">create</a>({ ...params }) -> PredictionResponse</code>

## Document

### Embeddings

Methods:

- <code title="post /v1/experimental/document/embeddings">client.experimental.document.embeddings.<a href="./src/resources/experimental/document/embeddings.ts">create</a>({ ...params }) -> PredictionResponse</code>

# Models

Types:

- <code><a href="./src/resources/models.ts">ModelInfoResponse</a></code>
- <code><a href="./src/resources/models.ts">ModelListResponse</a></code>

Methods:

- <code title="get /v1/models">client.models.<a href="./src/resources/models.ts">list</a>() -> ModelListResponse</code>

# Files

Types:

- <code><a href="./src/resources/files.ts">StoreFileResponse</a></code>
- <code><a href="./src/resources/files.ts">FileListResponse</a></code>

Methods:

- <code title="post /v1/files">client.files.<a href="./src/resources/files.ts">create</a>({ ...params }) -> StoreFileResponse</code>
- <code title="get /v1/files/{file_id}">client.files.<a href="./src/resources/files.ts">retrieve</a>(fileId) -> StoreFileResponse</code>
- <code title="get /v1/files">client.files.<a href="./src/resources/files.ts">list</a>({ ...params }) -> FileListResponse</code>

# Predictions

Methods:

- <code title="get /v1/predictions/{id}">client.response.<a href="./src/resources/response.ts">retrieve</a>(id) -> PredictionResponse</code>

# Document

Methods:

- <code title="post /v1/document/generate">client.document.<a href="./src/resources/document.ts">generate</a>({ ...params }) -> PredictionResponse</code>

# Audio

Methods:

- <code title="post /v1/audio/generate">client.audio.<a href="./src/resources/audio.ts">generate</a>({ ...params }) -> PredictionResponse</code>

# Image

Methods:

- <code title="post /v1/image/generate">client.image.<a href="./src/resources/image.ts">generate</a>({ ...params }) -> PredictionResponse</code>

# Web

Methods:

- <code title="post /v1/web/generate">client.web.<a href="./src/resources/web.ts">generate</a>({ ...params }) -> PredictionResponse</code>

# Schema

Methods:

- <code title="post /v1/schema/generate">client.schema.<a href="./src/resources/schema.ts">generate</a>({ ...params }) -> PredictionResponse</code>
