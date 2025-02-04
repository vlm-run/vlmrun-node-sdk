import { config } from 'dotenv';

import { VlmRun } from '../../../src/index';

jest.setTimeout(30000);

describe('Integration: Predictions', () => {
  let client: VlmRun;

  beforeAll(() => {
    config({ path: '.env.test' });
    
    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY as string,
      baseURL: process.env.TEST_BASE_URL as string,
    });
  });

  describe('ImagePredictions', () => {
    it('should generate image predictions with default options', async () => {
      const testImagePath = 'tests/integration/assets/invoice.jpg';

      const result = await client.image.generate({
        images: [testImagePath],
        model: 'vlm-1',
        domain: 'document.invoice',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
    });

    it('should generate image predictions with custom options', async () => {
      const testImagePath = 'tests/integration/assets/invoice.jpg';

      const result = await client.image.generate({
        images: [testImagePath],
        model: 'vlm-1',
        domain: 'document.invoice',
        jsonSchema: { type: 'object' },
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
    });
  });

  describe.skip('DocumentPredictions', () => {
    const testFilePath = 'tests/integration/assets/google_invoice.pdf';

    it('should generate document predictions', async () => {
      const uploadedDocument = await client.files.upload({
        filePath: testFilePath,
        purpose: 'vision',
        checkDuplicate: true,
      });

      const result = await client.document.generate({
        fileIds: [uploadedDocument.id],
        model: 'vlm-1',
        domain: 'document.invoice',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
    });
  });
});
