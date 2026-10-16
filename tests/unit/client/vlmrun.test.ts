import { VlmRun, DEFAULT_BASE_URL, ConfigurationError } from "../../../src";
import {
  DomainInfo,
  SchemaResponse,
  GenerationConfig,
} from "../../../src/client/types";

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

describe("VlmRun configuration", () => {
  const saved = {
    apiKey: process.env.VLMRUN_API_KEY,
    baseURL: process.env.VLMRUN_BASE_URL,
  };

  beforeEach(() => {
    delete process.env.VLMRUN_API_KEY;
    delete process.env.VLMRUN_BASE_URL;
  });

  afterAll(() => {
    if (saved.apiKey !== undefined) process.env.VLMRUN_API_KEY = saved.apiKey;
    if (saved.baseURL !== undefined) process.env.VLMRUN_BASE_URL = saved.baseURL;
  });

  it("falls back to VLMRUN_API_KEY and VLMRUN_BASE_URL", () => {
    process.env.VLMRUN_API_KEY = "env-key";
    process.env.VLMRUN_BASE_URL = "https://env.example.com/v1";
    const client = new VlmRun();
    expect(client["client"].apiKey).toBe("env-key");
    expect(client["client"].baseURL).toBe("https://env.example.com/v1");
  });

  it("prefers explicit options over the environment", () => {
    process.env.VLMRUN_API_KEY = "env-key";
    process.env.VLMRUN_BASE_URL = "https://env.example.com/v1";
    const client = new VlmRun({
      apiKey: "explicit-key",
      baseURL: "https://explicit.example.com/v1",
    });
    expect(client["client"].apiKey).toBe("explicit-key");
    expect(client["client"].baseURL).toBe("https://explicit.example.com/v1");
  });

  it("defaults the base URL", () => {
    const client = new VlmRun({ apiKey: "k" });
    expect(client["client"].baseURL).toBe(DEFAULT_BASE_URL);
  });

  it("throws ConfigurationError when the API key is missing", () => {
    expect(() => new VlmRun()).toThrow(ConfigurationError);
  });

  it("allows a missing API key when requireApiKey is false", () => {
    const client = new VlmRun({ requireApiKey: false });
    expect(client["client"].apiKey).toBe("");
    expect(client.gateway.baseUrl).toBe("https://gateway.vlm.run/v1");
  });
});
