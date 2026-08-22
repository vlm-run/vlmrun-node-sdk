import axios from "axios";
import { Client } from "../../../src/client/base_requestor";
import { Gateway, DEFAULT_GATEWAY_URL } from "../../../src/client/gateway";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

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

const asyncIterableOf = (items: any[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const item of items) {
      yield item;
    }
  },
});

describe("Gateway", () => {
  let client: jest.Mocked<Client>;
  let gateway: Gateway;

  beforeEach(() => {
    mockOpenAI.mockClear();
    mockModelsList.mockClear();
    mockedAxios.get.mockClear();

    client = {
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    } as jest.Mocked<Client>;

    gateway = new Gateway(client);
  });

  describe("baseUrl", () => {
    it("should default to the public gateway URL", () => {
      expect(gateway.baseUrl).toBe(DEFAULT_GATEWAY_URL);
      expect(gateway.openaiBaseUrl).toBe(`${DEFAULT_GATEWAY_URL}/openai`);
    });

    it("should accept an override and strip trailing slashes", () => {
      const custom = new Gateway(client, "https://gateway.example.com/v1/");
      expect(custom.baseUrl).toBe("https://gateway.example.com/v1");
      expect(custom.openaiBaseUrl).toBe("https://gateway.example.com/v1/openai");
    });
  });

  describe("completions", () => {
    it("should return OpenAI chat completions pointed at the gateway", () => {
      const completions = gateway.completions;

      expect(completions).toBe(mockChatCompletions);
      expect(mockOpenAI).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        baseURL: `${DEFAULT_GATEWAY_URL}/openai`,
        timeout: undefined,
        maxRetries: 1,
      });
    });

    it("should cache the OpenAI client", () => {
      const completions1 = gateway.completions;
      const completions2 = gateway.completions;

      expect(completions1).toBe(completions2);
      expect(mockOpenAI).toHaveBeenCalledTimes(1);
    });

    it("should raise the default 120s timeout to 600s", () => {
      const timedClient = { ...client, timeout: 120000 } as jest.Mocked<Client>;
      const timedGateway = new Gateway(timedClient);
      void timedGateway.completions;

      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 600000 })
      );
    });

    it("should keep an explicit non-default timeout", () => {
      const timedClient = { ...client, timeout: 30000 } as jest.Mocked<Client>;
      const timedGateway = new Gateway(timedClient);
      void timedGateway.completions;

      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30000 })
      );
    });
  });

  describe("embeddings", () => {
    it("should return the OpenAI embeddings resource", () => {
      expect(gateway.embeddings).toBe(mockEmbeddings);
    });
  });

  describe("transcriptions", () => {
    it("should return the OpenAI audio transcriptions resource", () => {
      expect(gateway.transcriptions).toBe(mockTranscriptions);
    });
  });

  describe("models", () => {
    it("should list models from the gateway", async () => {
      mockModelsList.mockReturnValue(
        asyncIterableOf([{ id: "glm-ocr" }, { id: "paddle-ocrv6" }])
      );

      const models = await gateway.models();

      expect(models.map((m) => m.id)).toEqual(["glm-ocr", "paddle-ocrv6"]);
    });
  });

  describe("health", () => {
    it("should return true when the health endpoint responds 200", async () => {
      mockedAxios.get.mockResolvedValue({ status: 200 });

      await expect(gateway.health()).resolves.toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${DEFAULT_GATEWAY_URL}/health`,
        expect.objectContaining({
          headers: { Authorization: "Bearer test-api-key" },
        })
      );
    });

    it("should fall back to listing models when health endpoint is missing", async () => {
      mockedAxios.get.mockResolvedValue({ status: 404 });
      mockModelsList.mockReturnValue(asyncIterableOf([{ id: "glm-ocr" }]));

      await expect(gateway.health()).resolves.toBe(true);
    });

    it("should return false when unreachable and models listing fails", async () => {
      mockedAxios.get.mockRejectedValue(new Error("network error"));
      mockModelsList.mockImplementation(() => {
        throw new Error("unauthorized");
      });

      await expect(gateway.health()).resolves.toBe(false);
    });
  });
});
