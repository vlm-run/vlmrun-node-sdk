import { config } from "dotenv";
config({ path: ".env.test" });

import { VlmRun } from "../../../src/index";
import { AgentCreationConfig } from "../../../src/client/types";

jest.setTimeout(60000);

describe("Integration: Agent", () => {
  let client: VlmRun;
  const testAgentName = process.env.TEST_AGENT_NAME || "resume-analyzer";
  const testDocumentUrl =
    "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";
  const testImageUrl =
    "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/media.tv-news/finance_bb_3_speakers.jpg";
  const faceRedactionPrompt =
    "Detect all the faces in the image, and blur all the faces. Return the URL of the blurred image.";

  beforeAll(() => {
    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY ?? "",
      baseURL: process.env.AGENT_BASE_URL ?? "",
    });
  });

  describe("get()", () => {
    it("should get agent by name", async () => {
      const result = await client.agent.get({
        name: testAgentName,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("status");
      expect(result.name).toBe(testAgentName);
    });

    it("should get agent by ID", async () => {
      // First get an agent to obtain its ID
      const agentByName = await client.agent.get({
        name: testAgentName,
      });

      // Then get the same agent by ID
      const result = await client.agent.get({
        id: agentByName.id,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("status");
      expect(result.id).toBe(agentByName.id);
      expect(result.name).toBe(agentByName.name);
    });

    it("should throw error when multiple parameters are provided", async () => {
      await expect(
        client.agent.get({
          id: "some-id",
          name: testAgentName,
        })
      ).rejects.toThrow("Only one of `id` or `name` or `prompt` can be provided");
    });

    it("should throw error when no parameters are provided", async () => {
      await expect(client.agent.get({})).rejects.toThrow(
        "Either `id` or `name` or `prompt` must be provided"
      );
    });
  });

  describe("list()", () => {
    it("should list all agents successfully", async () => {
      const result = await client.agent.list();

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return agents with required properties", async () => {
      const result = await client.agent.list();

      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const agent = result[0];
        expect(agent).toHaveProperty("id");
        expect(agent).toHaveProperty("name");
        expect(agent).toHaveProperty("status");
        expect(agent).toHaveProperty("created_at");
        expect(agent).toHaveProperty("updated_at");

        // Verify property types
        expect(typeof agent.id).toBe("string");
        expect(typeof agent.name).toBe("string");
        expect(typeof agent.status).toBe("string");
        expect(typeof agent.created_at).toBe("string");
        expect(typeof agent.updated_at).toBe("string");
      }
    });

    it("should include the test agent in the list", async () => {
      const result = await client.agent.list();

      expect(Array.isArray(result)).toBe(true);

      // Find the test agent in the list
      const testAgent = result.find((agent) => agent.name === testAgentName);
      expect(testAgent).toBeTruthy();

      if (testAgent) {
        expect(testAgent.name).toBe(testAgentName);
        expect(testAgent).toHaveProperty("id");
        expect(testAgent).toHaveProperty("status");
      }
    });
  });

  describe("create()", () => {
    const testAgentNameForCreation = `test-face-redaction-${Date.now()}`;

    it("should create agent with config object", async () => {
      const result = await client.agent.create({
        name: testAgentNameForCreation,
        inputs: {
          image: testImageUrl,
        },
        config: {
          prompt: faceRedactionPrompt,
        },
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("created_at");
      expect(result).toHaveProperty("updated_at");
      expect(result.name).toBe(testAgentNameForCreation);
      expect(typeof result.id).toBe("string");
    });

    it("should create agent with AgentCreationConfig class", async () => {
      const config = new AgentCreationConfig({
        prompt: faceRedactionPrompt,
      });

      const result = await client.agent.create({
        name: `${testAgentNameForCreation}-config-class`,
        inputs: {
          image: testImageUrl,
        },
        config: config,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("status");
      expect(result.name).toBe(`${testAgentNameForCreation}-config-class`);
    });

    it("should create agent with inputs and callback URL", async () => {
      const callbackUrl = "https://webhook.example.com/agent-callback";

      const result = await client.agent.create({
        name: `${testAgentNameForCreation}-with-callback`,
        inputs: {
          image: testImageUrl,
          additionalParam: "test value",
        },
        config: {
          prompt: faceRedactionPrompt,
        },
        callbackUrl: callbackUrl,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("status");
      expect(result.name).toBe(`${testAgentNameForCreation}-with-callback`);
    });

    it("should create agent without specifying name (auto-generated)", async () => {
      const result = await client.agent.create({
        inputs: {
          image: testImageUrl,
        },
        config: {
          prompt: faceRedactionPrompt,
        },
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("status");
      expect(typeof result.name).toBe("string");
      expect(result.name.length).toBeGreaterThan(0);
    });

    it("should throw error when prompt is missing", async () => {
      await expect(
        client.agent.create({
          name: "test-agent-no-prompt",
          inputs: {
            image: testImageUrl,
          },
          config: {
            // No prompt provided
          },
        })
      ).rejects.toThrow(
        "Prompt is not provided as a request parameter, please provide a prompt"
      );
    });

    it("should create agent and verify it can be retrieved", async () => {
      const createResult = await client.agent.create({
        name: `${testAgentNameForCreation}-verify`,
        inputs: {
          image: testImageUrl,
        },
        config: {
          prompt: faceRedactionPrompt,
        },
      });

      expect(createResult).toBeTruthy();
      expect(createResult.id).toBeDefined();

      // Verify the created agent can be retrieved by ID
      const getResult = await client.agent.get({
        id: createResult.id,
      });

      expect(getResult).toBeTruthy();
      expect(getResult.id).toBe(createResult.id);
      expect(getResult.name).toBe(createResult.name);
    });
  });
});
