import { config } from "dotenv";
config({ path: ".env.test" });

import { VlmRun } from "../../../src/index";

jest.setTimeout(60000);

describe.skip("Integration: Agent", () => {
  let client: VlmRun;
  const testAgentName =
    process.env.TEST_AGENT_NAME ||
    "4a0c2934-3390-49cd-9fc4-c0c474d06c69/agent-nodesdk";
  const testDocumentUrl =
    "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";

  beforeAll(() => {
    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY ?? "",
      baseURL: process.env.TEST_BASE_URL ?? "",
    });
  });

  describe("execute()", () => {
    it("should execute agent with file URLs", async () => {
      const result = await client.agent.execute({
        name: testAgentName,
        version: "latest",
        urls: [testDocumentUrl],
        batch: true,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("status");
    });
  });
});
