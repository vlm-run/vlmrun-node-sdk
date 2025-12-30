import {
  validateHttpUrl,
  validateMessageContent,
  validateRefId,
  MessageContent,
  ImageUrl,
  FileUrl,
  VideoUrl,
  AudioUrl,
  DocumentUrl,
} from "../../../src/client/types";

describe("Types", () => {
  describe("validateHttpUrl", () => {
    it("should return true for valid http URLs", () => {
      expect(validateHttpUrl("http://example.com")).toBe(true);
      expect(validateHttpUrl("http://example.com/path")).toBe(true);
      expect(validateHttpUrl("http://example.com/path?query=1")).toBe(true);
    });

    it("should return true for valid https URLs", () => {
      expect(validateHttpUrl("https://example.com")).toBe(true);
      expect(validateHttpUrl("https://example.com/path")).toBe(true);
      expect(validateHttpUrl("https://example.com/path?query=1")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(validateHttpUrl("ftp://example.com")).toBe(false);
      expect(validateHttpUrl("example.com")).toBe(false);
      expect(validateHttpUrl("")).toBe(false);
      expect(validateHttpUrl("not-a-url")).toBe(false);
    });
  });

  describe("validateMessageContent", () => {
    it("should not throw for valid text content", () => {
      const content: MessageContent = {
        type: "text",
        text: "Hello, world!",
      };
      expect(() => validateMessageContent(content)).not.toThrow();
    });

    it("should throw for text type without text field", () => {
      const content: MessageContent = {
        type: "text",
      };
      expect(() => validateMessageContent(content)).toThrow("Must have text");
    });

    it("should not throw for valid image_url content", () => {
      const content: MessageContent = {
        type: "image_url",
        image_url: { url: "https://example.com/image.jpg" },
      };
      expect(() => validateMessageContent(content)).not.toThrow();
    });

    it("should throw for image_url type without image_url field", () => {
      const content: MessageContent = {
        type: "image_url",
      };
      expect(() => validateMessageContent(content)).toThrow(
        "Must have image_url"
      );
    });

    it("should not throw for valid video_url content", () => {
      const content: MessageContent = {
        type: "video_url",
        video_url: { url: "https://example.com/video.mp4" },
      };
      expect(() => validateMessageContent(content)).not.toThrow();
    });

    it("should throw for video_url type without video_url field", () => {
      const content: MessageContent = {
        type: "video_url",
      };
      expect(() => validateMessageContent(content)).toThrow(
        "Must have video_url"
      );
    });

    it("should not throw for valid audio_url content", () => {
      const content: MessageContent = {
        type: "audio_url",
        audio_url: { url: "https://example.com/audio.mp3" },
      };
      expect(() => validateMessageContent(content)).not.toThrow();
    });

    it("should throw for audio_url type without audio_url field", () => {
      const content: MessageContent = {
        type: "audio_url",
      };
      expect(() => validateMessageContent(content)).toThrow(
        "Must have audio_url"
      );
    });

    it("should not throw for valid file_url content", () => {
      const content: MessageContent = {
        type: "file_url",
        file_url: { url: "https://example.com/file.pdf" },
      };
      expect(() => validateMessageContent(content)).not.toThrow();
    });

    it("should throw for file_url type without file_url field", () => {
      const content: MessageContent = {
        type: "file_url",
      };
      expect(() => validateMessageContent(content)).toThrow(
        "Must have file_url"
      );
    });

    it("should not throw for input_file with file_id", () => {
      const content: MessageContent = {
        type: "input_file",
        file_id: "file-123",
      };
      expect(() => validateMessageContent(content)).not.toThrow();
    });

    it("should not throw for input_file with file_url", () => {
      const content: MessageContent = {
        type: "input_file",
        file_url: { url: "https://example.com/file.pdf" },
      };
      expect(() => validateMessageContent(content)).not.toThrow();
    });

    it("should throw for input_file without file_id or file_url", () => {
      const content: MessageContent = {
        type: "input_file",
      };
      expect(() => validateMessageContent(content)).toThrow(
        "Must have either file_id or file_url"
      );
    });
  });

  describe("validateRefId", () => {
    it("should return true for valid image ref", () => {
      expect(validateRefId("img_abc123", "img")).toBe(true);
      expect(validateRefId("img_ABCDEF", "img")).toBe(true);
    });

    it("should return false for invalid image ref", () => {
      expect(validateRefId("img_ab", "img")).toBe(false);
      expect(validateRefId("img_abcdefg", "img")).toBe(false);
      expect(validateRefId("image_abc123", "img")).toBe(false);
    });

    it("should return true for valid audio ref", () => {
      expect(validateRefId("aud_abc123", "aud")).toBe(true);
    });

    it("should return true for valid video ref", () => {
      expect(validateRefId("vid_abc123", "vid")).toBe(true);
    });

    it("should return true for valid document ref", () => {
      expect(validateRefId("doc_abc123", "doc")).toBe(true);
    });

    it("should return true for valid recon ref", () => {
      expect(validateRefId("recon_abc123", "recon")).toBe(true);
    });

    it("should return true for valid array ref", () => {
      expect(validateRefId("arr_abc123", "arr")).toBe(true);
    });

    it("should return true for valid url ref", () => {
      expect(validateRefId("url_abc123", "url")).toBe(true);
    });
  });

  describe("URL types", () => {
    it("should create ImageUrl with default detail", () => {
      const imageUrl: ImageUrl = {
        url: "https://example.com/image.jpg",
      };
      expect(imageUrl.url).toBe("https://example.com/image.jpg");
      expect(imageUrl.detail).toBeUndefined();
    });

    it("should create ImageUrl with custom detail", () => {
      const imageUrl: ImageUrl = {
        url: "https://example.com/image.jpg",
        detail: "high",
      };
      expect(imageUrl.detail).toBe("high");
    });

    it("should create FileUrl", () => {
      const fileUrl: FileUrl = {
        url: "https://example.com/file.pdf",
      };
      expect(fileUrl.url).toBe("https://example.com/file.pdf");
    });

    it("should create VideoUrl", () => {
      const videoUrl: VideoUrl = {
        url: "https://example.com/video.mp4",
      };
      expect(videoUrl.url).toBe("https://example.com/video.mp4");
    });

    it("should create AudioUrl", () => {
      const audioUrl: AudioUrl = {
        url: "https://example.com/audio.mp3",
      };
      expect(audioUrl.url).toBe("https://example.com/audio.mp3");
    });

    it("should create DocumentUrl", () => {
      const documentUrl: DocumentUrl = {
        url: "https://example.com/document.pdf",
      };
      expect(documentUrl.url).toBe("https://example.com/document.pdf");
    });
  });
});
