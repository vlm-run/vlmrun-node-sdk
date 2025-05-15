import { DomainInfo } from "../../../src/client/types";
import { VlmRun } from "../../../src/index";
import { config } from "dotenv";

jest.setTimeout(60000);

describe("Integration: Domains", () => {
  let client: VlmRun;

  beforeAll(() => {
    config({ path: ".env.test" });

    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY ?? "",
      baseURL: process.env.TEST_BASE_URL,
    });
  });

  describe("listDomains()", () => {
    it("should successfully fetch domains list", async () => {
      const result = await client.domains.list();

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const domain: DomainInfo = result[0];

        expect(domain).toHaveProperty("domain");
      }
    });

    it("should handle API errors with invalid credentials", async () => {
      const clientWithInvalidKey = new VlmRun({
        apiKey: "invalid-api-key",
        baseURL: process.env.TEST_BASE_URL,
      });

      await expect(clientWithInvalidKey.domains.list()).rejects.toThrow();
    });
  });
});
