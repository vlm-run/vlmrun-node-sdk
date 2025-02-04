import { config } from 'dotenv';
config({ path: '.env.test' });

import { VlmRun } from '../../../src/index';
import { FileResponse, FilePurpose } from '../../../src/client/types';

jest.setTimeout(30000);

describe('Integration: Files', () => {
  let client: VlmRun;

  beforeAll(() => {
    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY ?? '',
      baseURL: process.env.TEST_BASE_URL ?? '',
    });
  });

  describe.skip('list', () => {
    it('should list files with default pagination', async () => {
      const result = await client.files.list({});
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const file: FileResponse = result[0];
        expect(file).toHaveProperty('id');
        expect(file).toHaveProperty('filename');
        expect(file).toHaveProperty('bytes');
        expect(file).toHaveProperty('purpose');
        expect(file).toHaveProperty('created_at');
        expect(file).toHaveProperty('object');
      }
    });

    it('should list files with custom pagination', async () => {
      const skip = 0;
      const limit = 5;
      const result = await client.files.list({ skip, limit });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('upload', () => {
    const testFilePath = 'tests/integration/assets/google_invoice.pdf';

    it('should return existing file if found and checkDuplicate is true', async () => {
      const result = await client.files.upload({
        filePath: testFilePath,
        purpose: 'vision',
        checkDuplicate: true,
      });

      expect(result.id).toBeTruthy();
    });
  });
});
