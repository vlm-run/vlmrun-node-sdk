import { VlmRun } from "../../../src";
import { DomainInfo } from "../../../src/client/types";

describe("Domains", () => {
  let client: VlmRun;

  beforeEach(() => {
    client = new VlmRun({
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
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
        .spyOn(client.domains["requestor"], "request")
        .mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.domains.list();
      expect(result).toEqual(mockResponse);
      expect(client.domains["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "/domains"
      );
    });

    it("should handle errors", async () => {
      jest
        .spyOn(client.domains["requestor"], "request")
        .mockRejectedValueOnce(new Error("Network error"));

      await expect(client.domains.list()).rejects.toThrow(
        "Failed to list domains"
      );
    });
  });
});
