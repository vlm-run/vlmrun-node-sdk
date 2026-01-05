import { config } from "dotenv";
config({ path: ".env.test" });

import { VlmRun } from "../../../src/index";

jest.setTimeout(60000);

describe("Integration: Health Check", () => {
  let client: VlmRun;

  beforeAll(() => {
    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY ?? "",
      baseURL: process.env.AGENT_BASE_URL ?? "",
    });
  });

  describe("healthcheck()", () => {
    it("should return true when API is healthy", async () => {
      const result = await client.healthcheck();

      expect(result).toBe(true);
    });

    it("should verify health check can be called multiple times", async () => {
      const result1 = await client.healthcheck();
      const result2 = await client.healthcheck();
      const result3 = await client.healthcheck();

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });
  });

  describe("healthcheck() with invalid configuration", () => {
    it("should return false when API endpoint is unreachable", async () => {
      const invalidClient = new VlmRun({
        apiKey: "invalid-key",
        baseURL: "https://invalid-domain-that-does-not-exist.com/v1",
        timeout: 5000, // 5 seconds timeout for faster test
      });

      const result = await invalidClient.healthcheck();

      expect(result).toBe(false);
    });
  });
});
