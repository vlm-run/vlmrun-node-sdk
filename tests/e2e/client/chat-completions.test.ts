import { config } from "dotenv";
config({ path: ".env.test" });

// Import from the built dist folder
import { VlmRun } from "../../../dist";

jest.setTimeout(120000);

describe("E2E: Chat Completions", () => {
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
      timeout: 60000,
      maxRetries: 2,
    });
  });

  describe("agent.completions", () => {
    describe("create()", () => {
      it("should create a basic chat completion", async () => {
        const response = await client.agent.completions.create({
          model: "vlmrun-orion-1",
          messages: [
            {
              role: "user",
              content: "Say 'Hello, World!' and nothing else.",
            },
          ],
        });

        expect(response).toBeTruthy();
        expect(response).toHaveProperty("id");
        expect(response).toHaveProperty("choices");
        expect(response).toHaveProperty("model");
        expect(response).toHaveProperty("usage");

        expect(Array.isArray(response.choices)).toBe(true);
        expect(response.choices.length).toBeGreaterThan(0);

        const choice = response.choices[0];
        expect(choice).toHaveProperty("message");
        expect(choice.message).toHaveProperty("role", "assistant");
        expect(choice.message).toHaveProperty("content");
        expect(typeof choice.message.content).toBe("string");
      });

      it("should handle multi-turn conversation", async () => {
        const response = await client.agent.completions.create({
          model: "vlmrun-orion-1",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that responds concisely.",
            },
            {
              role: "user",
              content: "What is 2 + 2?",
            },
            {
              role: "assistant",
              content: "4",
            },
            {
              role: "user",
              content: "What is 3 + 3?",
            },
          ],
        });
        console.log(response);

        expect(response).toBeTruthy();
        expect(response.choices).toBeTruthy();
        expect(response.choices.length).toBeGreaterThan(0);

        const choice = response.choices[0];
        expect(choice.message.role).toBe("assistant");
        expect(choice.message.content).toBeTruthy();
      });

      it("should include usage statistics in response when available", async () => {
        const response = await client.agent.completions.create({
          model: "vlmrun-orion-1",
          messages: [
            {
              role: "user",
              content: "Hi",
            },
          ],
        });

        expect(response).toBeTruthy();

        // Usage statistics may or may not be included depending on the model/endpoint
        if (response.usage) {
          const { usage } = response;
          expect(typeof usage.prompt_tokens).toBe("number");
          expect(typeof usage.completion_tokens).toBe("number");
          expect(typeof usage.total_tokens).toBe("number");
          expect(usage.total_tokens).toBe(
            usage.prompt_tokens + usage.completion_tokens
          );
        } else {
          // If usage is not provided, that's acceptable
          expect(response.usage).toBeNull();
        }
      });
    });

    describe("streaming", () => {
      it("should handle streaming responses", async () => {
        const stream = await client.agent.completions.create({
          model: "vlmrun-orion-1",
          messages: [
            {
              role: "user",
              content: "Count from 1 to 5.",
            },
          ],
          stream: true,
        });

        expect(stream).toBeTruthy();

        const chunks: string[] = [];
        for await (const chunk of stream) {
          expect(chunk).toHaveProperty("id");
          expect(chunk).toHaveProperty("choices");

          if (chunk.choices[0]?.delta?.content) {
            chunks.push(chunk.choices[0].delta.content);
          }
        }

        expect(chunks.length).toBeGreaterThan(0);
        const fullContent = chunks.join("");
        expect(fullContent.length).toBeGreaterThan(0);
      });
    });
  });
});
