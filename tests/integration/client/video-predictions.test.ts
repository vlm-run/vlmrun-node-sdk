import { config } from "dotenv";

import { VlmRun } from "../../../src/index";
import { z } from "zod";

jest.setTimeout(300000);

describe("Integration: Video Predictions", () => {
  let client: VlmRun;

  beforeAll(() => {
    config({ path: ".env.test" });

    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY as string,
      baseURL: process.env.TEST_BASE_URL as string,
    });
  });

  describe("VideoPredictions", () => {
    const testFilePath = "tests/integration/assets/timer_video.mp4";

    it("should generate video predictions using file id with batch processing", async () => {
      const uploadedVideo = await client.files.upload({
        filePath: testFilePath,
        checkDuplicate: false,
      });

      const result = await client.video.generate({
        fileId: uploadedVideo.id,
        batch: true,
        domain: "video.transcription",
      });

      // Initial response should be pending for batch processing
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("created_at");
      expect(result).toHaveProperty("completed_at");
      expect(result).toHaveProperty("usage");
      expect(result.status).toBe("pending");
      expect(result.response).toBeNull();
      expect(result.completed_at).toBeNull();

      // Wait for completion
      const waitResponse = await client.predictions.wait(result.id, 300);

      expect(waitResponse.status).toBe("completed");
      expect(waitResponse.response).not.toBeNull();
      expect(waitResponse.completed_at).not.toBeNull();

      // Check usage information
      expect(waitResponse.usage).toBeDefined();
      expect(waitResponse.usage!).toHaveProperty("elements_processed");
      expect(waitResponse.usage!).toHaveProperty("element_type");
      expect(waitResponse.usage!).toHaveProperty("credits_used");
      expect(waitResponse.usage!.element_type).toBe("video");

      // Check response structure
      expect(waitResponse.response).toHaveProperty("metadata");
      expect(waitResponse.response).toHaveProperty("segments");

      // Check metadata
      expect(waitResponse.response.metadata).toHaveProperty("duration");
      expect(typeof waitResponse.response.metadata.duration).toBe("number");
      expect(waitResponse.response.metadata.duration).toBeGreaterThan(0);

      // Check segments
      expect(Array.isArray(waitResponse.response.segments)).toBe(true);
      expect(waitResponse.response.segments.length).toBeGreaterThan(0);

      // Check first segment structure
      const firstSegment = waitResponse.response.segments[0];
      expect(firstSegment).toHaveProperty("start_time");
      expect(firstSegment).toHaveProperty("end_time");
      expect(firstSegment).toHaveProperty("audio");
      expect(firstSegment).toHaveProperty("video");
      expect(typeof firstSegment.start_time).toBe("number");
      expect(typeof firstSegment.end_time).toBe("number");

      // Check audio content in segment
      expect(firstSegment.audio).toHaveProperty("content");
      expect(typeof firstSegment.audio.content).toBe("string");
      expect(firstSegment.audio.content.length).toBeGreaterThan(0);

      // Check video content in segment
      expect(firstSegment.video).toHaveProperty("content");
      expect(typeof firstSegment.video.content).toBe("string");
      expect(firstSegment.video.content.length).toBeGreaterThan(0);
    });

    it("should generate video predictions using url", async () => {
      const videoUrl =
        "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/video.transcription/timer_video.mp4";

      const result = await client.video.generate({
        url: videoUrl,
        domain: "video.transcription",
        batch: true,
      });

      // Initial response should be pending for batch processing
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("created_at");
      expect(result).toHaveProperty("completed_at");
      expect(result).toHaveProperty("usage");
      expect(result.status).toBe("pending");
      expect(result.response).toBeNull();
      expect(result.completed_at).toBeNull();

      // Wait for completion
      const waitResponse = await client.predictions.wait(result.id, 300);

      expect(waitResponse.status).toBe("completed");
      expect(waitResponse.response).not.toBeNull();
      expect(waitResponse.completed_at).not.toBeNull();

      // Check usage information
      expect(waitResponse.usage).toBeDefined();
      expect(waitResponse.usage!).toHaveProperty("elements_processed");
      expect(waitResponse.usage!).toHaveProperty("element_type");
      expect(waitResponse.usage!).toHaveProperty("credits_used");
      expect(waitResponse.usage!.element_type).toBe("video");

      // Check response structure
      expect(waitResponse.response).toHaveProperty("metadata");
      expect(waitResponse.response).toHaveProperty("segments");

      // Check metadata
      expect(waitResponse.response.metadata).toHaveProperty("duration");
      expect(typeof waitResponse.response.metadata.duration).toBe("number");
      expect(waitResponse.response.metadata.duration).toBeGreaterThan(0);

      // Check segments
      expect(Array.isArray(waitResponse.response.segments)).toBe(true);
      expect(waitResponse.response.segments.length).toBeGreaterThan(0);

      // Check first segment structure
      const firstSegment = waitResponse.response.segments[0];
      expect(firstSegment).toHaveProperty("start_time");
      expect(firstSegment).toHaveProperty("end_time");
      expect(firstSegment).toHaveProperty("audio");
      expect(firstSegment).toHaveProperty("video");
      expect(typeof firstSegment.start_time).toBe("number");
      expect(typeof firstSegment.end_time).toBe("number");

      // Check audio content in segment
      expect(firstSegment.audio).toHaveProperty("content");
      expect(typeof firstSegment.audio.content).toBe("string");
      expect(firstSegment.audio.content.length).toBeGreaterThan(0);

      // Check video content in segment
      expect(firstSegment.video).toHaveProperty("content");
      expect(typeof firstSegment.video.content).toBe("string");
      expect(firstSegment.video.content.length).toBeGreaterThan(0);

      // Test get endpoint
      const getResponse = await client.predictions.get(result.id);
      expect(getResponse.status).toBe("completed");
      expect(getResponse.response).not.toBeNull();
      expect(getResponse.response).toHaveProperty("segments");
    });
  });
});
