import { Client } from "../../../src/client/base_requestor";
import { Gateway, DEFAULT_GATEWAY_URL } from "../../../src/client/gateway";

// Mock the openai module
const mockChatCompletions = { create: jest.fn() };
const mockEmbeddings = { create: jest.fn() };
const mockTranscriptions = { create: jest.fn() };
const mockModelsList = jest.fn();
const mockOpenAI = jest.fn().mockImplementation(() => ({
  chat: { completions: mockChatCompletions },
  embeddings: mockEmbeddings,
  audio: { transcriptions: mockTranscriptions },
  models: { list: mockModelsList },
}));

jest.mock("openai", () => ({
  default: mockOpenAI,
}));

describe("Gateway", () => {
  let client: Client;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.VLMRUN_GATEWAY_URL;
    client = {
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    } as Client;
  });

  describe("baseURL", () => {
    it("should default to the public gateway URL", () => {
      const gateway = new Gateway(client);
      expect(gateway.baseURL).toBe(DEFAULT_GATEWAY_URL);
      expect(gateway.openaiBaseURL).toBe(`${DEFAULT_GATEWAY_URL}/openai`);
    });

    it("should respect an explicit base URL override", () => {
      const gateway = new Gateway(client, "https://gateway.example.com/v1/");
      expect(gateway.baseURL).toBe("https://gateway.example.com/v1");
      expect(gateway.openaiBaseURL).toBe(
        "https://gateway.example.com/v1/openai",
      );
    });

    it("should respect the VLMRUN_GATEWAY_URL environment variable", () => {
      process.env.VLMRUN_GATEWAY_URL = "https://gateway.env.example.com/v1";
      const gateway = new Gateway(client);
      expect(gateway.baseURL).toBe("https://gateway.env.example.com/v1");
    });
  });

  describe("openai client configuration", () => {
    it("should point the OpenAI SDK at the gateway with a 600s default timeout", () => {
      const gateway = new Gateway(client);
      expect(gateway.completions).toBe(mockChatCompletions);
      expect(mockOpenAI).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        baseURL: `${DEFAULT_GATEWAY_URL}/openai`,
        timeout: 600000,
        maxRetries: 1,
      });
    });

    it("should raise the default 120s client timeout to 600s", () => {
      const gateway = new Gateway({ ...client, timeout: 120000 });
      expect(gateway.completions).toBe(mockChatCompletions);
      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 600000 }),
      );
    });

    it("should keep an explicit non-default timeout", () => {
      const gateway = new Gateway({ ...client, timeout: 30000 });
      expect(gateway.completions).toBe(mockChatCompletions);
      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30000 }),
      );
    });

    it("should expose embeddings and transcriptions interfaces", () => {
      const gateway = new Gateway(client);
      expect(gateway.embeddings).toBe(mockEmbeddings);
      expect(gateway.transcriptions).toBe(mockTranscriptions);
    });

    it("should reuse the same OpenAI client across accesses", () => {
      const gateway = new Gateway(client);
      expect(gateway.completions).toBe(mockChatCompletions);
      expect(gateway.embeddings).toBe(mockEmbeddings);
      expect(mockOpenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe("models", () => {
    it("should list models from the gateway", async () => {
      const models = [{ id: "glm-ocr" }, { id: "paddle-ocrv6" }];
      mockModelsList.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          for (const model of models) {
            yield model;
          }
        },
      });

      const gateway = new Gateway(client);
      const result = await gateway.models();
      expect(result).toEqual(models);
    });
  });
});
