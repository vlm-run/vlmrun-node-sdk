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

  describe("getFeedbacks", () => {
    it("should get feedbacks for a request", async () => {
      const mockResponse = [
        {
          id: "feedback_123",
          created_at: "2023-01-01T00:00:00Z",
          request_id: "pred_123",
          response: { rating: 5 },
          notes: "Great result"
        },
        {
          id: "feedback_456",
          created_at: "2023-01-02T00:00:00Z",
          request_id: "pred_123",
          response: { rating: 4 },
          notes: "Good but could be better"
        }
      ];
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.getFeedbacks("pred_123");

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "GET",
        "feedback/pred_123"
      );
    });

    it("should return empty array when no feedbacks exist", async () => {
      const mockResponse: any[] = [];
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.getFeedbacks("pred_456");

      expect(result).toEqual([]);
      expect(requestMock).toHaveBeenCalledWith(
        "GET",
        "feedback/pred_456"
      );
    });
  });

  describe("createFeedback", () => {
    it("should create feedback with all parameters", async () => {
      const mockResponse = {
        id: "feedback_789",
        created_at: "2023-01-03T00:00:00Z",
        request_id: "pred_123",
        response: { rating: 5, accuracy: "high" },
        notes: "Excellent prediction quality"
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const feedbackParams = {
        request_id: "pred_123",
        response: { rating: 5, accuracy: "high" },
        notes: "Excellent prediction quality"
      };

      const result = await feedback.createFeedback(feedbackParams);

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit/pred_123",
        undefined,
        feedbackParams
      );
    });

    it("should create feedback with minimal parameters", async () => {
      const mockResponse = {
        id: "feedback_101",
        created_at: "2023-01-04T00:00:00Z",
        request_id: "pred_456",
        response: null,
        notes: undefined
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const feedbackParams = {
        request_id: "pred_456",
      };

      const result = await feedback.createFeedback(feedbackParams);

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit/pred_456",
        undefined,
        feedbackParams
      );
    });

    it("should create feedback with only response data", async () => {
      const mockResponse = {
        id: "feedback_202",
        created_at: "2023-01-05T00:00:00Z",
        request_id: "pred_789",
        response: { thumbs_up: true, helpful: true },
        notes: undefined
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const feedbackParams = {
        request_id: "pred_789",
        response: { thumbs_up: true, helpful: true }
      };
      const result = await feedback.createFeedback(feedbackParams);

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit/pred_789",
        undefined,
        feedbackParams
      );
    });

    it("should create feedback with only notes", async () => {
      const mockResponse = {
        id: "feedback_303",
        created_at: "2023-01-06T00:00:00Z",
        request_id: "pred_101",
        response: null,
        notes: "The prediction was partially correct but missed some details"
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const feedbackParams = {
        request_id: "pred_101",
        notes: "The prediction was partially correct but missed some details"
      };

      const result = await feedback.createFeedback(feedbackParams);

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "feedback/submit/pred_101",
        undefined,
        feedbackParams
      );
    });
  });
}); 