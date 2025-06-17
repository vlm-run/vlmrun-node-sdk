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

  describe("list", () => {
    it("should get feedbacks for a request with default pagination", async () => {
      const mockResponse = {
        data: [
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
        ],
        count: 2,
        limit: 10,
        offset: 0
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.list("pred_123");

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "GET",
        "feedback/pred_123",
        { limit: 10, offset: 0 }
      );
    });

    it("should get feedbacks with custom pagination parameters", async () => {
      const mockResponse = {
        data: [],
        count: 0,
        limit: 5,
        offset: 10
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.list("pred_456", { limit: 5, offset: 10 });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "GET",
        "feedback/pred_456",
        { limit: 5, offset: 10 }
      );
    });

    it("should return empty data when no feedbacks exist", async () => {
      const mockResponse = {
        data: [],
        count: 0,
        limit: 10,
        offset: 0
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await feedback.list("pred_789");

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
        created_at: "2023-01-03T00:00:00Z",
        request_id: "pred_123",
        response: null,
        notes: null
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const feedbackParams = {
        response: { rating: 5, accuracy: "high" },
        notes: "Excellent prediction quality"
      };

      const result = await feedback.submit("pred_123", feedbackParams);

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
        notes: null
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const feedbackParams = {};

      const result = await feedback.submit("pred_456", feedbackParams);

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
        response: null,
        notes: null
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const feedbackParams = {
        response: { thumbs_up: true, helpful: true }
      };
      const result = await feedback.submit("pred_789", feedbackParams);

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
        notes: null
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const feedbackParams = {
        notes: "The prediction was partially correct but missed some details"
      };

      const result = await feedback.submit("pred_101", feedbackParams);

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