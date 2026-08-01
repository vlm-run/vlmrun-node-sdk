import { Client } from "../../../src/client/base_requestor";
import { Gateway, DEFAULT_GATEWAY_URL } from "../../../src/client/gateway";

const mockCreate = jest.fn();
const mockModelsList = jest.fn();
const mockOpenAI = jest.fn().mockImplementation(() => ({
  chat: { completions: { create: mockCreate } },
  embeddings: { create: mockCreate },
  audio: { transcriptions: { create: mockCreate } },
  models: { list: mockModelsList },
}));

jest.mock("openai", () => ({
  default: mockOpenAI,
}));

describe("Gateway", () => {
  const client: Client = {
    apiKey: "test-api-key",
    baseURL: "https://api.example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.VLMRUN_GATEWAY_URL;
  });

  describe("base URL", () => {
    it("defaults to the public gateway", () => {
      expect(new Gateway(client).baseURL).toBe(DEFAULT_GATEWAY_URL);
    });

    it("uses VLMRUN_GATEWAY_URL when set", () => {
      process.env.VLMRUN_GATEWAY_URL = "https://gateway.example.com/v1";
      expect(new Gateway(client).baseURL).toBe("https://gateway.example.com/v1");
    });

    it("prefers the explicit override and strips trailing slashes", () => {
      process.env.VLMRUN_GATEWAY_URL = "https://gateway.example.com/v1";
      const gateway = new Gateway(client, "https://custom.example.com/v1/");
      expect(gateway.baseURL).toBe("https://custom.example.com/v1");
      expect(gateway.openaiBaseURL).toBe("https://custom.example.com/v1/openai");
    });
  });

  describe("openai client", () => {
    it("points the OpenAI SDK at the gateway with a 600s timeout floor", () => {
      const gateway = new Gateway(client);
      void gateway.completions;

      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "test-api-key",
          baseURL: `${DEFAULT_GATEWAY_URL}/openai`,
          timeout: 600000,
        })
      );
    });

    it("keeps an explicitly configured timeout", () => {
      const gateway = new Gateway({ ...client, timeout: 30000 });
      void gateway.completions;

      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it("reuses a single OpenAI client across resources", () => {
      const gateway = new Gateway(client);
      void gateway.completions;
      void gateway.embeddings;
      void gateway.transcriptions;

      expect(mockOpenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe("models", () => {
    it("returns the model list data", async () => {
      const models = [{ id: "paddleocr/pp-ocrv6" }, { id: "zai-org/glm-ocr" }];
      mockModelsList.mockResolvedValue({ data: models });

      await expect(new Gateway(client).models()).resolves.toEqual(models);
    });
  });

  describe("health", () => {
    it("returns false when the gateway is unreachable", async () => {
      mockModelsList.mockRejectedValue(new Error("connection refused"));

      await expect(
        new Gateway(client, "http://127.0.0.1:1/v1").health()
      ).resolves.toBe(false);
    });
  });
});
