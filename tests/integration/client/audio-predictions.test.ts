import { config } from "dotenv";

import { VlmRun } from "../../../src/index";

jest.setTimeout(60000);

describe("Integration: Audio Predictions (transcription-summary)", () => {
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
        domain: "audio.transcription-summary",
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

      // transcription-summary metadata may have duration (number), content (summary), topics; duration can be null
      expect(waitResponse.response.metadata).toHaveProperty("duration");
      if (typeof waitResponse.response.metadata.duration === "number") {
        expect(waitResponse.response.metadata.duration).toBeGreaterThan(0);
      }
      if (typeof waitResponse.response.metadata.content === "string") {
        expect(waitResponse.response.metadata.content.length).toBeGreaterThan(0);
      }

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
          domain: "audio.transcription-summary",
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

        // Use the id from audio/generate as the prediction_id for the predictions endpoint
        const predictionId = result.id;

        // Wait for completion (default 60s timeout)
        const waitResponse = await client.predictions.wait(predictionId);

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

        // transcription-summary metadata may have duration (number), content (summary), topics; duration can be null
        expect(waitResponse.response.metadata).toHaveProperty("duration");
        if (typeof waitResponse.response.metadata.duration === "number") {
          expect(waitResponse.response.metadata.duration).toBeGreaterThan(0);
        }
        if (typeof waitResponse.response.metadata.content === "string") {
          expect(waitResponse.response.metadata.content.length).toBeGreaterThan(0);
        }

        // Check segments
        expect(Array.isArray(waitResponse.response.segments)).toBe(true);
        expect(waitResponse.response.segments.length).toBeGreaterThan(0);

        // Test get endpoint (same prediction_id from audio/generate)
        const getResponse = await client.predictions.get(predictionId);
        expect(getResponse.status).toBe("completed");
        expect(getResponse.response).not.toBeNull();
        expect(getResponse.response).toHaveProperty("segments");
    });
  });
});
