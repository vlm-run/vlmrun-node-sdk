import { Client } from "../../../src/client/base_requestor";
import { AudioPredictions } from "../../../src/client/predictions";

jest.mock("../../../src/client/base_requestor");

describe("AudioPredictions", () => {
  let client: jest.Mocked<Client>;
  let audioPredictions: ReturnType<typeof AudioPredictions>;
  let requestMock: jest.SpyInstance;

  beforeEach(() => {
    client = {
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    } as jest.Mocked<Client>;

    audioPredictions = AudioPredictions(client);
    requestMock = jest.spyOn(audioPredictions["requestor"], "request");
  });

  afterEach(() => {
    requestMock.mockReset();
  });

  describe("generate", () => {
    it("should generate audio predictions with fileId and default options", async () => {
      const mockResponse = { id: "pred_123", status: "completed" };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await audioPredictions.generate({
        fileId: "audio1.mp3",
        model: "model1",
        domain: "audio.transcription",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "/audio/generate",
        undefined,
        {
          file_id: "audio1.mp3",
          model: "model1",
          domain: "audio.transcription",
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

    it("should generate audio predictions with fileId and custom options", async () => {
      const mockResponse = { id: "pred_456", status: "pending" };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await audioPredictions.generate({
        fileId: "audio2.wav",
        model: "whisper-large",
        domain: "audio.transcription",
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
        "/audio/generate",
        undefined,
        {
          file_id: "audio2.wav",
          model: "whisper-large",
          domain: "audio.transcription",
          batch: true,
          config: {
            confidence: true,
            detail: "hi",
            grounding: true,
            gql_stmt: null,
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

    it("should generate audio predictions with URL", async () => {
      const mockResponse = { id: "pred_789", status: "completed" };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await audioPredictions.generate({
        url: "https://example.com/audio.mp3",
        model: "model1",
        domain: "audio.transcription",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "/audio/generate",
        undefined,
        {
          url: "https://example.com/audio.mp3",
          model: "model1",
          domain: "audio.transcription",
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

    it("should generate audio predictions with URL and custom options", async () => {
      const mockResponse = { id: "pred_101112", status: "pending" };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await audioPredictions.generate({
        url: "https://example.com/podcast.mp3",
        model: "whisper-large",
        domain: "audio.summary",
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
        "/audio/generate",
        undefined,
        {
          url: "https://example.com/podcast.mp3",
          model: "whisper-large",
          domain: "audio.summary",
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
        audioPredictions.generate({
          model: "model1",
          domain: "audio.transcription",
        })
      ).rejects.toThrow("Either `fileId` or `url` must be provided");

      expect(requestMock).not.toHaveBeenCalled();
    });

    it("should throw an error when both fileId and url are provided", async () => {
      await expect(
        audioPredictions.generate({
          fileId: "audio1.mp3",
          url: "https://example.com/audio.mp3",
          model: "model1",
          domain: "audio.transcription",
        })
      ).rejects.toThrow("Only one of `fileId` or `url` can be provided");

      expect(requestMock).not.toHaveBeenCalled();
    });

    it("should handle API error responses", async () => {
      const errorResponse = { error: "Invalid audio format" };
      requestMock.mockRejectedValue(new Error("API Error"));

      await expect(
        audioPredictions.generate({
          fileId: "invalid-audio.txt",
          model: "model1",
          domain: "audio.transcription",
        })
      ).rejects.toThrow("API Error");

      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "/audio/generate",
        undefined,
        {
          file_id: "invalid-audio.txt",
          model: "model1",
          domain: "audio.transcription",
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
