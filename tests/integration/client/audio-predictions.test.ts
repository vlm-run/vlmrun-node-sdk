import { config } from "dotenv";

import { VlmRun } from "../../../src/index";
import { z } from "zod";

jest.setTimeout(60000);

describe("Integration: Audio Predictions", () => {
  let client: VlmRun;

  beforeAll(() => {
    config({ path: ".env.test" });

    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY as string,
      baseURL: process.env.TEST_BASE_URL as string,
    });
  });

  describe("AudioPredictions", () => {
    const testFilePath = "tests/integration/assets/two_minute_rules.mp3";

    it("should generate audio predictions using file id with batch processing", async () => {
      const uploadedAudio = await client.files.upload({
        filePath: testFilePath,
        checkDuplicate: false,
      });

      const result = await client.audio.generate({
        fileId: uploadedAudio.id,
        batch: true,
        domain: "audio.transcription",
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
      const waitResponse = await client.predictions.wait(result.id);

      expect(waitResponse.status).toBe("completed");
      expect(waitResponse.response).not.toBeNull();
      expect(waitResponse.completed_at).not.toBeNull();

      // Check usage information
      expect(waitResponse.usage).toBeDefined();
      expect(waitResponse.usage!).toHaveProperty("elements_processed");
      expect(waitResponse.usage!).toHaveProperty("element_type");
      expect(waitResponse.usage!).toHaveProperty("credits_used");
      expect(waitResponse.usage!.element_type).toBe("audio");

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
      expect(firstSegment).toHaveProperty("content");
      expect(typeof firstSegment.start_time).toBe("number");
      expect(typeof firstSegment.end_time).toBe("number");
      expect(typeof firstSegment.content).toBe("string");
      expect(firstSegment.content.length).toBeGreaterThan(0);
    });

    it("should generate audio predictions using url", async () => {
      const audioUrl =
        "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/audio.transcription-summary/two_minute_rules.mp3";

      const result = await client.audio.generate({
        url: audioUrl,
        domain: "audio.transcription",
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
      const waitResponse = await client.predictions.wait(result.id);

      expect(waitResponse.status).toBe("completed");
      expect(waitResponse.response).not.toBeNull();
      expect(waitResponse.completed_at).not.toBeNull();

      // Check usage information
      expect(waitResponse.usage).toBeDefined();
      expect(waitResponse.usage!).toHaveProperty("elements_processed");
      expect(waitResponse.usage!).toHaveProperty("element_type");
      expect(waitResponse.usage!).toHaveProperty("credits_used");
      expect(waitResponse.usage!.element_type).toBe("audio");

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

      // Test get endpoint
      const getResponse = await client.predictions.get(result.id);
      expect(getResponse.status).toBe("completed");
      expect(getResponse.response).not.toBeNull();
      expect(getResponse.response).toHaveProperty("segments");
    });
  });
});
