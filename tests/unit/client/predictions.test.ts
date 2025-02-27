import { Client } from "../../../src/client/base_requestor";
import {
  ImagePredictions,
  DocumentPredictions,
  AudioPredictions,
  VideoPredictions,
  WebPredictions,
} from "../../../src/client/predictions";
import * as imageUtils from "../../../src/utils/image";

jest.mock("../../../src/client/base_requestor");
jest.mock("../../../src/utils/image");

describe("Predictions", () => {
  let client: jest.Mocked<Client>;

  beforeEach(() => {
    client = {
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    } as jest.Mocked<Client>;
  });

  describe("ImagePredictions", () => {
    let imagePredictions: ImagePredictions;

    beforeEach(() => {
      imagePredictions = new ImagePredictions(client);
      (imageUtils.processImage as jest.Mock).mockReturnValue(
        "base64-encoded-image"
      );
    });

    describe("generate", () => {
      it("should generate image predictions with default options", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        jest
          .spyOn(imagePredictions["requestor"], "request")
          .mockResolvedValue([mockResponse, 200, {}]);

        const result = await imagePredictions.generate({
          images: ["image1.jpg"],
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(imagePredictions["requestor"].request).toHaveBeenCalledWith(
          "POST",
          "image/generate",
          undefined,
          {
            images: ["base64-encoded-image"],
            model: "model1",
            domain: "domain1",
            batch: false,
            config: {
              confidence: false,
              detail: "auto",
              gql_stmt: null,
              grounding: false,
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

      it("should generate image predictions with custom options", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        jest
          .spyOn(imagePredictions["requestor"], "request")
          .mockResolvedValue([mockResponse, 200, {}]);

        const result = await imagePredictions.generate({
          images: ["image1.jpg"],
          model: "model1",
          domain: "domain1",
          batch: true,
          config: {
            jsonSchema: { type: "object" },
          },
          metadata: {
            environment: "dev",
            sessionId: null,
          },
          callbackUrl: "https://example.com/callback",
        });

        expect(result).toEqual(mockResponse);
        expect(imagePredictions["requestor"].request).toHaveBeenCalledWith(
          "POST",
          "image/generate",
          undefined,
          {
            images: ["base64-encoded-image"],
            model: "model1",
            domain: "domain1",
            batch: true,
            config: {
              confidence: false,
              detail: "auto",
              gql_stmt: null,
              grounding: false,
              json_schema: { type: "object" },
            },
            metadata: {
              environment: "dev",
              session_id: null,
              allow_training: true,
            },
            callback_url: "https://example.com/callback",
          }
        );
      });
    });
  });

  describe("DocumentPredictions", () => {
    let documentPredictions: ReturnType<typeof DocumentPredictions>;

    beforeEach(() => {
      documentPredictions = DocumentPredictions(client);
    });

    describe("generate", () => {
      it("should generate document predictions", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        jest
          .spyOn(documentPredictions["requestor"], "request")
          .mockResolvedValue([mockResponse, 200, {}]);

        const result = await documentPredictions.generate({
          fileId: "doc1.pdf",
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(documentPredictions["requestor"].request).toHaveBeenCalledWith(
          "POST",
          "/document/generate",
          undefined,
          {
            file_id: "doc1.pdf",
            model: "model1",
            domain: "domain1",
            batch: false,
            config: {
              confidence: false,
              detail: "auto",
              grounding: false,
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

  describe("AudioPredictions", () => {
    let audioPredictions: ReturnType<typeof AudioPredictions>;

    beforeEach(() => {
      audioPredictions = AudioPredictions(client);
    });

    describe("generate", () => {
      it("should generate audio predictions", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        jest
          .spyOn(audioPredictions["requestor"], "request")
          .mockResolvedValue([mockResponse, 200, {}]);

        const result = await audioPredictions.generate({
          fileId: "audio1.mp3",
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(audioPredictions["requestor"].request).toHaveBeenCalledWith(
          "POST",
          "/audio/generate",
          undefined,
          {
            file_id: "audio1.mp3",
            model: "model1",
            domain: "domain1",
            batch: false,
            config: {
              confidence: false,
              detail: "auto",
              grounding: false,
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

  describe("VideoPredictions", () => {
    let videoPredictions: ReturnType<typeof VideoPredictions>;

    beforeEach(() => {
      videoPredictions = VideoPredictions(client);
    });

    describe("generate", () => {
      it("should generate video predictions", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        jest
          .spyOn(videoPredictions["requestor"], "request")
          .mockResolvedValue([mockResponse, 200, {}]);

        const result = await videoPredictions.generate({
          fileId: "video1.mp4",
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(videoPredictions["requestor"].request).toHaveBeenCalledWith(
          "POST",
          "/video/generate",
          undefined,
          {
            file_id: "video1.mp4",
            model: "model1",
            domain: "domain1",
            batch: false,
            config: {
              confidence: false,
              detail: "auto",
              grounding: false,
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

  describe("WebPredictions", () => {
    let webPredictions: WebPredictions;

    beforeEach(() => {
      webPredictions = new WebPredictions(client);
    });

    describe("generate", () => {
      it("should generate web predictions with default options", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        jest
          .spyOn(webPredictions["requestor"], "request")
          .mockResolvedValue([mockResponse, 200, {}]);

        const result = await webPredictions.generate({
          url: "https://example.com",
          model: "model1",
          domain: "domain1",
          mode: "accurate",
        });

        expect(result).toEqual(mockResponse);
        expect(webPredictions["requestor"].request).toHaveBeenCalledWith(
          "POST",
          "/web/generate",
          undefined,
          {
            url: "https://example.com",
            model: "model1",
            domain: "domain1",
            mode: "accurate",
            config: {
              detail: "auto",
              json_schema: null,
              confidence: false,
              grounding: false,
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

      it("should generate web predictions with custom options", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        jest
          .spyOn(webPredictions["requestor"], "request")
          .mockResolvedValue([mockResponse, 200, {}]);

        const result = await webPredictions.generate({
          url: "https://example.com",
          model: "model1",
          domain: "domain1",
          mode: "fast",
          config: {
            detail: "hi",
            jsonSchema: { type: "object" },
            confidence: true,
            grounding: true,
          },
          metadata: {
            environment: "prod",
            sessionId: "session123",
            allowTraining: false,
          },
          callbackUrl: "https://callback.example.com",
        });

        expect(result).toEqual(mockResponse);
        expect(webPredictions["requestor"].request).toHaveBeenCalledWith(
          "POST",
          "/web/generate",
          undefined,
          {
            url: "https://example.com",
            model: "model1",
            domain: "domain1",
            mode: "fast",
            config: {
              detail: "hi",
              json_schema: { type: "object" },
              confidence: true,
              grounding: true,
            },
            metadata: {
              environment: "prod",
              session_id: "session123",
              allow_training: false,
            },
            callback_url: "https://callback.example.com",
          }
        );
      });
    });
  });
});
