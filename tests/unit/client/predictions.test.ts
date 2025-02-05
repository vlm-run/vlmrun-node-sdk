import { Client } from "../../../src/client/base_requestor";
import {
  ImagePredictions,
  DocumentPredictions,
  AudioPredictions,
  VideoPredictions,
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
            image: "base64-encoded-image",
            model: "model1",
            domain: "domain1",
            batch: false,
            config: {
              confidence: false,
              detail: "auto",
              grounding: false,
              json_schema: null,
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
            image: "base64-encoded-image",
            model: "model1",
            domain: "domain1",
            batch: true,
            config: {
              confidence: false,
              detail: "auto",
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
              json_schema: null,
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
              json_schema: null,
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
              json_schema: null,
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
});
