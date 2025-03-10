import { config } from "dotenv";
config({ path: ".env.test" });

import { VlmRun } from "../../../src/index";
import { FileResponse, FilePurpose } from "../../../src/client/types";

jest.setTimeout(60000);

describe("Integration: Files", () => {
  let client: VlmRun;

  beforeAll(() => {
    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY ?? "",
      baseURL: process.env.TEST_BASE_URL ?? "",
    });
  });

  describe("list", () => {
    it("should list files with default pagination", async () => {
      const result = await client.files.list({});
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const file: FileResponse = result[0];
        expect(file).toHaveProperty("id");
        expect(file).toHaveProperty("filename");
        expect(file).toHaveProperty("bytes");
        expect(file).toHaveProperty("purpose");
        expect(file).toHaveProperty("created_at");
        expect(file).toHaveProperty("object");
      }
    });

    it("should list files with custom pagination", async () => {
      const skip = 0;
      const limit = 5;
      const result = await client.files.list({ skip, limit });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe("upload", () => {
    const testFilePath = "tests/integration/assets/google_invoice.pdf";

    it("should upload file and get file details", async () => {
      const result = await client.files.upload({
        filePath: testFilePath,
        purpose: "assistants",
        checkDuplicate: true,
      });

      expect(result.id).toBeTruthy();
      expect(result.filename).toBe("google_invoice.pdf");
      expect(result.created_at).toBeTruthy();
      expect(result.object).toBe("file");
      expect(result.bytes).toBeTruthy();
      expect(result.purpose).toBe("assistants" as FilePurpose);

      // Test get endpoint
      const getResponse = await client.files.get(result.id);
      expect(getResponse.id).toBe(result.id);
      expect(getResponse).toHaveProperty("filename");
      expect(getResponse).toHaveProperty("created_at");
      expect(getResponse).toHaveProperty("object");
      expect(getResponse).toHaveProperty("bytes");
    });

    it("should return existing file if found and checkDuplicate is true", async () => {
      const result = await client.files.upload({
        filePath: testFilePath,
        purpose: "assistants",
        checkDuplicate: true,
      });

      expect(result.id).toBeTruthy();
      expect(result.filename).toBe("google_invoice.pdf");
      expect(result.created_at).toBeTruthy();
      expect(result.object).toBe("file");
      expect(result.bytes).toBeTruthy();
      expect(result.purpose).toBe("assistants" as FilePurpose);
    });
  });
});
