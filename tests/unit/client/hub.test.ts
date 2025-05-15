import { VlmRun } from "../../../src";
import {
  HubInfoResponse,
  DomainInfo,
  HubSchemaResponse,
} from "../../../src/client/types";

describe("Hub", () => {
  let client: VlmRun;

  beforeEach(() => {
    client = new VlmRun({
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    });
  });

  describe("info", () => {
    it("should return hub info", async () => {
      const mockResponse: HubInfoResponse = {
        version: "1.0.0",
      };

      jest
        .spyOn(client.hub["requestor"], "request")
        .mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.hub.info();
      expect(result).toEqual(mockResponse);
      expect(client.hub["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "/hub/info"
      );
    });

    it("should handle errors", async () => {
      jest
        .spyOn(client.hub["requestor"], "request")
        .mockRejectedValueOnce(new Error("Network error"));

      await expect(client.hub.info()).rejects.toThrow(
        "Failed to check hub health"
      );
    });
  });

  describe("listDomains", () => {
    it("should return list of domains", async () => {
      const mockResponse: DomainInfo[] = [
        {
          domain: "document.invoice",
          name: "Invoice",
          description: "Invoice document type",
        },
      ];

      jest
        .spyOn(client.hub["requestor"], "request")
        .mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.hub.listDomains();
      expect(result).toEqual(mockResponse);
      expect(client.hub["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "/hub/domains"
      );
    });

    it("should handle errors", async () => {
      jest
        .spyOn(client.hub["requestor"], "request")
        .mockRejectedValueOnce(new Error("Network error"));

      await expect(client.hub.listDomains()).rejects.toThrow(
        "Failed to list domains"
      );
    });
  });

  describe("getSchema", () => {
    it("should return schema for domain without gql_stmt", async () => {
      const mockResponse: HubSchemaResponse = {
        json_schema: { type: "object" },
        schema_version: "1.0.0",
        schema_hash: "abc123",
        domain: "document.invoice",
        gql_stmt: "",
        description: "Invoice document type",
      };

      jest
        .spyOn(client.hub["requestor"], "request")
        .mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.hub.getSchema({ domain: "document.invoice" });
      expect(result).toEqual(mockResponse);
      expect(client.hub["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "/hub/schema",
        undefined,
        { domain: "document.invoice" }
      );
    });

    it("should return schema for domain with gql_stmt", async () => {
      const mockResponse: HubSchemaResponse = {
        json_schema: { type: "object" },
        schema_version: "1.0.0",
        schema_hash: "abc123",
        domain: "document.invoice",
        gql_stmt: "query { field }",
        description: "Invoice document type",
      };

      jest
        .spyOn(client.hub["requestor"], "request")
        .mockResolvedValueOnce([mockResponse, 200, {}]);

      const gqlStmt = "query { field }";
      const result = await client.hub.getSchema({
        domain: "document.invoice",
        gql_stmt: gqlStmt,
      });
      expect(result).toEqual(mockResponse);
      expect(client.hub["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "/hub/schema",
        undefined,
        { domain: "document.invoice", gql_stmt: gqlStmt }
      );
    });

    it("should handle errors", async () => {
      jest
        .spyOn(client.hub["requestor"], "request")
        .mockRejectedValueOnce(new Error("Network error"));

      await expect(
        client.hub.getSchema({ domain: "invalid.domain" })
      ).rejects.toThrow("Failed to get schema for domain invalid.domain");
    });
  });
});
