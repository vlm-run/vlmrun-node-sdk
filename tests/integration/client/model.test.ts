import { ModelInfoResponse } from "../../../src/client/types";
import { VlmRun } from "../../../src/index";
import { config } from 'dotenv';

jest.setTimeout(60000);

describe("Integration: Models", () => {
  let client: VlmRun;

  beforeAll(() => {
    config({ path: '.env.test' });
    
    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY ?? '',
      baseURL: process.env.TEST_BASE_URL,
    });
  });

  describe("list()", () => {
    it("should successfully fetch models list", async () => {
      const result = await client.models.list();

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const model: ModelInfoResponse = result[0];
        expect(model).toHaveProperty("model");
        expect(model).toHaveProperty("domain");
      }
    });

    it("should handle API errors", async () => {
      const clientWithInvalidKey = new VlmRun({
        apiKey: "invalid-api-key",
        baseURL: process.env.TEST_BASE_URL,
      });

      await expect(clientWithInvalidKey.models.list()).rejects.toThrow();
    });
  });
});
