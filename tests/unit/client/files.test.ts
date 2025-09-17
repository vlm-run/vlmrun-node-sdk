import { Client } from "../../../src/client/base_requestor";
import { Files } from "../../../src/client/files";
import {
  FileResponse,
  FilePurpose,
  PresignedUrlResponse,
} from "../../../src/client/types";
import { createHash } from "crypto";
import * as fs from "fs";
import * as fileUtils from "../../../src/utils/file";

jest.mock("../../../src/client/base_requestor");
jest.mock("fs");
jest.mock("crypto");
jest.mock("../../../src/utils/file");

// Mock the File class since it's not available in Node.js
global.File = class File {
  constructor(public bits: any[], public name: string) {}
} as any;

describe("Files", () => {
  let client: jest.Mocked<Client>;
  let files: Files;
  let requestMock: jest.SpyInstance;

  beforeEach(() => {
    client = {
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    } as jest.Mocked<Client>;
    files = new Files(client);
    requestMock = jest.spyOn(files["requestor"], "request");
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should list files with default pagination", async () => {
      const mockResponse: FileResponse[] = [
        {
          id: "file_123",
          filename: "test.jpg",
          bytes: 1000,
          purpose: "vision" as FilePurpose,
          created_at: new Date().toISOString(),
          object: "file",
        },
      ];
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.list({});

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith("GET", "files", {
        skip: undefined,
        limit: undefined,
      });
    });

    it("should list files with custom pagination", async () => {
      const mockResponse: FileResponse[] = [
        {
          id: "file_123",
          filename: "test.jpg",
          bytes: 1000,
          purpose: "vision" as FilePurpose,
          created_at: new Date().toISOString(),
          object: "file",
        },
      ];
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.list({ skip: 5, limit: 20 });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith("GET", "files", {
        skip: 5,
        limit: 20,
      });
    });
  });

  describe("getCachedFile", () => {
    it("should return file if it exists", async () => {
      // Mock the stream events
      const mockStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === "data") {
            callback(Buffer.from("test file content"));
          }
          if (event === "end") {
            callback();
          }
          return mockStream;
        }),
      };

      // Mock fs.createReadStream
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      // Mock createHash
      const mockHashDigest = "test-hash";
      const mockHashUpdate = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHashDigest),
      };
      (createHash as jest.Mock).mockReturnValue(mockHashUpdate);

      // Mock API response
      const mockResponse: FileResponse = {
        id: "file_123",
        filename: "test.jpg",
        bytes: 1000,
        purpose: "vision" as FilePurpose,
        created_at: new Date().toISOString(),
        object: "file",
      };
      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.getCachedFile("test.jpg");

      expect(result).toEqual(mockResponse);
      expect(fs.createReadStream).toHaveBeenCalledWith(
        "test.jpg",
        expect.any(Object)
      );
      expect(createHash).toHaveBeenCalledWith("md5");
      expect(mockHashUpdate.update).toHaveBeenCalledWith(
        Buffer.from("test file content")
      );
      expect(mockHashUpdate.digest).toHaveBeenCalledWith("hex");
      expect(requestMock).toHaveBeenCalledWith(
        "GET",
        `files/hash/${mockHashDigest}`
      );
    });

    it("should return null if file does not exist in API", async () => {
      // Mock the stream events
      const mockStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === "data") {
            callback(Buffer.from("test file content"));
          }
          if (event === "end") {
            callback();
          }
          return mockStream;
        }),
      };

      // Mock fs.createReadStream
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      // Mock createHash
      const mockHashDigest = "test-hash";
      const mockHashUpdate = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHashDigest),
      };
      (createHash as jest.Mock).mockReturnValue(mockHashUpdate);

      // Mock API response for file not found
      requestMock.mockRejectedValue(new Error("File not found"));

      const result = await files.getCachedFile("test.jpg");

      expect(result).toBeNull();
    });

    it("should handle file system errors", async () => {
      // Mock the stream events with an error
      const mockStream = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === "error") {
            callback(new Error("File system error"));
          }
          return mockStream;
        }),
      };

      // Mock fs.createReadStream
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      await expect(files.getCachedFile("test.jpg")).rejects.toThrow(
        "File system error"
      );
    });
  });

  describe("checkFileExists", () => {
    it("should call getCachedFile", async () => {
      const mockResponse: FileResponse = {
        id: "file_123",
        filename: "test.jpg",
        bytes: 1000,
        purpose: "vision" as FilePurpose,
        created_at: new Date().toISOString(),
        object: "file",
      };

      jest.spyOn(files, "getCachedFile").mockResolvedValue(mockResponse);

      const result = await files.checkFileExists("test.jpg");

      expect(result).toEqual(mockResponse);
      expect(files.getCachedFile).toHaveBeenCalledWith("test.jpg");
    });
  });

  describe("upload", () => {
    it("should return existing file if found and checkDuplicate is true", async () => {
      const existingFile: FileResponse = {
        id: "file_123",
        filename: "image1.jpg",
        bytes: 1000,
        purpose: "vision" as FilePurpose,
        created_at: new Date().toISOString(),
        object: "file",
      };

      jest.spyOn(files, "getCachedFile").mockResolvedValue(existingFile);

      const result = await files.upload({
        filePath: "image1.jpg",
        purpose: "vision",
        checkDuplicate: true,
      });

      expect(result).toEqual(existingFile);
      expect(files.getCachedFile).toHaveBeenCalledWith("image1.jpg");
    });

    it("should upload new file if no duplicate found", async () => {
      const mockResponse: FileResponse = {
        id: "file_123",
        filename: "test.jpg",
        bytes: 1000,
        purpose: "vision" as FilePurpose,
        created_at: new Date().toISOString(),
        object: "file",
      };

      jest.spyOn(files, "getCachedFile").mockResolvedValue(null);

      // Mock readFileFromPathAsFile
      const mockFile = new File([], "test.jpg");
      (fileUtils.readFileFromPathAsFile as jest.Mock).mockResolvedValue(
        mockFile
      );

      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.upload({
        filePath: "test.jpg",
        purpose: "vision",
        checkDuplicate: true,
      });

      expect(result).toEqual(mockResponse);
      expect(files.getCachedFile).toHaveBeenCalledWith("test.jpg");
      expect(fileUtils.readFileFromPathAsFile).toHaveBeenCalledWith("test.jpg");
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "files",
        { purpose: "vision", generate_public_url: true },
        undefined,
        { file: mockFile }
      );
    });

    it("should upload file with generatePublicUrl=false", async () => {
      const mockResponse: FileResponse = {
        id: "file_123",
        filename: "test.jpg",
        bytes: 1000,
        purpose: "vision" as FilePurpose,
        created_at: new Date().toISOString(),
        object: "file",
      };

      jest.spyOn(files, "getCachedFile").mockResolvedValue(null);

      // Mock readFileFromPathAsFile
      const mockFile = new File([], "test.jpg");
      (fileUtils.readFileFromPathAsFile as jest.Mock).mockResolvedValue(
        mockFile
      );

      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.upload({
        filePath: "test.jpg",
        purpose: "vision",
        generatePublicUrl: false,
        checkDuplicate: true,
      });

      expect(result).toEqual(mockResponse);
      expect(files.getCachedFile).toHaveBeenCalledWith("test.jpg");
      expect(fileUtils.readFileFromPathAsFile).toHaveBeenCalledWith("test.jpg");
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "files",
        { purpose: "vision", generate_public_url: false },
        undefined,
        { file: mockFile }
      );
    });

    it("should upload file with generatePublicUrl=true and return public_url", async () => {
      const mockResponse: FileResponse = {
        id: "file_123",
        filename: "test.jpg",
        bytes: 1000,
        purpose: "vision" as FilePurpose,
        created_at: new Date().toISOString(),
        object: "file",
        public_url: "https://example.com/public/file_123",
      };

      jest.spyOn(files, "getCachedFile").mockResolvedValue(null);

      // Mock readFileFromPathAsFile
      const mockFile = new File([], "test.jpg");
      (fileUtils.readFileFromPathAsFile as jest.Mock).mockResolvedValue(
        mockFile
      );

      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.upload({
        filePath: "test.jpg",
        purpose: "vision",
        generatePublicUrl: true,
        checkDuplicate: true,
      });

      expect(result).toEqual(mockResponse);
      expect(result.public_url).toBe("https://example.com/public/file_123");
      expect(files.getCachedFile).toHaveBeenCalledWith("test.jpg");
      expect(fileUtils.readFileFromPathAsFile).toHaveBeenCalledWith("test.jpg");
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "files",
        { purpose: "vision", generate_public_url: true },
        undefined,
        { file: mockFile }
      );
    });

    it("should skip duplicate check if checkDuplicate is false", async () => {
      const mockResponse: FileResponse = {
        id: "file_123",
        filename: "test.jpg",
        bytes: 1000,
        purpose: "vision" as FilePurpose,
        created_at: new Date().toISOString(),
        object: "file",
      };

      jest.spyOn(files, "getCachedFile");

      // Mock readFileFromPathAsFile
      const mockFile = new File([], "test.jpg");
      (fileUtils.readFileFromPathAsFile as jest.Mock).mockResolvedValue(
        mockFile
      );

      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.upload({
        filePath: "test.jpg",
        purpose: "vision",
        checkDuplicate: false,
      });

      expect(result).toEqual(mockResponse);
      expect(files.getCachedFile).not.toHaveBeenCalled();
      expect(fileUtils.readFileFromPathAsFile).toHaveBeenCalledWith("test.jpg");
      expect(requestMock).toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("should get a file by ID", async () => {
      const mockResponse: FileResponse = {
        id: "file_123",
        filename: "test.jpg",
        bytes: 1000,
        purpose: "vision" as FilePurpose,
        created_at: new Date().toISOString(),
        object: "file",
      };

      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.get("file_123");

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "GET",
        "files/file_123",
        undefined
      );
    });

    it("should get a file by ID with isPublic=true", async () => {
      const mockResponse: FileResponse = {
        id: "file_123",
        filename: "test.jpg",
        bytes: 1000,
        purpose: "vision" as FilePurpose,
        created_at: new Date().toISOString(),
        object: "file",
        public_url: "https://example.com/public/file_123",
      };

      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.get("file_123", true);

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith("GET", "files/file_123", {
        generate_public_url: true,
      });
    });

    it("should get a file by ID with isPublic=false", async () => {
      const mockResponse: FileResponse = {
        id: "file_123",
        filename: "test.jpg",
        bytes: 1000,
        purpose: "vision" as FilePurpose,
        created_at: new Date().toISOString(),
        object: "file",
      };

      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.get("file_123", false);

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith("GET", "files/file_123", {
        generate_public_url: false,
      });
    });
  });

  describe("delete", () => {
    it("should delete a file by ID", async () => {
      requestMock.mockResolvedValue([{}, 200, {}]);

      await files.delete("file_123");

      expect(requestMock).toHaveBeenCalledWith("DELETE", "files/file_123");
    });
  });

  describe("generatePresignedUrl", () => {
    it("should generate presigned URL with correct parameters", async () => {
      const mockResponse: PresignedUrlResponse = {
        id: "presigned_123",
        url: "https://example.com/upload",
        filename: "test.pdf",
        content_type: "application/pdf",
        created_at: new Date().toISOString(),
      };

      requestMock.mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.generatePresignedUrl({
        filename: "test.pdf",
        purpose: "assistants",
      });

      expect(result).toEqual(mockResponse);
      expect(requestMock).toHaveBeenCalledWith(
        "POST",
        "files/presigned-url",
        undefined,
        {
          filename: "test.pdf",
          purpose: "assistants",
        }
      );
    });
  });
});
