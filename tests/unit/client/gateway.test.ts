import { Client } from "../../../src/client/base_requestor";
import { Gateway, DEFAULT_GATEWAY_URL } from "../../../src/client/gateway";

describe("Gateway", () => {
  const client: Client = {
    apiKey: "test-api-key",
    baseURL: "https://api.example.com/v1",
  };

  afterEach(() => {
    delete process.env.VLMRUN_GATEWAY_URL;
  });

  it("defaults to the public gateway URL", () => {
    const gateway = new Gateway(client);
    expect(gateway.baseUrl).toBe(DEFAULT_GATEWAY_URL);
    expect(gateway.openaiBaseUrl).toBe(`${DEFAULT_GATEWAY_URL}/openai`);
  });

  it("honors the VLMRUN_GATEWAY_URL environment variable", () => {
    process.env.VLMRUN_GATEWAY_URL = "https://gateway.example.com/v1/";
    const gateway = new Gateway(client);
    expect(gateway.baseUrl).toBe("https://gateway.example.com/v1");
  });

  it("prefers an explicit base URL over the environment variable", () => {
    process.env.VLMRUN_GATEWAY_URL = "https://gateway.example.com/v1";
    const gateway = new Gateway(client, "https://gateway.override.com/v1");
    expect(gateway.baseUrl).toBe("https://gateway.override.com/v1");
  });

  it("raises the timeout floor to 600s and keeps explicit overrides", () => {
    expect(new Gateway(client)["timeout"]).toBe(600000);
    expect(new Gateway({ ...client, timeout: 120000 })["timeout"]).toBe(600000);
    expect(new Gateway({ ...client, timeout: 900000 })["timeout"]).toBe(900000);
    expect(new Gateway({ ...client, timeout: 30000 })["timeout"]).toBe(30000);
  });

  it("exposes OpenAI-compatible completions, embeddings and transcriptions", () => {
    const gateway = new Gateway(client);
    expect(gateway.completions).toBeDefined();
    expect(gateway.embeddings).toBeDefined();
    expect(gateway.transcriptions).toBeDefined();
  });

  it("lists gateway models", async () => {
    const gateway = new Gateway(client);
    const models = [{ id: "glm-ocr" }, { id: "paddle-ocrv6" }];
    jest
      .spyOn(gateway as any, "openai", "get")
      .mockReturnValue({ models: { list: async () => ({ data: models }) } });

    await expect(gateway.models()).resolves.toEqual(models);
  });
});
