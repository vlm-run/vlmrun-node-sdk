import { HubDomainInfo } from "../../../src/client/types";
import { VlmRun } from "../../../src/index";
import { config } from "dotenv";

jest.setTimeout(60000);

describe("Integration: Hubs", () => {
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
      const result = await client.hub.listDomains();

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const domain: HubDomainInfo = result[0];

        expect(domain).toHaveProperty("domain");
      }
    });
  });

  describe("info()", () => {
    it("should successfully fetch info", async () => {
      const result = await client.hub.info();

      expect(result).toHaveProperty("version");
    });
  });

  describe("getSchema()", () => {
    it("should successfully fetch schema without gql_stmt", async () => {
      const result = await client.hub.getSchema({ domain: 'document.invoice' });
      expect(result).toHaveProperty("json_schema");
      expect(result).toHaveProperty("schema_version");
      expect(result).toHaveProperty("schema_hash");
    });
  });
});
