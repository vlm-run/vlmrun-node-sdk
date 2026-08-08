import { Client } from "../../../src/client/base_requestor";
import { Gateway, DEFAULT_GATEWAY_URL } from "../../../src/client/gateway";

const mockCompletionsCreate = jest.fn();
const mockEmbeddingsCreate = jest.fn();
const mockTranscriptionsCreate = jest.fn();
const mockModelsList = jest.fn();
const mockOpenAI = jest.fn().mockImplementation(() => ({
  chat: { completions: { create: mockCompletionsCreate } },
  embeddings: { create: mockEmbeddingsCreate },
  audio: { transcriptions: { create: mockTranscriptionsCreate } },
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
    it("should default to the gateway URL", () => {
      const gateway = new Gateway(client);
      expect(gateway.baseURL).toBe(DEFAULT_GATEWAY_URL);
      expect(gateway.openaiBaseURL).toBe(`${DEFAULT_GATEWAY_URL}/openai`);
    });

    it("should honor the VLMRUN_GATEWAY_URL environment variable", () => {
      process.env.VLMRUN_GATEWAY_URL = "https://gw.example.com/v1/";
      const gateway = new Gateway(client);
      expect(gateway.baseURL).toBe("https://gw.example.com/v1");
    });

    it("should prefer an explicit override", () => {
      process.env.VLMRUN_GATEWAY_URL = "https://gw.example.com/v1";
      const gateway = new Gateway(client, "https://override.example.com/v1");
      expect(gateway.baseURL).toBe("https://override.example.com/v1");
    });
  });

  describe("openai configuration", () => {
    it("should configure the OpenAI client with the gateway base URL", () => {
      const gateway = new Gateway(client);
      gateway.completions;

      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "test-api-key",
          baseURL: `${DEFAULT_GATEWAY_URL}/openai`,
          timeout: 600000,
        })
      );
    });

    it("should keep an explicit non-default timeout", () => {
      const gateway = new Gateway({ ...client, timeout: 30000 });
      gateway.completions;

      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it("should reuse the same OpenAI client across resources", () => {
      const gateway = new Gateway(client);
      gateway.completions;
      gateway.embeddings;
      gateway.transcriptions;

      expect(mockOpenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe("models", () => {
    it("should return the model list data", async () => {
      mockModelsList.mockResolvedValue({ data: [{ id: "zai-org/glm-ocr" }] });

      const gateway = new Gateway(client);
      await expect(gateway.models()).resolves.toEqual([
        { id: "zai-org/glm-ocr" },
      ]);
    });

    it("should return an empty array when no data is present", async () => {
      mockModelsList.mockResolvedValue({});

      const gateway = new Gateway(client);
      await expect(gateway.models()).resolves.toEqual([]);
    });
  });

  describe("health", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should return true when the health endpoint succeeds", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200 }) as any;

      const gateway = new Gateway(client);
      await expect(gateway.health()).resolves.toBe(true);
    });

    it("should fall back to listing models when health is unavailable", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 404 }) as any;
      mockModelsList.mockResolvedValue({ data: [] });

      const gateway = new Gateway(client);
      await expect(gateway.health()).resolves.toBe(true);
    });

    it("should return false when the gateway is unreachable", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("boom")) as any;
      mockModelsList.mockRejectedValue(new Error("boom"));

      const gateway = new Gateway(client);
      await expect(gateway.health()).resolves.toBe(false);
    });
  });
});
