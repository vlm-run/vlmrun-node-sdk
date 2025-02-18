import { Client } from '../../../src/client/base_requestor';
import { Datasets } from '../../../src/client/datasets';
import { DatasetResponse, FileResponse } from '../../../src/client/types';
import { Files } from '../../../src/client/files';

jest.mock('../../../src/client/base_requestor');
jest.mock('../../../src/client/files');
jest.mock('../../../src/utils/file', () => ({
  createArchive: jest.fn().mockResolvedValue('/tmp/test-dataset.tar.gz'),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  statSync: jest.fn().mockReturnValue({ size: 1024 * 1024 }), // 1 MB mock file
}));

jest.mock('../../../src/client/files', () => ({
  Files: jest.fn().mockImplementation(() => ({
    upload: jest.fn().mockResolvedValue({
      id: 'file_123',
      filename: 'test-dataset.tar.gz',
      bytes: 1024 * 1024, // Mocking a 1 MB file
      purpose: 'datasets',
      created_at: new Date().toISOString(),
      object: 'file',
    }),
  })),
}));


describe('Datasets', () => {
  let client: jest.Mocked<Client>;
  let datasets: Datasets;
  let mockFiles: jest.Mocked<Files>;

  beforeEach(() => {
    client = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.example.com',
    } as jest.Mocked<Client>;
    
    mockFiles = {
      upload: jest.fn(),
    } as unknown as jest.Mocked<Files>;

    datasets = new Datasets(client);
    // @ts-ignore - Accessing private property for testing
    datasets.vlmClient = { files: mockFiles };
  });

  describe('create', () => {
    it('should create a dataset with minimal parameters', async () => {
      const mockFileResponse: FileResponse = {
        id: 'file_123',
        filename: 'test-dataset.tar.gz',
        bytes: 1024,
        purpose: 'datasets',
        created_at: new Date().toISOString(),
        object: 'file',
      };

      const mockDatasetResponse: DatasetResponse = {
        id: 'ds_123',
        status: 'running',
        domain: 'test-domain',
        dataset_name: 'test-dataset',
        dataset_type: 'images',
        file_id: 'file_123',
        created_at: new Date().toISOString(),
      };

      mockFiles.upload.mockResolvedValue(mockFileResponse);
      jest.spyOn(datasets['requestor'], 'request').mockResolvedValue([mockDatasetResponse, 200, {}]);

      const result = await datasets.create({
        datasetDirectory: '/path/to/dataset',
        domain: 'test-domain',
        datasetName: 'test-dataset',
        datasetType: 'images',
      });

      expect(result).toEqual(mockDatasetResponse);
      expect(datasets['requestor'].request).toHaveBeenCalledWith(
        'POST',
        'create',
        undefined,
        {
          file_id: 'file_123',
          domain: 'test-domain',
          dataset_name: 'test-dataset',
          dataset_type: 'images',
          wandb_base_url: undefined,
          wandb_project_name: undefined,
          wandb_api_key: undefined,
        }
      );
    });

    it('should create a dataset with minimal parameters', async () => {
      mockFiles.upload.mockResolvedValueOnce({
        id: 'file_123',
        filename: 'test-dataset.tar.gz',
        bytes: 1024 * 1024, // Ensure 'bytes' field is present
        purpose: 'datasets',
        created_at: new Date().toISOString(),
        object: 'file',
      });
    
      const mockDatasetResponse: DatasetResponse = {
        id: 'ds_123',
        status: 'running',
        domain: 'test-domain',
        dataset_name: 'test-dataset',
        dataset_type: 'images',
        file_id: 'file_123',
        created_at: new Date().toISOString(),
      };
    
      jest.spyOn(datasets['requestor'], 'request').mockResolvedValue([mockDatasetResponse, 200, {}]);
    
      const result = await datasets.create({
        datasetDirectory: '/path/to/dataset',
        domain: 'test-domain',
        datasetName: 'test-dataset',
        datasetType: 'images',
      });
    
      expect(result).toEqual(mockDatasetResponse);
    });    

    it('should throw error for invalid dataset type', async () => {
      await expect(datasets.create({
        datasetDirectory: '/path/to/dataset',
        domain: 'test-domain',
        datasetName: 'test-dataset',
        datasetType: 'invalid' as any,
      })).rejects.toThrow('dataset_type must be one of: images, videos, documents');
    });
  });

  describe('get', () => {
    it('should get dataset by ID', async () => {
      const mockResponse: DatasetResponse = {
        id: 'ds_123',
        status: 'completed',
        domain: 'test-domain',
        dataset_name: 'test-dataset',
        dataset_type: 'images',
        file_id: 'file_123',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      jest.spyOn(datasets['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await datasets.get('ds_123');

      expect(result).toEqual(mockResponse);
      expect(datasets['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'ds_123'
      );
    });
  });

  describe('list', () => {
    it('should list datasets with default pagination', async () => {
      const mockResponse: DatasetResponse[] = [
        {
          id: 'ds_123',
          status: 'completed',
          domain: 'test-domain',
          dataset_name: 'test-dataset-1',
          dataset_type: 'images',
          file_id: 'file_123',
          created_at: new Date().toISOString(),
        },
        {
          id: 'ds_456',
          status: 'running',
          domain: 'test-domain',
          dataset_name: 'test-dataset-2',
          dataset_type: 'videos',
          file_id: 'file_456',
          created_at: new Date().toISOString(),
        },
      ];

      jest.spyOn(datasets['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await datasets.list();

      expect(result).toEqual(mockResponse);
      expect(datasets['requestor'].request).toHaveBeenCalledWith(
        'GET',
        '',
        {
          skip: 0,
          limit: 10,
        }
      );
    });

    it('should list datasets with custom pagination', async () => {
      const mockResponse: DatasetResponse[] = [
        {
          id: 'ds_789',
          status: 'completed',
          domain: 'test-domain',
          dataset_name: 'test-dataset-3',
          dataset_type: 'documents',
          file_id: 'file_789',
          created_at: new Date().toISOString(),
        },
      ];

      jest.spyOn(datasets['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await datasets.list({ skip: 2, limit: 1 });

      expect(result).toEqual(mockResponse);
      expect(datasets['requestor'].request).toHaveBeenCalledWith(
        'GET',
        '',
        {
          skip: 2,
          limit: 1,
        }
      );
    });

    it('should throw error for non-array response', async () => {
      jest.spyOn(datasets['requestor'], 'request').mockResolvedValue([{}, 200, {}]);

      await expect(datasets.list()).rejects.toThrow('Expected array response');
    });
  });
});
