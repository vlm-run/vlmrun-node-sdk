import { VlmRun, ConfigurationError } from "../../../src";
import {
  DomainInfo,
  SchemaResponse,
  GenerationConfig,
} from "../../../src/client/types";

describe("VlmRun configuration", () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it("throws ConfigurationError without an API key", () => {
    delete process.env.VLMRUN_API_KEY;
    expect(() => new VlmRun()).toThrow(ConfigurationError);
    expect(() => new VlmRun({ apiKey: "" })).toThrow("Missing API key");
  });

  it("allows a missing API key when requireApiKey is false", () => {
    delete process.env.VLMRUN_API_KEY;
    const client = new VlmRun({ requireApiKey: false });
    expect(client.gateway.baseUrl).toBe("https://gateway.vlm.run/v1");
  });

  it("falls back to VLMRUN_API_KEY and VLMRUN_BASE_URL", () => {
    process.env.VLMRUN_API_KEY = "env-key";
    process.env.VLMRUN_BASE_URL = "https://env.example/v1";
    const client = new VlmRun();
    expect((client as any).client).toMatchObject({
      apiKey: "env-key",
      baseURL: "https://env.example/v1",
    });
  });
});

describe("VlmRun healthcheck", () => {
  let client: VlmRun;

  beforeEach(() => {
    client = new VlmRun({
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    });
  });

  describe("healthcheck", () => {
    it("should return true when API returns 200", async () => {
      jest
        .spyOn(client["requestor"], "request")
        .mockResolvedValueOnce([{}, 200, {}]);

      const result = await client.healthcheck();
      expect(result).toBe(true);
      expect(client["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "/health"
      );
    });

    it("should return false when API returns non-200 status", async () => {
      jest
        .spyOn(client["requestor"], "request")
        .mockResolvedValueOnce([{}, 500, {}]);

      const result = await client.healthcheck();
      expect(result).toBe(false);
    });

    it("should return false when API request throws an error", async () => {
      jest
        .spyOn(client["requestor"], "request")
        .mockRejectedValueOnce(new Error("Network error"));

      const result = await client.healthcheck();
      expect(result).toBe(false);
    });
  });
});

describe("Domains class methods", () => {
  let client: VlmRun;

  beforeEach(() => {
    client = new VlmRun({
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    });
  });

  describe("getSchema", () => {
    it("should call /schema endpoint with domain and config", async () => {
      const mockResponse: SchemaResponse = {
        json_schema: { type: "object" },
        schema_version: "1.0.0",
        schema_hash: "abc123",
        domain: "document.invoice",
        gql_stmt: "",
        description: "Invoice document type",
      };

      jest
        .spyOn(client.domains["requestor"], "request")
        .mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.domains.getSchema("document.invoice");
      expect(result).toEqual(mockResponse);
      expect(client.domains["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "/schema",
        undefined,
        { domain: "document.invoice", config: expect.any(Object) }
      );
    });

    it("should call /schema endpoint with domain and custom config", async () => {
      const mockResponse: SchemaResponse = {
        json_schema: { type: "object" },
        schema_version: "1.0.0",
        schema_hash: "abc123",
        domain: "document.invoice",
        gql_stmt: "",
        description: "Invoice document type",
      };

      const customConfig = new GenerationConfig({ detail: "hi", confidence: true });

      jest
        .spyOn(client.domains["requestor"], "request")
        .mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.domains.getSchema("document.invoice", customConfig);
      expect(result).toEqual(mockResponse);
      expect(client.domains["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "/schema",
        undefined,
        { 
          domain: "document.invoice", 
          config: {
            detail: "hi",
            json_schema: null,
            confidence: true,
            grounding: false,
            gql_stmt: null,
          }
        }
      );
    });
  });


  describe("list", () => {
    it("should call /domains endpoint", async () => {
      const mockResponse: DomainInfo[] = [
        {
          domain: "document.invoice",
          name: "Invoice",
          description: "Invoice document type",
        },
      ];

      jest
        .spyOn(client.domains["requestor"], "request")
        .mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.domains.list();
      expect(result).toEqual(mockResponse);
      expect(client.domains["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "/domains"
      );
    });
  });
});
