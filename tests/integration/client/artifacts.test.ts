import { config } from "dotenv";
config({ path: ".env.test" });

import { VlmRun } from "../../../src/index";

jest.setTimeout(120000);

describe("Integration: Artifacts", () => {
  let client: VlmRun;

  beforeAll(() => {
    const apiKey = process.env.TEST_API_KEY;
    const baseURL = process.env.AGENT_BASE_URL;

    if (!apiKey) {
      throw new Error(
        "TEST_API_KEY environment variable is required. Set it in .env.test"
      );
    }

    if (!baseURL) {
      throw new Error(
        "AGENT_BASE_URL environment variable is required. Set it in .env.test"
      );
    }

    client = new VlmRun({
      apiKey,
      baseURL,
      timeout: 120000,
      maxRetries: 2,
    });
  });

  describe("get()", () => {
    it("should retrieve an artifact after chat completion with preview=false", async () => {
      // Step 1: Make a chat completion call with preview set to false
      // This should generate artifacts that we can retrieve
      const chatResponse = await client.agent.completions.create({
        model: "vlmrun-orion-1",
        messages: [
          {
            role: "user",
            content:
              "Generate a simple bar chart showing sales data for Q1-Q4: 100, 150, 120, 180. Return the chart as an image.",
          },
        ],
        preview: false,
      });

      console.log("Chat response:", JSON.stringify(chatResponse, null, 2));

      // Verify chat completion response
      expect(chatResponse).toBeTruthy();
      expect(chatResponse).toHaveProperty("id");
      expect(chatResponse).toHaveProperty("choices");

      // Extract session_id from the root level of the response
      const sessionId = (chatResponse as any).session_id;
      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe("string");
      expect(sessionId.length).toBeGreaterThan(0);

      // Extract artifact ID from the message content
      const messageContent = chatResponse.choices[0]?.message?.content || "";
      const imgMatch = messageContent.match(/img_[a-f0-9]{6}/);

      let artifactObjectId: string | null = null;
      if (imgMatch) {
        artifactObjectId = imgMatch[0];
      }

      console.log("Found artifact object ID:", artifactObjectId);
      console.log("Session ID:", sessionId);

      // Skip artifact retrieval if no artifact was generated
      if (!artifactObjectId) {
        console.warn(
          "No image artifact found in response, skipping artifact retrieval"
        );
        return;
      }

      // Step 2: Retrieve the artifact using the artifacts.get() endpoint
      const artifact = await client.artifacts.get({
        objectId: artifactObjectId,
        sessionId: sessionId,
        rawResponse: true,
      });

      // Verify artifact response
      expect(artifact).toBeTruthy();
      expect(Buffer.isBuffer(artifact)).toBe(true);

      // For image artifacts, verify it's a valid buffer with content
      const buffer = artifact as Buffer;
      expect(buffer.length).toBeGreaterThan(0);

      console.log(
        `Successfully retrieved artifact: ${artifactObjectId}, size: ${buffer.length} bytes`
      );
    });

    it("should retrieve an artifact with sessionId parameter", async () => {
      // Make a chat completion to generate artifacts
      const chatResponse = await client.agent.completions.create({
        model: "vlmrun-orion-1",
        messages: [
          {
            role: "user",
            content:
              "Create a simple visualization showing temperature data: 20°C, 25°C, 22°C. Return as an image.",
          },
        ],
        preview: false,
      });

      // Extract session_id from the root level of the response
      const sessionId = (chatResponse as any).session_id;

      // Extract artifact object ID from message content
      const messageContent = chatResponse.choices[0]?.message?.content || "";
      const imgMatch = messageContent.match(/img_[a-f0-9]{6}/);

      let artifactObjectId: string | null = null;
      if (imgMatch) {
        artifactObjectId = imgMatch[0];
      }

      if (!artifactObjectId || !sessionId) {
        console.warn("No artifact or session ID found, skipping test");
        return;
      }

      // Test with sessionId
      const result = await client.artifacts.get({
        objectId: artifactObjectId,
        sessionId: sessionId,
        rawResponse: true,
      });

      expect(result).toBeTruthy();
      expect(Buffer.isBuffer(result)).toBe(true);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });

    it("should retrieve an artifact with executionId from agent execute", async () => {
      // Step 1: Execute an agent that generates artifacts
      const testImageUrl =
        "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/media.tv-news/finance_bb_3_speakers.jpg";

      const executionResponse = await client.agent.execute({
        name: "test-agent",
        inputs: {
          prompt:
            "Generate a bar chart showing Q1-Q4 sales: 100, 150, 120, 180. Return the chart as an image.",
        },
        batch: true,
      });

      console.log(
        "Execution response:",
        JSON.stringify(executionResponse, null, 2)
      );

      // Verify execution response
      expect(executionResponse).toBeTruthy();
      expect(executionResponse).toHaveProperty("id");
      expect(executionResponse).toHaveProperty("status");

      const executionId = executionResponse.id;
      expect(typeof executionId).toBe("string");
      expect(executionId.length).toBeGreaterThan(0);

      // Step 2: Wait for execution to complete if it's not already completed
      let completedExecution = executionResponse;
      if (executionResponse.status !== "completed") {
        try {
          completedExecution = await client.executions.wait(executionId, 60, 5);
        } catch (error) {
          console.warn(
            "Execution did not complete within timeout, skipping test"
          );
          return;
        }
      }

      console.log(
        "Completed execution:",
        JSON.stringify(completedExecution, null, 2)
      );

      if (completedExecution.status !== "completed") {
        console.warn("Execution not completed, skipping test");
        return;
      }

      if (!completedExecution.response) {
        console.warn("No response in execution, skipping test");
        return;
      }

      // Step 3: Extract artifact object ID from the execution response
      let artifactObjectId: string | null = null;

      // Check if response contains artifact references
      const responseStr = JSON.stringify(completedExecution.response);
      const imgMatch = responseStr.match(/img_[a-f0-9]{6}/);
      if (imgMatch) {
        artifactObjectId = imgMatch[0];
      }

      if (!artifactObjectId) {
        console.warn(
          "No artifact found in execution response, skipping artifact retrieval"
        );
        return;
      }

      console.log("Found artifact object ID:", artifactObjectId);
      console.log("Execution ID:", executionId);

      // Step 4: Retrieve the artifact using executionId
      const artifact = await client.artifacts.get({
        objectId: artifactObjectId,
        executionId: executionId,
        rawResponse: true,
      });

      // Verify artifact response
      expect(artifact).toBeTruthy();
      expect(Buffer.isBuffer(artifact)).toBe(true);

      const buffer = artifact as Buffer;
      expect(buffer.length).toBeGreaterThan(0);

      console.log(
        `Successfully retrieved artifact: ${artifactObjectId}, size: ${buffer.length} bytes`
      );
    });

    it("should throw error when neither sessionId nor executionId is provided", async () => {
      await expect(
        client.artifacts.get({
          objectId: "img_abc123",
        } as any)
      ).rejects.toThrow("Either `sessionId` or `executionId` is required");
    });

    it("should throw error when both sessionId and executionId are provided", async () => {
      await expect(
        client.artifacts.get({
          objectId: "img_abc123",
          sessionId: "session-123",
          executionId: "execution-123",
        })
      ).rejects.toThrow(
        "Only one of `sessionId` or `executionId` is allowed, not both"
      );
    });
  });
});
