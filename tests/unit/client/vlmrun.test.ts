import { VlmRun } from "../../../src";
import {
  DomainInfo,
  SchemaResponse,
  GenerationConfig,
} from "../../../src/client/types";

describe("VlmRun client-level methods", () => {
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
        .spyOn(client["requestor"], "request")
        .mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.getSchema("document.invoice");
      expect(result).toEqual(mockResponse);
      expect(client["requestor"].request).toHaveBeenCalledWith(
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
        .spyOn(client["requestor"], "request")
        .mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.getSchema("document.invoice", customConfig);
      expect(result).toEqual(mockResponse);
      expect(client["requestor"].request).toHaveBeenCalledWith(
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

  describe("listDomains", () => {
    it("should delegate to domains.list()", async () => {
      const mockResponse: DomainInfo[] = [
        {
          domain: "document.invoice",
          name: "Invoice",
          description: "Invoice document type",
        },
      ];

      jest
        .spyOn(client.domains, "list")
        .mockResolvedValueOnce(mockResponse);

      const result = await client.listDomains();
      expect(result).toEqual(mockResponse);
      expect(client.domains.list).toHaveBeenCalled();
    });
  });
});
