import { Client } from "../../../src/client/base_requestor";
import { VideoPredictions } from "../../../src/client/predictions";

jest.mock("../../../src/client/base_requestor");

describe("VideoPredictions", () => {
  let client: jest.Mocked<Client>;
  let videoPredictions: ReturnType<typeof VideoPredictions>;
  let requestMock: jest.SpyInstance;

  beforeEach(() => {
    client = {
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    } as jest.Mocked<Client>;

    videoPredictions = VideoPredictions(client);
    requestMock = jest.spyOn(videoPredictions["requestor"], "request");
  });

  afterEach(() => {
    requestMock.mockReset();
  });

  describe("generate", () => {
    it("should generate video predictions with fileId and default options", async () => {
      const mockResponse = { id: "pred_123", status: "completed" };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await videoPredictions.generate({
        fileId: "video1.mp4",
        model: "model1",
        domain: "video.transcription",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "/video/generate",
        undefined,
        {
          file_id: "video1.mp4",
          model: "model1",
          domain: "video.transcription",
          batch: true,
          config: {
            confidence: false,
            detail: "auto",
            grounding: false,
            gql_stmt: null,
            json_schema: undefined,
          },
          metadata: {
            environment: "dev",
            session_id: undefined,
            allow_training: true,
          },
          callback_url: undefined,
        }
      );
    });

    it("should generate video predictions with fileId and custom options", async () => {
      const mockResponse = { id: "pred_456", status: "pending" };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await videoPredictions.generate({
        fileId: "video2.avi",
        model: "video-large",
        domain: "video.analysis",
        batch: true,
        config: {
          confidence: true,
          detail: "hi",
          grounding: true,
        },
        metadata: {
          environment: "prod",
          sessionId: "session_123",
          allowTraining: false,
        },
        callbackUrl: "https://example.com/callback",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "/video/generate",
        undefined,
        {
          file_id: "video2.avi",
          model: "video-large",
          domain: "video.analysis",
          batch: true,
          config: {
            confidence: true,
            detail: "hi",
            grounding: true,
            gql_stmt: null,
            json_schema: undefined,
          },
          metadata: {
            environment: "prod",
            session_id: "session_123",
            allow_training: false,
          },
          callback_url: "https://example.com/callback",
        }
      );
    });

    it("should generate video predictions with URL", async () => {
      const mockResponse = { id: "pred_789", status: "completed" };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await videoPredictions.generate({
        url: "https://example.com/video.mp4",
        model: "model1",
        domain: "video.transcription",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "/video/generate",
        undefined,
        {
          url: "https://example.com/video.mp4",
          model: "model1",
          domain: "video.transcription",
          batch: true,
          config: {
            confidence: false,
            detail: "auto",
            grounding: false,
            gql_stmt: null,
            json_schema: undefined,
          },
          metadata: {
            environment: "dev",
            session_id: undefined,
            allow_training: true,
          },
          callback_url: undefined,
        }
      );
    });

    it("should generate video predictions with URL and custom options", async () => {
      const mockResponse = { id: "pred_101112", status: "pending" };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await videoPredictions.generate({
        url: "https://example.com/lecture.mov",
        model: "video-large",
        domain: "video.summary",
        batch: true,
        config: {
          confidence: true,
          detail: "lo",
          grounding: false,
        },
        metadata: {
          environment: "staging",
          sessionId: null,
          allowTraining: true,
        },
        callbackUrl: "https://webhook.site/callback",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "/video/generate",
        undefined,
        {
          url: "https://example.com/lecture.mov",
          model: "video-large",
          domain: "video.summary",
          batch: true,
          config: {
            confidence: true,
            detail: "lo",
            grounding: false,
            gql_stmt: null,
            json_schema: undefined,
          },
          metadata: {
            environment: "staging",
            session_id: null,
            allow_training: true,
          },
          callback_url: "https://webhook.site/callback",
        }
      );
    });

    it("should throw an error when neither fileId nor url are provided", async () => {
      await expect(
        videoPredictions.generate({
          model: "model1",
          domain: "video.transcription",
        })
      ).rejects.toThrow("Either `fileId` or `url` must be provided");

      expect(requestMock).not.toHaveBeenCalled();
    });

    it("should throw an error when both fileId and url are provided", async () => {
      await expect(
        videoPredictions.generate({
          fileId: "video1.mp4",
          url: "https://example.com/video.mp4",
          model: "model1",
          domain: "video.transcription",
        })
      ).rejects.toThrow("Only one of `fileId` or `url` can be provided");

      expect(requestMock).not.toHaveBeenCalled();
    });

    it("should handle API error responses", async () => {
      const errorResponse = { error: "Invalid video format" };
      requestMock.mockRejectedValue(new Error("API Error"));

      await expect(
        videoPredictions.generate({
          fileId: "invalid-video.txt",
          model: "model1",
          domain: "video.transcription",
        })
      ).rejects.toThrow("API Error");

      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "/video/generate",
        undefined,
        {
          file_id: "invalid-video.txt",
          model: "model1",
          domain: "video.transcription",
          batch: true,
          config: {
            confidence: false,
            detail: "auto",
            grounding: false,
            gql_stmt: null,
            json_schema: undefined,
          },
          metadata: {
            environment: "dev",
            session_id: undefined,
            allow_training: true,
          },
          callback_url: undefined,
        }
      );
    });
  });
});
