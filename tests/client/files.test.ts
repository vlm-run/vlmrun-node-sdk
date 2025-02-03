import { Client } from '../../src/client/base_requestor';
import { Files } from '../../src/client/files';
import { FileResponse, FilePurpose } from '../../src/client/types';
import { readFile } from 'fs/promises';
import { createHash } from 'crypto';

jest.mock('../../src/client/base_requestor');
jest.mock('fs/promises');
jest.mock('crypto');

describe('Files', () => {
  let client: jest.Mocked<Client>;
  let files: Files;

  beforeEach(() => {
    client = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.example.com',
    } as jest.Mocked<Client>;
    files = new Files(client);
  });

  describe('list', () => {
    it('should list files with default pagination', async () => {
      const mockResponse: FileResponse[] = [{
        id: 'file_123',
        filename: 'test.jpg',
        bytes: 1000,
        purpose: 'vision' as FilePurpose,
        created_at: new Date().toISOString(),
        object: 'file'
      }];
      jest.spyOn(files['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.list();

      expect(result).toEqual(mockResponse);
      expect(files['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'files',
        { skip: 0, limit: 10 }
      );
    });

    it('should list files with custom pagination', async () => {
      const mockResponse: FileResponse[] = [{
        id: 'file_123',
        filename: 'test.jpg',
        bytes: 1000,
        purpose: 'vision' as FilePurpose,
        created_at: new Date().toISOString(),
        object: 'file'
      }];
      jest.spyOn(files['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.list(5, 20);

      expect(result).toEqual(mockResponse);
      expect(files['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'files',
        { skip: 5, limit: 20 }
      );
    });
  });

  describe('checkFileExists', () => {
    it('should return file if it exists', async () => {
      const mockFileBuffer = Buffer.from('test file content');
      const mockHash = 'test-hash';
      const mockResponse: FileResponse[] = [{
        id: 'file_123',
        filename: 'test.jpg',
        bytes: 1000,
        purpose: 'vision' as FilePurpose,
        created_at: new Date().toISOString(),
        object: 'file'
      }];

      (readFile as jest.Mock).mockResolvedValue(mockFileBuffer);
      const mockHashUpdate = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHash),
      };
      (createHash as jest.Mock).mockReturnValue(mockHashUpdate);
      jest.spyOn(files['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.checkFileExists('test.jpg');

      expect(result).toEqual(mockResponse[0]);
      expect(readFile).toHaveBeenCalledWith('test.jpg');
      expect(createHash).toHaveBeenCalledWith('md5');
      expect(mockHashUpdate.update).toHaveBeenCalledWith(mockFileBuffer);
      expect(mockHashUpdate.digest).toHaveBeenCalledWith('hex');
      expect(files['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'files',
        { hash: mockHash }
      );
    });

    it('should return null if file does not exist', async () => {
      const mockFileBuffer = Buffer.from('test file content');
      const mockHash = 'test-hash';
      
      (readFile as jest.Mock).mockResolvedValue(mockFileBuffer);
      const mockHashUpdate = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHash),
      };
      (createHash as jest.Mock).mockReturnValue(mockHashUpdate);
      jest.spyOn(files['requestor'], 'request').mockResolvedValue([[], 200, {}]);

      const result = await files.checkFileExists('test.jpg');

      expect(result).toBeNull();
    });

    it('should return null if request fails', async () => {
      const mockFileBuffer = Buffer.from('test file content');
      const mockHash = 'test-hash';
      
      (readFile as jest.Mock).mockResolvedValue(mockFileBuffer);
      const mockHashUpdate = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHash),
      };
      (createHash as jest.Mock).mockReturnValue(mockHashUpdate);
      jest.spyOn(files['requestor'], 'request').mockRejectedValue(new Error('Request failed'));

      const result = await files.checkFileExists('test.jpg');

      expect(result).toBeNull();
    });
  });

  describe('upload', () => {
    it('should return existing file if found and checkDuplicate is true', async () => {
      const existingFile: FileResponse = {
        id: 'file_123',
        filename: 'test.jpg',
        bytes: 1000,
        purpose: 'vision' as FilePurpose,
        created_at: new Date().toISOString(),
        object: 'file'
      };
      jest.spyOn(files, 'checkFileExists').mockResolvedValue(existingFile);

      const result = await files.upload('test.jpg', 'vision');

      expect(result).toEqual(existingFile);
      expect(files.checkFileExists).toHaveBeenCalledWith('test.jpg');
      expect(files['requestor'].request).not.toHaveBeenCalled();
    });

    it('should upload new file if no duplicate found', async () => {
      const mockResponse: FileResponse = {
        id: 'file_123',
        filename: 'test.jpg',
        bytes: 1000,
        purpose: 'vision' as FilePurpose,
        created_at: new Date().toISOString(),
        object: 'file'
      };
      jest.spyOn(files, 'checkFileExists').mockResolvedValue(null);
      jest.spyOn(files['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.upload('test.jpg', 'vision');

      expect(result).toEqual(mockResponse);
      expect(files.checkFileExists).toHaveBeenCalledWith('test.jpg');
      expect(files['requestor'].request).toHaveBeenCalled();
    });

    it('should skip duplicate check if checkDuplicate is false', async () => {
      const mockResponse: FileResponse = {
        id: 'file_123',
        filename: 'test.jpg',
        bytes: 1000,
        purpose: 'vision' as FilePurpose,
        created_at: new Date().toISOString(),
        object: 'file'
      };
      jest.spyOn(files, 'checkFileExists');
      jest.spyOn(files['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await files.upload('test.jpg', 'vision', false);

      expect(result).toEqual(mockResponse);
      expect(files.checkFileExists).not.toHaveBeenCalled();
      expect(files['requestor'].request).toHaveBeenCalled();
    });
  });
});
