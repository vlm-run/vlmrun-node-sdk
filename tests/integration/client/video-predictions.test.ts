import { config } from "dotenv";

import { VlmRun } from "../../../src/index";

jest.setTimeout(300000);

describe("Integration: Video Predictions (no speech required)", () => {
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

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("created_at");
      expect(result).toHaveProperty("completed_at");
      expect(result).toHaveProperty("usage");
      expect(result.status).toBe("pending");
      expect(result.response).toBeNull();
      expect(result.completed_at).toBeNull();

      const waitResponse = await client.predictions.wait(result.id, 300);

      expect(waitResponse.status).toBe("completed");
      expect(waitResponse.response).not.toBeNull();
      expect(waitResponse.completed_at).not.toBeNull();

      expect(waitResponse.usage).toBeDefined();
      expect(waitResponse.usage!).toHaveProperty("elements_processed");
      expect(waitResponse.usage!).toHaveProperty("element_type");
      expect(waitResponse.usage!).toHaveProperty("credits_used");
      expect(waitResponse.usage!.element_type).toBe("video");

      expect(waitResponse.response).toHaveProperty("metadata");
      expect(waitResponse.response).toHaveProperty("segments");

      expect(waitResponse.response.metadata).toHaveProperty("duration");
      expect(typeof waitResponse.response.metadata.duration).toBe("number");
      expect(waitResponse.response.metadata.duration).toBeGreaterThan(0);

      expect(Array.isArray(waitResponse.response.segments)).toBe(true);
      expect(waitResponse.response.segments.length).toBeGreaterThan(0);

      const firstSegment = waitResponse.response.segments[0];
      expect(firstSegment).toHaveProperty("start_time");
      expect(firstSegment).toHaveProperty("end_time");
      expect(firstSegment).toHaveProperty("audio");
      expect(firstSegment).toHaveProperty("video");
      expect(typeof firstSegment.start_time).toBe("number");
      expect(typeof firstSegment.end_time).toBe("number");

      // Audio: allow empty string when video has no speech
      expect(firstSegment.audio).toHaveProperty("content");
      expect(typeof firstSegment.audio.content).toBe("string");

      // Video content must be present (visual description)
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

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("created_at");
      expect(result).toHaveProperty("completed_at");
      expect(result).toHaveProperty("usage");
      expect(result.status).toBe("pending");
      expect(result.response).toBeNull();
      expect(result.completed_at).toBeNull();

      const waitResponse = await client.predictions.wait(result.id, 300);

      expect(waitResponse.status).toBe("completed");
      expect(waitResponse.response).not.toBeNull();
      expect(waitResponse.completed_at).not.toBeNull();

      expect(waitResponse.usage).toBeDefined();
      expect(waitResponse.usage!).toHaveProperty("elements_processed");
      expect(waitResponse.usage!).toHaveProperty("element_type");
      expect(waitResponse.usage!).toHaveProperty("credits_used");
      expect(waitResponse.usage!.element_type).toBe("video");

      expect(waitResponse.response).toHaveProperty("metadata");
      expect(waitResponse.response).toHaveProperty("segments");

      expect(waitResponse.response.metadata).toHaveProperty("duration");
      expect(typeof waitResponse.response.metadata.duration).toBe("number");
      expect(waitResponse.response.metadata.duration).toBeGreaterThan(0);

      expect(Array.isArray(waitResponse.response.segments)).toBe(true);
      expect(waitResponse.response.segments.length).toBeGreaterThan(0);

      const firstSegment = waitResponse.response.segments[0];
      expect(firstSegment).toHaveProperty("start_time");
      expect(firstSegment).toHaveProperty("end_time");
      expect(firstSegment).toHaveProperty("audio");
      expect(firstSegment).toHaveProperty("video");
      expect(typeof firstSegment.start_time).toBe("number");
      expect(typeof firstSegment.end_time).toBe("number");

      // Audio: allow empty string when video has no speech
      expect(firstSegment.audio).toHaveProperty("content");
      expect(typeof firstSegment.audio.content).toBe("string");

      // Video content must be present (visual description)
      expect(firstSegment.video).toHaveProperty("content");
      expect(typeof firstSegment.video.content).toBe("string");
      expect(firstSegment.video.content.length).toBeGreaterThan(0);

      const getResponse = await client.predictions.get(result.id);
      expect(getResponse.status).toBe("completed");
      expect(getResponse.response).not.toBeNull();
      expect(getResponse.response).toHaveProperty("segments");
    });
  });
});
