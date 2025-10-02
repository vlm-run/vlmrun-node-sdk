import { config } from "dotenv";
config({ path: ".env.test" });

import { VlmRun } from "../../../src/index";

jest.setTimeout(60000);

describe("Integration: Feedback", () => {
  let client: VlmRun;

  // Sample IDs from environment variables
  const testRequestId = process.env.TEST_REQUEST_ID || "pred_sample_123";
  const testAgentExecutionId =
    process.env.TEST_AGENT_EXECUTION_ID || "exec_sample_456";
  const testChatId = process.env.TEST_CHAT_ID || "chat_sample_789";

  beforeAll(() => {
    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY ?? "",
      baseURL: process.env.TEST_BASE_URL ?? "",
    });
  });

  describe("get()", () => {
    it("should get feedback for a request with default parameters", async () => {
      const result = await client.feedback.get(testRequestId);

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("request_id");
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items.length > 0) {
        const feedback = result.items[0];
        expect(feedback).toHaveProperty("request_id");
        expect(feedback).toHaveProperty("created_at");
        expect(feedback).toHaveProperty("response");
        expect(feedback).toHaveProperty("notes");
      }
    });

    it("should get feedback for a request with custom pagination", async () => {
      const result = await client.feedback.get(testRequestId, {
        limit: 5,
        offset: 0,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("request_id");
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it("should get feedback for an agent execution", async () => {
      const result = await client.feedback.get(testAgentExecutionId, {
        type: "agent_execution",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("agent_execution_id");
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should get feedback for a chat", async () => {
      const result = await client.feedback.get(testChatId, {
        type: "chat",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("chat_id");
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should throw 404 error for non-existent ID", async () => {
      // Use a non-existent ID to test 404 response
      const nonExistentId = "non_existent_id_12345";

      await expect(client.feedback.get(nonExistentId)).rejects.toThrow();
    });

    it("should default to request type when not specified", async () => {
      const result = await client.feedback.get(testRequestId, {
        limit: 3,
        offset: 0,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("request_id");
      expect(result).toHaveProperty("items");
    });
  });

  describe("submit()", () => {
    it("should submit feedback for a request with response and notes", async () => {
      const feedbackData = {
        requestId: testRequestId,
        response: { rating: 5, accuracy: "high", helpful: true },
        notes: "Excellent prediction quality and very helpful",
      };

      const result = await client.feedback.submit(feedbackData);

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("request_id");
      expect(result).toHaveProperty("created_at");
      expect(result.request_id).toBe(testRequestId);
      expect(typeof result.id).toBe("string");
      expect(typeof result.created_at).toBe("string");
    });

    it("should submit feedback for an agent execution with only response", async () => {
      const feedbackData = {
        agentExecutionId: testAgentExecutionId,
        response: { rating: 4, execution_time: "fast", quality: "good" },
      };

      const result = await client.feedback.submit(feedbackData);

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("agent_execution_id");
      expect(result).toHaveProperty("created_at");
      expect(result.agent_execution_id).toBe(testAgentExecutionId);
    });

    it("should submit feedback for a chat with only notes", async () => {
      const feedbackData = {
        chatId: testChatId,
        response: null,
        notes: "The chat was very helpful and provided accurate information",
      };

      const result = await client.feedback.submit(feedbackData);

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("chat_id");
      expect(result).toHaveProperty("created_at");
      expect(result.chat_id).toBe(testChatId);
    });

    it("should submit feedback with minimal response data", async () => {
      const feedbackData = {
        requestId: testRequestId,
        response: { thumbs_up: true },
      };

      const result = await client.feedback.submit(feedbackData);

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("request_id");
      expect(result).toHaveProperty("created_at");
    });

    it("should submit feedback with complex response object", async () => {
      const complexResponse = {
        rating: 5,
        categories: {
          accuracy: "high",
          speed: "fast",
          clarity: "excellent",
        },
        tags: ["helpful", "accurate", "detailed"],
        metrics: {
          response_time: 1.2,
          confidence_score: 0.95,
        },
      };

      const feedbackData = {
        requestId: testRequestId,
        response: complexResponse,
        notes: "Comprehensive feedback with detailed metrics",
      };

      const result = await client.feedback.submit(feedbackData);

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("request_id");
      expect(result).toHaveProperty("created_at");
    });

    it("should throw error when no entity ID is provided", async () => {
      const feedbackData = {
        response: { rating: 5 },
        notes: "Test feedback",
      };

      await expect(client.feedback.submit(feedbackData)).rejects.toThrow(
        "Must provide exactly one of: requestId, agentExecutionId, or chatId"
      );
    });

    it("should throw error when multiple entity IDs are provided", async () => {
      const feedbackData = {
        requestId: testRequestId,
        agentExecutionId: testAgentExecutionId,
        response: { rating: 5 },
      };

      await expect(client.feedback.submit(feedbackData)).rejects.toThrow(
        "Must provide exactly one of: requestId, agentExecutionId, or chatId"
      );
    });

    it("should throw error when both response and notes are null", async () => {
      const feedbackData = {
        requestId: testRequestId,
        response: null,
        notes: null,
      };

      await expect(client.feedback.submit(feedbackData)).rejects.toThrow(
        "`response` or `notes` parameter is required and cannot be null"
      );
    });

    it("should handle feedback submission with undefined notes", async () => {
      const feedbackData = {
        requestId: testRequestId,
        response: { rating: 3 },
        // notes is undefined, not null
      };

      const result = await client.feedback.submit(feedbackData);

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("request_id");
      expect(result).toHaveProperty("created_at");
    });
  });

  describe("integration workflow", () => {
    it("should submit request feedback and then retrieve it", async () => {
      // Submit feedback
      const feedbackData = {
        requestId: testRequestId,
        response: { rating: 5, workflow_test: true },
        notes: "Testing feedback workflow integration",
      };

      const submitResult = await client.feedback.submit(feedbackData);
      expect(submitResult).toBeTruthy();
      expect(submitResult.id).toBeTruthy();

      // Wait a moment for the feedback to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Retrieve feedback
      const getResult = await client.feedback.get(testRequestId);
      expect(getResult).toBeTruthy();
      expect(getResult.items).toBeTruthy();
      expect(Array.isArray(getResult.items)).toBe(true);

      // Check if our submitted feedback is in the list
      const submittedFeedback = getResult.items.find(
        (item) => item.id === submitResult.id
      );
      expect(submittedFeedback).toBeTruthy();
      if (submittedFeedback) {
        expect(submittedFeedback.response).toHaveProperty("rating", 5);
        expect(submittedFeedback.response).toHaveProperty(
          "workflow_test",
          true
        );
        expect(submittedFeedback.notes).toBe(
          "Testing feedback workflow integration"
        );
      }
    });

    it("should submit agent feedback and then retrieve it", async () => {
      // Submit agent execution feedback
      const feedbackData = {
        agentExecutionId: testAgentExecutionId,
        response: {
          rating: 4,
          agent_workflow_test: true,
          performance: "excellent",
        },
        notes: "Testing agent execution feedback workflow integration",
      };

      const submitResult = await client.feedback.submit(feedbackData);
      expect(submitResult).toBeTruthy();
      expect(submitResult.id).toBeTruthy();
      expect(submitResult.agent_execution_id).toBe(testAgentExecutionId);

      // Wait a moment for the feedback to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Retrieve agent execution feedback
      const getResult = await client.feedback.get(testAgentExecutionId, {
        type: "agent_execution",
      });
      expect(getResult).toBeTruthy();
      expect(getResult.items).toBeTruthy();
      expect(Array.isArray(getResult.items)).toBe(true);

      // Check if our submitted feedback is in the list
      const submittedFeedback = getResult.items.find(
        (item) => item.id === submitResult.id
      );
      expect(submittedFeedback).toBeTruthy();
      if (submittedFeedback) {
        expect(submittedFeedback.response).toHaveProperty("rating", 4);
        expect(submittedFeedback.response).toHaveProperty(
          "agent_workflow_test",
          true
        );
        expect(submittedFeedback.response).toHaveProperty(
          "performance",
          "excellent"
        );
        expect(submittedFeedback.notes).toBe(
          "Testing agent execution feedback workflow integration"
        );
      }
    });

    it("should submit chat feedback and then retrieve it", async () => {
      // Submit chat feedback
      const feedbackData = {
        chatId: testChatId,
        response: {
          rating: 5,
          chat_workflow_test: true,
          helpfulness: "very_helpful",
        },
        notes: "Testing chat feedback workflow integration",
      };

      const submitResult = await client.feedback.submit(feedbackData);
      expect(submitResult).toBeTruthy();
      expect(submitResult.id).toBeTruthy();
      expect(submitResult.chat_id).toBe(testChatId);

      // Wait a moment for the feedback to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Retrieve chat feedback
      const getResult = await client.feedback.get(testChatId, {
        type: "chat",
      });
      expect(getResult).toBeTruthy();
      expect(getResult.items).toBeTruthy();
      expect(Array.isArray(getResult.items)).toBe(true);

      // Check if our submitted feedback is in the list
      const submittedFeedback = getResult.items.find(
        (item) => item.id === submitResult.id
      );
      expect(submittedFeedback).toBeTruthy();
      if (submittedFeedback) {
        expect(submittedFeedback.response).toHaveProperty("rating", 5);
        expect(submittedFeedback.response).toHaveProperty(
          "chat_workflow_test",
          true
        );
        expect(submittedFeedback.response).toHaveProperty(
          "helpfulness",
          "very_helpful"
        );
        expect(submittedFeedback.notes).toBe(
          "Testing chat feedback workflow integration"
        );
      }
    });
  });

  describe("error handling", () => {
    it("should throw 404 error for invalid entity ID", async () => {
      const invalidId = "invalid_id_that_does_not_exist";

      // Should throw 404 error for non-existent entity
      await expect(client.feedback.get(invalidId)).rejects.toThrow();
    });

    it("should throw 400 error when no entity ID is provided for feedback submit", async () => {
      const feedbackData = {
        response: { rating: 5, test: true },
        notes: "Test feedback without entity ID",
      };

      // Should throw 400 error for missing entity ID
      await expect(client.feedback.submit(feedbackData)).rejects.toThrow(
        "Must provide exactly one of: requestId, agentExecutionId, or chatId"
      );
    });

    it("should throw 400 error when multiple entity IDs are provided for feedback submit", async () => {
      const feedbackData = {
        requestId: testRequestId,
        agentExecutionId: testAgentExecutionId,
        chatId: testChatId,
        response: { rating: 5, test: true },
        notes: "Test feedback with multiple entity IDs",
      };

      // Should throw 400 error for multiple entity IDs
      await expect(client.feedback.submit(feedbackData)).rejects.toThrow(
        "Must provide exactly one of: requestId, agentExecutionId, or chatId"
      );
    });

    it("should handle very large limit values", async () => {
      const result = await client.feedback.get(testRequestId, {
        limit: 1000,
        offset: 0,
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
    });
  });
});
