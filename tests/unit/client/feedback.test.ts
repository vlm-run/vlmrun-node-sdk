import { Client } from "../../../src/client/base_requestor";
import { Feedback } from "../../../src/client/feedback";

jest.mock("../../../src/client/base_requestor");

describe("Feedback", () => {
  let client: jest.Mocked<Client>;
  let feedback: Feedback;
  let requestMock: jest.SpyInstance;

  beforeEach(() => {
    client = {
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    } as jest.Mocked<Client>;
    feedback = new Feedback(client);
    requestMock = jest.spyOn(feedback["requestor"], "request");
  });

  afterEach(() => {
    requestMock.mockReset();
  });

  describe("get", () => {
    it("should get feedbacks for a request with default pagination", async () => {
      const mockResponse = {
        request_id: "pred_123",
        items: [
          {
            id: "feedback_123",
            created_at: "2023-01-01T00:00:00Z",
            response: { rating: 5 },
            notes: "Great result",
          },
          {
            id: "feedback_456",
            created_at: "2023-01-02T00:00:00Z",
            response: { rating: 4 },
            notes: "Good but could be better",
          },
        ],
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.get("pred_123");

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith("GET", "feedback/pred_123", {
        type: "request",
        limit: 10,
        offset: 0,
      });
    });

    it("should get feedbacks with custom pagination parameters", async () => {
      const mockResponse = {
        request_id: "pred_456",
        items: [],
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.get("pred_456", { limit: 5, offset: 10 });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith("GET", "feedback/pred_456", {
        type: "request",
        limit: 5,
        offset: 10,
      });
    });

    it("should return empty items when no feedbacks exist", async () => {
      const mockResponse = {
        request_id: "pred_789",
        items: [],
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.get("pred_789");

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith("GET", "feedback/pred_789", {
        type: "request",
        limit: 10,
        offset: 0,
      });
    });

    it("should get feedbacks with type parameter", async () => {
      const mockResponse = {
        agent_execution_id: "exec_456",
        items: [
          {
            id: "feedback_123",
            agent_execution_id: "exec_456",
            created_at: "2023-01-01T00:00:00Z",
            response: { rating: 5 },
            notes: "Great result",
          },
        ],
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.get("exec_456", {
        type: "agent_execution",
        limit: 5,
        offset: 10,
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith("GET", "feedback/exec_456", {
        type: "agent_execution",
        limit: 5,
        offset: 10,
      });
    });

    it("should default to request type when not specified", async () => {
      const mockResponse = {
        request_id: "pred_123",
        items: [],
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.get("pred_123", { limit: 5 });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith("GET", "feedback/pred_123", {
        type: "request",
        limit: 5,
        offset: 0,
      });
    });

    it("should get feedbacks for chat type", async () => {
      const mockResponse = {
        chat_id: "chat_789",
        items: [
          {
            id: "feedback_456",
            chat_id: "chat_789",
            created_at: "2023-01-02T00:00:00Z",
            response: { helpful: true },
            notes: "Very helpful chat",
          },
        ],
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.get("chat_789", {
        type: "chat",
        limit: 20,
        offset: 5,
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith("GET", "feedback/chat_789", {
        type: "chat",
        limit: 20,
        offset: 5,
      });
    });
  });

  describe("submit", () => {
    it("should create feedback with request_id using options object", async () => {
      const mockResponse = {
        id: "feedback_789",
        request_id: "pred_123",
        created_at: "2023-01-03T00:00:00Z",
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.submit({
        requestId: "pred_123",
        response: { rating: 5, accuracy: "high" },
        notes: "Excellent prediction quality",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit",
        undefined,
        {
          request_id: "pred_123",
          agent_execution_id: null,
          chat_id: null,
          response: { rating: 5, accuracy: "high" },
          notes: "Excellent prediction quality",
        }
      );
    });

    it("should create feedback with agent_execution_id", async () => {
      const mockResponse = {
        id: "feedback_890",
        agent_execution_id: "exec_456",
        created_at: "2023-01-03T00:00:00Z",
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.submit({
        agentExecutionId: "exec_456",
        response: { rating: 4 },
        notes: "Good execution",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit",
        undefined,
        {
          request_id: null,
          agent_execution_id: "exec_456",
          chat_id: null,
          response: { rating: 4 },
          notes: "Good execution",
        }
      );
    });

    it("should create feedback with chat_id", async () => {
      const mockResponse = {
        id: "feedback_901",
        chat_id: "chat_789",
        created_at: "2023-01-03T00:00:00Z",
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.submit({
        chatId: "chat_789",
        response: { helpful: true },
        notes: "Helpful chat",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit",
        undefined,
        {
          request_id: null,
          agent_execution_id: null,
          chat_id: "chat_789",
          response: { helpful: true },
          notes: "Helpful chat",
        }
      );
    });

    it("should create feedback with minimal parameters", async () => {
      const mockResponse = {
        id: "feedback_101",
        request_id: "pred_456",
        created_at: "2023-01-04T00:00:00Z",
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.submit({
        requestId: "pred_456",
        response: { rating: 3 },
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit",
        undefined,
        {
          request_id: "pred_456",
          agent_execution_id: null,
          chat_id: null,
          response: { rating: 3 },
          notes: undefined,
        }
      );
    });

    it("should create feedback with only response data", async () => {
      const mockResponse = {
        id: "feedback_202",
        request_id: "pred_789",
        created_at: "2023-01-05T00:00:00Z",
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.submit({
        requestId: "pred_789",
        response: { thumbs_up: true, helpful: true },
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit",
        undefined,
        {
          request_id: "pred_789",
          agent_execution_id: null,
          chat_id: null,
          response: { thumbs_up: true, helpful: true },
          notes: undefined,
        }
      );
    });

    it("should create feedback with only notes", async () => {
      const mockResponse = {
        id: "feedback_303",
        request_id: "pred_101",
        created_at: "2023-01-06T00:00:00Z",
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.submit({
        requestId: "pred_101",
        response: null,
        notes: "The prediction was partially correct but missed some details",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit",
        undefined,
        {
          request_id: "pred_101",
          agent_execution_id: null,
          chat_id: null,
          response: null,
          notes: "The prediction was partially correct but missed some details",
        }
      );
    });

    it("should throw error when no ID is provided", async () => {
      await expect(
        feedback.submit({
          response: { rating: 5 },
          notes: "Test",
        })
      ).rejects.toThrow(
        "Must provide exactly one of: requestId, agentExecutionId, or chatId"
      );
    });

    it("should throw error when multiple IDs are provided", async () => {
      await expect(
        feedback.submit({
          requestId: "pred_123",
          agentExecutionId: "exec_456",
          response: { rating: 5 },
        })
      ).rejects.toThrow(
        "Must provide exactly one of: requestId, agentExecutionId, or chatId"
      );
    });

    it("should throw error when both response and notes are null", async () => {
      await expect(
        feedback.submit({
          requestId: "pred_123",
          response: null,
          notes: null,
        })
      ).rejects.toThrow(
        "`response` or `notes` parameter is required and cannot be null"
      );
    });
  });
});
