import { VlmRun } from "../../../src/index";
import { DEFAULT_GATEWAY_URL, Gateway } from "../../../src/client/gateway";

describe("Gateway", () => {
  const client = {
    apiKey: "test-api-key",
    baseURL: "https://api.example.com",
  };

  afterEach(() => {
    delete process.env.VLMRUN_GATEWAY_URL;
  });

  it("should default to the public gateway url", () => {
    const gateway = new Gateway(client);
    expect(gateway.baseURL).toBe(DEFAULT_GATEWAY_URL);
    expect(gateway.openaiBaseURL).toBe(`${DEFAULT_GATEWAY_URL}/openai`);
  });

  it("should honor the VLMRUN_GATEWAY_URL environment variable", () => {
    process.env.VLMRUN_GATEWAY_URL = "https://gateway.example.com/v1/";
    const gateway = new Gateway(client);
    expect(gateway.baseURL).toBe("https://gateway.example.com/v1");
  });

  it("should prefer an explicit base url override", () => {
    process.env.VLMRUN_GATEWAY_URL = "https://gateway.example.com/v1";
    const gateway = new Gateway(client, "https://custom.example.com/v1");
    expect(gateway.baseURL).toBe("https://custom.example.com/v1");
  });

  it("should be exposed on the VlmRun client", () => {
    const vlmRun = new VlmRun({
      apiKey: "test-api-key",
      gatewayURL: "https://custom.example.com/v1",
    });
    expect(vlmRun.gateway).toBeInstanceOf(Gateway);
    expect(vlmRun.gateway.baseURL).toBe("https://custom.example.com/v1");
  });

  describe("models()", () => {
    it("should return the models list data", async () => {
      const gateway = new Gateway(client);
      const mockModels = [{ id: "glm-ocr" }, { id: "paddle-ocrv6" }];
      jest
        .spyOn(gateway as any, "openai", "get")
        .mockReturnValue({
          models: { list: jest.fn().mockResolvedValue({ data: mockModels }) },
        });

      await expect(gateway.models()).resolves.toEqual(mockModels);
    });
  });

  describe("health()", () => {
    it("should return true when the health endpoint is reachable", async () => {
      const gateway = new Gateway(client);
      global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true });

      await expect(gateway.health()).resolves.toBe(true);
    });

    it("should fall back to listing models when health is not found", async () => {
      const gateway = new Gateway(client);
      global.fetch = jest.fn().mockResolvedValue({ status: 404, ok: false });
      const modelsSpy = jest
        .spyOn(gateway, "models")
        .mockResolvedValue([{ id: "glm-ocr" }]);

      await expect(gateway.health()).resolves.toBe(true);
      expect(modelsSpy).toHaveBeenCalled();
    });

    it("should return false when the gateway is unreachable", async () => {
      const gateway = new Gateway(client);
      global.fetch = jest.fn().mockRejectedValue(new Error("network error"));
      jest.spyOn(gateway, "models").mockRejectedValue(new Error("boom"));

      await expect(gateway.health()).resolves.toBe(false);
    });
  });
});
