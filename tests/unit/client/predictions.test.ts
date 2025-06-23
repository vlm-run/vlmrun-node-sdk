import { Client } from "../../../src/client/base_requestor";
import {
  Predictions,
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

  describe("Predictions (Base Class)", () => {
    let predictions: Predictions;
    let requestMock: jest.SpyInstance;

    beforeEach(() => {
      predictions = new Predictions(client);
      requestMock = jest.spyOn(predictions["requestor"], "request");
    });

    afterEach(() => {
      requestMock.mockReset();
    });

    describe("list", () => {
      it("should list predictions with default parameters", async () => {
        const mockResponse = [
          { id: "pred_123", status: "completed" },
          { id: "pred_456", status: "processing" }
        ];
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await predictions.list();

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "GET",
          "predictions",
          { skip: undefined, limit: undefined }
        );
      });

      it("should list predictions with custom parameters", async () => {
        const mockResponse = [
          { id: "pred_789", status: "completed" }
        ];
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await predictions.list({ skip: 10, limit: 5 });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "GET",
          "predictions",
          { skip: 10, limit: 5 }
        );
      });
    });

    describe("get", () => {
      it("should get a prediction by id", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await predictions.get("pred_123");

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "GET",
          "predictions/pred_123"
        );
      });
    });
  });

  describe("ImagePredictions", () => {
    let imagePredictions: ImagePredictions;
    let requestMock: jest.SpyInstance;

    beforeEach(() => {
      imagePredictions = new ImagePredictions(client);
      requestMock = jest.spyOn(imagePredictions["requestor"], "request");
      (imageUtils.processImage as jest.Mock).mockReturnValue(
        "base64-encoded-image"
      );
    });

    afterEach(() => {
      requestMock.mockReset();
    });

    describe("generate", () => {

      it("should generate image predictions with default options", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await imagePredictions.generate({
          images: ["image1.jpg"],
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
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
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

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
        expect(requestMock).toHaveBeenCalledWith(
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

    describe("schema", () => {
      let requestMock: jest.SpyInstance;

      beforeEach(() => {
        requestMock = jest.spyOn(imagePredictions["requestor"], "request");
      });

      afterEach(() => {
        requestMock.mockReset();
      });

      it("should generate schema from images", async () => {
        const mockResponse = { 
          id: "pred_123", 
          status: "completed",
          response: {
            json_schema: { type: "object", properties: {} },
            schema_version: "1.0",
            schema_hash: "abc123",
            domain: "document.invoice",
            gql_stmt: "",
            description: "Invoice schema"
          }
        };
        
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await imagePredictions.schema({
          images: ["image1.jpg"],
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "image/schema",
          undefined,
          {
            images: ["base64-encoded-image"],
          }
        );
      });

      it("should generate schema from URLs", async () => {
        const mockResponse = { 
          id: "pred_123", 
          status: "completed",
          response: {
            json_schema: { type: "object", properties: {} },
            schema_version: "1.0",
            schema_hash: "abc123",
            domain: "document.invoice",
            gql_stmt: "",
            description: "Invoice schema"
          }
        };
        
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await imagePredictions.schema({
          urls: ["https://example.com/image.jpg"],
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "image/schema",
          undefined,
          {
            images: ["https://example.com/image.jpg"],
          }
        );
      });

      it("should throw an error when neither images nor urls are provided", async () => {
        await expect(imagePredictions.schema({})).rejects.toThrow(
          "Either `images` or `urls` must be provided"
        );
        
        expect(requestMock).not.toHaveBeenCalled();
      });

      it("should throw an error when both images and urls are provided", async () => {
        await expect(
          imagePredictions.schema({
            images: ["image1.jpg"],
            urls: ["https://example.com/image.jpg"],
          })
        ).rejects.toThrow("Only one of `images` or `urls` can be provided");
        
        expect(requestMock).not.toHaveBeenCalled();
      });
    });


  });

  describe("DocumentPredictions", () => {
    let documentPredictions: ReturnType<typeof DocumentPredictions>;
    let requestMock: jest.SpyInstance;

    beforeEach(() => {
      documentPredictions = DocumentPredictions(client);
      requestMock = jest.spyOn(documentPredictions["requestor"], "request");
    });

    afterEach(() => {
      requestMock.mockReset();
    });

    describe("generate", () => {
      it("should generate document predictions with fileId", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await documentPredictions.generate({
          fileId: "doc1.pdf",
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
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

      it("should generate document predictions with URL", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await documentPredictions.generate({
          url: "https://example.com/doc.pdf",
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "/document/generate",
          undefined,
          {
            url: "https://example.com/doc.pdf",
            model: "model1",
            domain: "domain1",
            batch: false,
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

      it("should throw an error when neither fileId nor url are provided", async () => {
        await expect(
          documentPredictions.generate({
            model: "model1",
            domain: "domain1",
          })
        ).rejects.toThrow("Either `fileId` or `url` must be provided");
        
        expect(requestMock).not.toHaveBeenCalled();
      });

      it("should throw an error when both fileId and url are provided", async () => {
        await expect(
          documentPredictions.generate({
            fileId: "doc1.pdf",
            url: "https://example.com/doc.pdf",
            model: "model1",
            domain: "domain1",
          })
        ).rejects.toThrow("Only one of `fileId` or `url` can be provided");
        
        expect(requestMock).not.toHaveBeenCalled();
      });
    });

    describe("schema", () => {
      it("should generate schema from fileId", async () => {
        const mockResponse = { 
          id: "pred_123", 
          status: "completed",
          response: {
            json_schema: { type: "object", properties: {} },
            schema_version: "1.0",
            schema_hash: "abc123",
            domain: "document.invoice",
            gql_stmt: "",
            description: "Invoice schema"
          }
        };
        
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await documentPredictions.schema({
          fileId: "doc1.pdf",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "/document/schema",
          undefined,
          {
            file_id: "doc1.pdf",
          }
        );
      });

      it("should generate schema from URL", async () => {
        const mockResponse = { 
          id: "pred_123", 
          status: "completed",
          response: {
            json_schema: { type: "object", properties: {} },
            schema_version: "1.0",
            schema_hash: "abc123",
            domain: "document.invoice",
            gql_stmt: "",
            description: "Invoice schema"
          }
        };
        
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await documentPredictions.schema({
          url: "https://example.com/doc.pdf",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "/document/schema",
          undefined,
          {
            url: "https://example.com/doc.pdf",
          }
        );
      });

      it("should throw an error when neither fileId nor url are provided", async () => {
        await expect(documentPredictions.schema({})).rejects.toThrow(
          "Either `fileId` or `url` must be provided"
        );
        
        expect(requestMock).not.toHaveBeenCalled();
      });

      it("should throw an error when both fileId and url are provided", async () => {
        await expect(
          documentPredictions.schema({
            fileId: "doc1.pdf",
            url: "https://example.com/doc.pdf",
          })
        ).rejects.toThrow("Only one of `fileId` or `url` can be provided");
        
        expect(requestMock).not.toHaveBeenCalled();
      });
    });
  });

  describe("AudioPredictions", () => {
    let audioPredictions: ReturnType<typeof AudioPredictions>;
    let requestMock: jest.SpyInstance;

    beforeEach(() => {
      audioPredictions = AudioPredictions(client);
      requestMock = jest.spyOn(audioPredictions["requestor"], "request");
    });

    afterEach(() => {
      requestMock.mockReset();
    });

    describe("generate", () => {
      it("should generate audio predictions with fileId", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await audioPredictions.generate({
          fileId: "audio1.mp3",
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
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

      it("should generate audio predictions with URL", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await audioPredictions.generate({
          url: "https://example.com/audio.mp3",
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "/audio/generate",
          undefined,
          {
            url: "https://example.com/audio.mp3",
            model: "model1",
            domain: "domain1",
            batch: false,
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

    describe("schema", () => {
      it("should generate schema from fileId", async () => {
        const mockResponse = { 
          id: "pred_123", 
          status: "completed",
          response: {
            json_schema: { type: "object", properties: {} },
            schema_version: "1.0",
            schema_hash: "abc123",
            domain: "audio.transcription",
            gql_stmt: "",
            description: "Audio schema"
          }
        };
        
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await audioPredictions.schema({
          fileId: "audio1.mp3",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "/audio/schema",
          undefined,
          {
            file_id: "audio1.mp3",
          }
        );
      });
    });
  });

  describe("VideoPredictions", () => {
    let videoPredictions: ReturnType<typeof VideoPredictions>;
    let requestMock: jest.SpyInstance;

    beforeEach(() => {
      videoPredictions = VideoPredictions(client);
      requestMock = jest.spyOn(videoPredictions["requestor"], "request");
    });

    afterEach(() => {
      requestMock.mockReset();
    });

    describe("generate", () => {
      it("should generate video predictions with fileId", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await videoPredictions.generate({
          fileId: "video1.mp4",
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
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

      it("should generate video predictions with URL", async () => {
        const mockResponse = { id: "pred_123", status: "completed" };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await videoPredictions.generate({
          url: "https://example.com/video.mp4",
          model: "model1",
          domain: "domain1",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "/video/generate",
          undefined,
          {
            url: "https://example.com/video.mp4",
            model: "model1",
            domain: "domain1",
            batch: false,
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

    describe("schema", () => {
      it("should generate schema from fileId", async () => {
        const mockResponse = { 
          id: "pred_123", 
          status: "completed",
          response: {
            json_schema: { type: "object", properties: {} },
            schema_version: "1.0",
            schema_hash: "abc123",
            domain: "video.analysis",
            gql_stmt: "",
            description: "Video schema"
          }
        };
        
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await videoPredictions.schema({
          fileId: "video1.mp4",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "/video/schema",
          undefined,
          {
            file_id: "video1.mp4",
          }
        );
      });
    });


  });

  describe("FilePredictions", () => {
    let documentPredictions: any;
    let requestMock: jest.SpyInstance;

    beforeEach(() => {
      documentPredictions = DocumentPredictions(client);
      requestMock = jest.spyOn(documentPredictions["requestor"], "request");
    });

    afterEach(() => {
      requestMock.mockReset();
    });

    describe("execute", () => {
      it("should execute with fileId parameter", async () => {
        const mockResponse = {
          id: "pred_123",
          status: "completed",
          response: { result: "test" },
          created_at: "2023-01-01T00:00:00Z"
        };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await documentPredictions.execute({
          name: "test-agent",
          version: "v1.0",
          fileId: "file_123",
          batch: false,
          config: { detail: "hi" },
          metadata: { environment: "prod" },
          callbackUrl: "https://callback.example.com"
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "/document/execute",
          undefined,
          {
            name: "test-agent",
            version: "v1.0",
            file_id: "file_123",
            batch: false,
            config: {
              detail: "hi",
              json_schema: undefined,
              confidence: false,
              grounding: false,
              gql_stmt: null,
            },
            metadata: {
              environment: "prod",
              session_id: undefined,
              allow_training: true,
            },
            callback_url: "https://callback.example.com",
          }
        );
      });

      it("should execute with url parameter", async () => {
        const mockResponse = {
          id: "pred_456",
          status: "completed",
          response: { result: "test" },
          created_at: "2023-01-01T00:00:00Z"
        };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await documentPredictions.execute({
          name: "test-agent",
          url: "https://example.com/document.pdf",
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "/document/execute",
          undefined,
          {
            name: "test-agent",
            version: "latest",
            url: "https://example.com/document.pdf",
            batch: false,
            config: {
              detail: "auto",
              json_schema: undefined,
              confidence: false,
              grounding: false,
              gql_stmt: null,
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

      it("should execute for audio route", async () => {
        const audioPredictions = AudioPredictions(client);
        const audioRequestMock = jest.spyOn(audioPredictions["requestor"], "request");
        
        const mockResponse = {
          id: "pred_audio",
          status: "completed",
          response: { result: "test" },
          created_at: "2023-01-01T00:00:00Z"
        };
        audioRequestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await audioPredictions.execute({
          name: "audio-agent",
          fileId: "audio_file_123",
        });

        expect(result).toEqual(mockResponse);
        expect(audioRequestMock).toHaveBeenCalledWith(
          "POST",
          "/audio/execute",
          undefined,
          expect.objectContaining({
            name: "audio-agent",
            version: "latest",
            file_id: "audio_file_123",
          })
        );
      });

      it("should execute for video route", async () => {
        const videoPredictions = VideoPredictions(client);
        const videoRequestMock = jest.spyOn(videoPredictions["requestor"], "request");
        
        const mockResponse = {
          id: "pred_video",
          status: "completed",
          response: { result: "test" },
          created_at: "2023-01-01T00:00:00Z"
        };
        videoRequestMock.mockResolvedValue([mockResponse, 200, {}]);

        const result = await videoPredictions.execute({
          name: "video-agent",
          url: "https://example.com/video.mp4",
        });

        expect(result).toEqual(mockResponse);
        expect(videoRequestMock).toHaveBeenCalledWith(
          "POST",
          "/video/execute",
          undefined,
          expect.objectContaining({
            name: "video-agent",
            version: "latest",
            url: "https://example.com/video.mp4",
          })
        );
      });

      it("should throw error when neither fileId nor url provided", async () => {
        await expect(
          documentPredictions.execute({
            name: "test-agent",
          })
        ).rejects.toThrow("Either `fileId` or `url` must be provided");
      });

      it("should throw error when both fileId and url provided", async () => {
        await expect(
          documentPredictions.execute({
            name: "test-agent",
            fileId: "file_123",
            url: "https://example.com/document.pdf",
          })
        ).rejects.toThrow("Only one of `fileId` or `url` can be provided");
      });

      it("should handle responseModel config", async () => {
        const mockResponse = {
          id: "pred_789",
          status: "completed",
          response: { result: "test" },
          created_at: "2023-01-01T00:00:00Z"
        };
        requestMock.mockResolvedValue([mockResponse, 200, {}]);

        const mockSchema = { type: "object", properties: {} };
        const mockConvertToJsonSchema = jest.fn().mockReturnValue(mockSchema);
        jest.doMock("../../../src/utils/utils", () => ({
          convertToJsonSchema: mockConvertToJsonSchema,
        }));

        const { convertToJsonSchema } = require("../../../src/utils/utils");
        const mockZodSchema = {} as any;

        const result = await documentPredictions.execute({
          name: "test-agent",
          fileId: "file_123",
          config: {
            responseModel: mockZodSchema,
            zodToJsonParams: { definitions: true },
          },
        });

        expect(result).toEqual(mockResponse);
        expect(requestMock).toHaveBeenCalledWith(
          "POST",
          "/document/execute",
          undefined,
          expect.objectContaining({
            config: expect.objectContaining({
              json_schema: {},
            }),
          })
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
              gql_stmt: null,
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
              gql_stmt: null,
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
