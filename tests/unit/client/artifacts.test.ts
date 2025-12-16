import { Client } from '../../../src/client/base_requestor';
import { Artifacts } from '../../../src/client/artifacts';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Artifacts', () => {
  let client: jest.Mocked<Client>;
  let artifacts: Artifacts;

  beforeEach(() => {
    client = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.example.com',
    } as jest.Mocked<Client>;
    
    artifacts = new Artifacts(client);
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should get artifact with raw response', async () => {
      const mockData = Buffer.from('mock artifact content');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'application/octet-stream' },
      });

      const result = await artifacts.get({
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        objectId: 'img_abc123',
        rawResponse: true,
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('mock artifact content');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.example.com/artifacts/550e8400-e29b-41d4-a716-446655440000/img_abc123',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-api-key' },
          responseType: 'arraybuffer',
        })
      );
    });

    it('should get image artifact and return Buffer', async () => {
      const mockData = Buffer.from('mock image data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'image/jpeg' },
      });

      const result = await artifacts.get({
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        objectId: 'img_abc123',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('mock image data');
    });

    it('should get URL artifact and return string', async () => {
      const mockUrl = 'https://example.com/resource';
      mockedAxios.get.mockResolvedValue({
        data: Buffer.from(mockUrl),
        headers: { 'content-type': 'text/plain' },
      });

      const result = await artifacts.get({
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        objectId: 'url_abc123',
      });

      expect(typeof result).toBe('string');
      expect(result).toBe(mockUrl);
    });

    it('should throw error for invalid object ID format', async () => {
      const mockData = Buffer.from('mock data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'application/octet-stream' },
      });

      await expect(
        artifacts.get({
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          objectId: 'invalid',
        })
      ).rejects.toThrow('Invalid object ID');
    });

    it('should throw error for object ID with wrong suffix length', async () => {
      const mockData = Buffer.from('mock data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'application/octet-stream' },
      });

      await expect(
        artifacts.get({
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          objectId: 'img_ab',
        })
      ).rejects.toThrow('Invalid object ID');
    });

    it('should throw error for image with non-image content type', async () => {
      const mockData = Buffer.from('mock data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'text/plain' },
      });

      await expect(
        artifacts.get({
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          objectId: 'img_abc123',
        })
      ).rejects.toThrow('Expected image content type');
    });

    it('should return Buffer for unknown object type', async () => {
      const mockData = Buffer.from('mock unknown data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'application/octet-stream' },
      });

      const result = await artifacts.get({
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        objectId: 'unk_abc123',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('mock unknown data');
    });
  });

  describe('list', () => {
    it('should throw NotImplementedError', async () => {
      await expect(
        artifacts.list('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow('Artifacts.list() is not yet implemented');
    });
  });
});
