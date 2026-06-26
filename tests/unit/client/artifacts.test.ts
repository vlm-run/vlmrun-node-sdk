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
    it('should get artifact with raw response using sessionId', async () => {
      const mockData = Buffer.from('mock artifact content');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'application/octet-stream' },
      });

      const result = await artifacts.get({
        objectId: 'img_abc123',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        rawResponse: true,
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('mock artifact content');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.example.com/artifacts',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-api-key' },
          params: {
            session_id: '550e8400-e29b-41d4-a716-446655440000',
            object_id: 'img_abc123',
          },
          responseType: 'arraybuffer',
        })
      );
    });

    it('should get artifact with raw response using executionId', async () => {
      const mockData = Buffer.from('mock artifact content');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'application/octet-stream' },
      });

      const result = await artifacts.get({
        objectId: 'img_abc123',
        executionId: 'exec-123-456',
        rawResponse: true,
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('mock artifact content');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.example.com/artifacts',
        expect.objectContaining({
          params: {
            execution_id: 'exec-123-456',
            object_id: 'img_abc123',
          },
        })
      );
    });

    it('should throw error when neither sessionId nor executionId is provided', async () => {
      await expect(
        artifacts.get({
          objectId: 'img_abc123',
        })
      ).rejects.toThrow('Either `sessionId` or `executionId` is required');
    });

    it('should throw error when both sessionId and executionId are provided', async () => {
      await expect(
        artifacts.get({
          objectId: 'img_abc123',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          executionId: 'exec-123-456',
        })
      ).rejects.toThrow('Only one of `sessionId` or `executionId` is allowed, not both');
    });

    it('should get image artifact and return Buffer', async () => {
      const mockData = Buffer.from('mock image data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'image/jpeg' },
      });

      const result = await artifacts.get({
        objectId: 'img_abc123',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('mock image data');
    });

    it('should throw error for invalid object ID format', async () => {
      const mockData = Buffer.from('mock data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'application/octet-stream' },
      });

      await expect(
        artifacts.get({
          objectId: 'invalid',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
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
          objectId: 'img_ab',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).rejects.toThrow('Invalid object ID');
    });

    it('should throw error for image with non-jpeg content type', async () => {
      const mockData = Buffer.from('mock data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'text/plain' },
      });

      await expect(
        artifacts.get({
          objectId: 'img_abc123',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).rejects.toThrow('Expected image/jpeg');
    });

    it('should return Buffer for unknown object type', async () => {
      const mockData = Buffer.from('mock unknown data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'application/octet-stream' },
      });

      const result = await artifacts.get({
        objectId: 'unk_abc123',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('mock unknown data');
    });

    it('should throw error for audio artifact with wrong content type', async () => {
      const mockData = Buffer.from('mock audio data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'text/plain' },
      });

      await expect(
        artifacts.get({
          objectId: 'aud_abc123',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).rejects.toThrow('Expected audio/mpeg');
    });

    it('should throw error for document artifact with wrong content type', async () => {
      const mockData = Buffer.from('mock document data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'text/plain' },
      });

      await expect(
        artifacts.get({
          objectId: 'doc_abc123',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).rejects.toThrow('Expected application/pdf');
    });

    it('should throw error for video artifact with wrong content type', async () => {
      const mockData = Buffer.from('mock video data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'text/plain' },
      });

      await expect(
        artifacts.get({
          objectId: 'vid_abc123',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).rejects.toThrow('Expected video/mp4');
    });

    it('should throw error for recon artifact with wrong content type', async () => {
      const mockData = Buffer.from('mock recon data');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'text/plain' },
      });

      await expect(
        artifacts.get({
          objectId: 'recon_abc123',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).rejects.toThrow('Expected application/octet-stream');
    });

    it('should get artifact by filename', async () => {
      const mockData = Buffer.from('mock file content');
      mockedAxios.get.mockResolvedValue({
        data: mockData,
        headers: { 'content-type': 'application/octet-stream' },
      });

      const result = await artifacts.get({
        filename: 'report.pdf',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('mock file content');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.example.com/artifacts',
        expect.objectContaining({
          params: {
            session_id: '550e8400-e29b-41d4-a716-446655440000',
            filename: 'report.pdf',
          },
        })
      );
    });

    it('should throw error when neither objectId nor filename is provided', async () => {
      await expect(
        artifacts.get({
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).rejects.toThrow('Either `objectId` or `filename` is required');
    });

    it('should throw error when both objectId and filename are provided', async () => {
      await expect(
        artifacts.get({
          objectId: 'img_abc123',
          filename: 'report.pdf',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
        })
      ).rejects.toThrow('Only one of `objectId` or `filename` is allowed, not both');
    });
  });

  describe('list', () => {
    it('should list artifacts by sessionId', async () => {
      const mockResponse = {
        data: {
          namespace_id: '550e8400-e29b-41d4-a716-446655440000',
          items: [
            { object_id: 'img_abc123', filename: 'photo.jpg', source: 'store' },
            { object_id: 'doc_def456', filename: null, source: 'manifest' },
          ],
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await artifacts.list({
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.namespace_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].object_id).toBe('img_abc123');
      expect(result.items[0].filename).toBe('photo.jpg');
      expect(result.items[0].source).toBe('store');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.example.com/artifacts/list',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-api-key' },
          params: { session_id: '550e8400-e29b-41d4-a716-446655440000' },
        })
      );
    });

    it('should list artifacts by executionId', async () => {
      const mockResponse = {
        data: {
          namespace_id: 'exec-123-456',
          items: [
            { object_id: 'vid_aaa111', filename: 'clip.mp4', source: 'workspace' },
          ],
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await artifacts.list({
        executionId: 'exec-123-456',
      });

      expect(result.namespace_id).toBe('exec-123-456');
      expect(result.items).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.example.com/artifacts/list',
        expect.objectContaining({
          params: { execution_id: 'exec-123-456' },
        })
      );
    });

    it('should throw error when neither sessionId nor executionId is provided', async () => {
      await expect(
        artifacts.list({})
      ).rejects.toThrow('Either `sessionId` or `executionId` is required');
    });

    it('should throw error when both sessionId and executionId are provided', async () => {
      await expect(
        artifacts.list({
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          executionId: 'exec-123-456',
        })
      ).rejects.toThrow('Only one of `sessionId` or `executionId` is allowed, not both');
    });
  });
});
