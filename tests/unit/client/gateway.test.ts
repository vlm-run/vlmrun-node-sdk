import axios from "axios";
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

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Gateway", () => {
  let client: Client;

  beforeEach(() => {
    mockOpenAI.mockClear();
    mockChatCompletions.create.mockClear();
    mockEmbeddings.create.mockClear();
    mockTranscriptions.create.mockClear();
    mockModelsList.mockClear();
    mockedAxios.get.mockReset();
    delete process.env.VLMRUN_GATEWAY_URL;

    client = {
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    };
  });

  describe("base URL resolution", () => {
    it("defaults to the gateway URL", () => {
      const gateway = new Gateway(client);
      expect(gateway.baseUrl).toBe(DEFAULT_GATEWAY_URL);
      expect(gateway.openaiBaseUrl).toBe(`${DEFAULT_GATEWAY_URL}/openai`);
    });

    it("reads the VLMRUN_GATEWAY_URL env var", () => {
      process.env.VLMRUN_GATEWAY_URL = "https://custom.gateway.dev/v1";
      const gateway = new Gateway(client);
      expect(gateway.baseUrl).toBe("https://custom.gateway.dev/v1");
    });

    it("prefers an explicit baseUrl over the env var", () => {
      process.env.VLMRUN_GATEWAY_URL = "https://env.gateway.dev/v1";
      const gateway = new Gateway(client, "https://explicit.gateway.dev/v1");
      expect(gateway.baseUrl).toBe("https://explicit.gateway.dev/v1");
    });

    it("strips trailing slashes", () => {
      const gateway = new Gateway(client, "https://gw.dev/v1///");
      expect(gateway.baseUrl).toBe("https://gw.dev/v1");
      expect(gateway.openaiBaseUrl).toBe("https://gw.dev/v1/openai");
    });
  });

  describe("openai client configuration", () => {
    it("points the OpenAI SDK at the gateway openai base URL", () => {
      const gateway = new Gateway(client);
      gateway.completions;

      expect(mockOpenAI).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        baseURL: `${DEFAULT_GATEWAY_URL}/openai`,
        timeout: 600000,
        maxRetries: 1,
      });
    });

    it("bumps the default 120s timeout to 600s", () => {
      const gateway = new Gateway({ ...client, timeout: 120000 });
      gateway.completions;
      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 600000 }),
      );
    });

    it("respects an explicit non-default timeout", () => {
      const gateway = new Gateway({ ...client, timeout: 30000, maxRetries: 3 });
      gateway.completions;
      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30000, maxRetries: 3 }),
      );
    });

    it("caches the OpenAI client across interfaces", () => {
      const gateway = new Gateway(client);
      gateway.completions;
      gateway.embeddings;
      gateway.transcriptions;
      expect(mockOpenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe("interfaces", () => {
    it("exposes chat completions", () => {
      const gateway = new Gateway(client);
      expect(gateway.completions).toBe(mockChatCompletions);
    });

    it("exposes embeddings", () => {
      const gateway = new Gateway(client);
      expect(gateway.embeddings).toBe(mockEmbeddings);
    });

    it("exposes transcriptions", () => {
      const gateway = new Gateway(client);
      expect(gateway.transcriptions).toBe(mockTranscriptions);
    });
  });

  describe("models", () => {
    it("returns the raw model list from the openai page", async () => {
      const models = [{ id: "glm-ocr" }, { id: "paddle-ocrv6" }];
      mockModelsList.mockResolvedValue({ data: models });

      const gateway = new Gateway(client);
      const result = await gateway.models();

      expect(result).toEqual(models);
    });

    it("returns an empty array when the page has no data", async () => {
      mockModelsList.mockResolvedValue({});
      const gateway = new Gateway(client);
      expect(await gateway.models()).toEqual([]);
    });
  });

  describe("health", () => {
    it("returns true when the health endpoint is reachable", async () => {
      mockedAxios.get.mockResolvedValue({ status: 200 });
      const gateway = new Gateway(client);

      expect(await gateway.health()).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${DEFAULT_GATEWAY_URL}/health`,
        expect.objectContaining({
          headers: { Authorization: "Bearer test-api-key" },
        }),
      );
    });

    it("returns false on a non-2xx (non-404) status", async () => {
      mockedAxios.get.mockResolvedValue({ status: 503 });
      const gateway = new Gateway(client);
      expect(await gateway.health()).toBe(false);
    });

    it("falls back to models() on a 404", async () => {
      mockedAxios.get.mockResolvedValue({ status: 404 });
      mockModelsList.mockResolvedValue({ data: [{ id: "glm-ocr" }] });

      const gateway = new Gateway(client);
      expect(await gateway.health()).toBe(true);
      expect(mockModelsList).toHaveBeenCalled();
    });

    it("falls back to models() when the request throws", async () => {
      mockedAxios.get.mockRejectedValue(new Error("connection refused"));
      mockModelsList.mockResolvedValue({ data: [{ id: "glm-ocr" }] });

      const gateway = new Gateway(client);
      expect(await gateway.health()).toBe(true);
    });

    it("returns false when both health and the models fallback fail", async () => {
      mockedAxios.get.mockRejectedValue(new Error("connection refused"));
      mockModelsList.mockRejectedValue(new Error("unauthorized"));

      const gateway = new Gateway(client);
      expect(await gateway.health()).toBe(false);
    });
  });
});
