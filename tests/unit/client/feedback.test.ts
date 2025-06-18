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
            notes: "Great result"
          },
          {
            id: "feedback_456",
            created_at: "2023-01-02T00:00:00Z",
            response: { rating: 4 },
            notes: "Good but could be better"
          }
        ]
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.get("pred_123");

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "GET",
        "feedback/pred_123",
        { limit: 10, offset: 0 }
      );
    });

    it("should get feedbacks with custom pagination parameters", async () => {
      const mockResponse = {
        request_id: "pred_456",
        items: []
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.get("pred_456", 5, 10);

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "GET",
        "feedback/pred_456",
        { limit: 5, offset: 10 }
      );
    });

    it("should return empty items when no feedbacks exist", async () => {
      const mockResponse = {
        request_id: "pred_789",
        items: []
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.get("pred_789");

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "GET",
        "feedback/pred_789",
        { limit: 10, offset: 0 }
      );
    });
  });

  describe("submit", () => {
    it("should create feedback with all parameters", async () => {
      const mockResponse = {
        id: "feedback_789",
        request_id: "pred_123",
        created_at: "2023-01-03T00:00:00Z"
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.submit("pred_123", { rating: 5, accuracy: "high" }, "Excellent prediction quality");

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit",
        undefined,
        {
          request_id: "pred_123",
          response: { rating: 5, accuracy: "high" },
          notes: "Excellent prediction quality"
        }
      );
    });

    it("should create feedback with minimal parameters", async () => {
      const mockResponse = {
        id: "feedback_101",
        request_id: "pred_456",
        created_at: "2023-01-04T00:00:00Z"
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.submit("pred_456", { rating: 3 });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit",
        undefined,
        {
          request_id: "pred_456",
          response: { rating: 3 },
          notes: undefined
        }
      );
    });

    it("should create feedback with only response data", async () => {
      const mockResponse = {
        id: "feedback_202",
        request_id: "pred_789",
        created_at: "2023-01-05T00:00:00Z"
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.submit("pred_789", { thumbs_up: true, helpful: true });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit",
        undefined,
        {
          request_id: "pred_789",
          response: { thumbs_up: true, helpful: true },
          notes: undefined
        }
      );
    });

    it("should create feedback with only notes", async () => {
      const mockResponse = {
        id: "feedback_303",
        request_id: "pred_101",
        created_at: "2023-01-06T00:00:00Z"
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.submit("pred_101", null, "The prediction was partially correct but missed some details");

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit",
        undefined,
        {
          request_id: "pred_101",
          response: null,
          notes: "The prediction was partially correct but missed some details"
        }
      );
    });

    it("should throw error when both response and notes are null", async () => {
      await expect(feedback.submit("pred_123", null, null)).rejects.toThrow(
        "`response` or `notes` parameter is required and cannot be null"
      );
    });
  });
});            