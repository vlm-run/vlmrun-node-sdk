import { VlmRun } from "../../../src";
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
