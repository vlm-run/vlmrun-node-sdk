import { Client } from '../../src/client/base_requestor';
import { ImagePredictions, DocumentPredictions, AudioPredictions, VideoPredictions } from '../../src/client/predictions';
import { DetailLevel } from '../../src/client/types';
import * as imageUtils from '../../src/utils/image';

jest.mock('../../src/client/base_requestor');
jest.mock('../../src/utils/image');

describe('Predictions', () => {
  let client: jest.Mocked<Client>;

  beforeEach(() => {
    client = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.example.com',
    } as jest.Mocked<Client>;
  });

  describe('ImagePredictions', () => {
    let imagePredictions: ImagePredictions;

    beforeEach(() => {
      imagePredictions = new ImagePredictions(client);
      (imageUtils.processImage as jest.Mock).mockReturnValue('base64-encoded-image');
    });

    describe('generate', () => {
      it('should generate image predictions with default options', async () => {
        const mockResponse = { id: 'pred_123', status: 'completed' };
        jest.spyOn(imagePredictions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

        const result = await imagePredictions.generate(
          ['image1.jpg'],
          'model1',
          'domain1'
        );

        expect(result).toEqual(mockResponse);
        expect(imagePredictions['requestor'].request).toHaveBeenCalledWith(
          'POST',
          'image/generate',
          undefined,
          {
            image: 'base64-encoded-image',
            model: 'model1',
            domain: 'domain1',
            detail: 'auto',
            batch: false,
            metadata: {},
            json_schema: undefined,
            callback_url: undefined
          }
        );
      });

      it('should generate image predictions with custom options', async () => {
        const mockResponse = { id: 'pred_123', status: 'completed' };
        jest.spyOn(imagePredictions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

        const options = {
          jsonSchema: { type: 'object' },
          detail: 'high' as DetailLevel,
          batch: true,
          metadata: { key: 'value' },
          callbackUrl: 'https://callback.example.com'
        };

        const result = await imagePredictions.generate(
          ['image1.jpg', 'image2.jpg'],
          'model1',
          'domain1',
          options
        );

        expect(result).toEqual(mockResponse);
        expect(imagePredictions['requestor'].request).toHaveBeenCalledWith(
          'POST',
          'image/generate',
          undefined,
          {
            image: 'base64-encoded-image',
            model: 'model1',
            domain: 'domain1',
            detail: 'high',
            batch: true,
            metadata: { key: 'value' },
            json_schema: { type: 'object' },
            callback_url: 'https://callback.example.com'
          }
        );
      });
    });
  });

  describe('DocumentPredictions', () => {
    let documentPredictions: ReturnType<typeof DocumentPredictions>;

    beforeEach(() => {
      documentPredictions = DocumentPredictions(client);
    });

    describe('generate', () => {
      it('should generate document predictions', async () => {
        const mockResponse = { id: 'pred_123', status: 'completed' };
        jest.spyOn(documentPredictions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

        const result = await documentPredictions.generate(
          ['doc1.pdf'],
          'model1',
          'domain1'
        );

        expect(result).toEqual(mockResponse);
        expect(documentPredictions['requestor'].request).toHaveBeenCalledWith(
          'POST',
          '/document/generate',
          undefined,
          {
            file_id: 'doc1.pdf',
            model: 'model1',
            domain: 'domain1',
            detail: 'auto',
            batch: false,
            metadata: {},
            json_schema: undefined,
            callback_url: undefined
          }
        );
      });
    });
  });

  describe('AudioPredictions', () => {
    let audioPredictions: ReturnType<typeof AudioPredictions>;

    beforeEach(() => {
      audioPredictions = AudioPredictions(client);
    });

    describe('generate', () => {
      it('should generate audio predictions', async () => {
        const mockResponse = { id: 'pred_123', status: 'completed' };
        jest.spyOn(audioPredictions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

        const result = await audioPredictions.generate(
          ['audio1.mp3'],
          'model1',
          'domain1'
        );

        expect(result).toEqual(mockResponse);
        expect(audioPredictions['requestor'].request).toHaveBeenCalledWith(
          'POST',
          '/audio/generate',
          undefined,
          {
            file_id: 'audio1.mp3',
            model: 'model1',
            domain: 'domain1',
            detail: 'auto',
            batch: false,
            metadata: {},
            json_schema: undefined,
            callback_url: undefined
          }
        );
      });
    });
  });

  describe('VideoPredictions', () => {
    let videoPredictions: ReturnType<typeof VideoPredictions>;

    beforeEach(() => {
      videoPredictions = VideoPredictions(client);
    });

    describe('generate', () => {
      it('should generate video predictions', async () => {
        const mockResponse = { id: 'pred_123', status: 'completed' };
        jest.spyOn(videoPredictions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

        const result = await videoPredictions.generate(
          ['video1.mp4'],
          'model1',
          'domain1'
        );

        expect(result).toEqual(mockResponse);
        expect(videoPredictions['requestor'].request).toHaveBeenCalledWith(
          'POST',
          '/video/generate',
          undefined,
          {
            file_id: 'video1.mp4',
            model: 'model1',
            domain: 'domain1',
            detail: 'auto',
            batch: false,
            metadata: {},
            json_schema: undefined,
            callback_url: undefined
          }
        );
      });
    });
  });
});
