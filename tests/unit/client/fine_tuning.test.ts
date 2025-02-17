import { Client } from '../../../src/client/base_requestor';
import { Finetuning } from '../../../src/client/fine_tuning';
import { FinetuningResponse, FinetuningProvisionResponse, PredictionResponse } from '../../../src/client/types';

jest.mock('../../../src/client/base_requestor');

describe('Finetuning', () => {
  let client: jest.Mocked<Client>;
  let finetuning: Finetuning;

  beforeEach(() => {
    client = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.example.com',
    } as jest.Mocked<Client>;
    finetuning = new Finetuning(client);
  });

  describe('create', () => {
    it('should create a fine-tuning job with minimal parameters', async () => {
      const mockResponse: FinetuningResponse = {
        id: 'ft_123',
        status: 'running',
        model: 'base-model',
        created_at: new Date().toISOString(),
        training_file_id: 'file_123',
        num_epochs: 1,
        batch_size: 1,
        learning_rate: 2e-4,
      };
      jest.spyOn(finetuning['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await finetuning.create({
        model: 'base-model',
        trainingFile: 'file_123',
      });

      expect(result).toEqual(mockResponse);
      expect(finetuning['requestor'].request).toHaveBeenCalledWith(
        'POST',
        'create',
        undefined,
        {
          callback_url: undefined,
          model: 'base-model',
          training_file: 'file_123',
          validation_file: undefined,
          num_epochs: 1,
          batch_size: 1,
          learning_rate: 2e-4,
          suffix: undefined,
          wandb_api_key: undefined,
          wandb_base_url: undefined,
          wandb_project_name: undefined,
        }
      );
    });

    it('should create a fine-tuning job with all parameters', async () => {
      const mockResponse: FinetuningResponse = {
        id: 'ft_123',
        status: 'running',
        model: 'base-model',
        created_at: new Date().toISOString(),
        training_file_id: 'file_123',
        num_epochs: 5,
        batch_size: 8,
        learning_rate: 1e-4,
      };
      jest.spyOn(finetuning['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await finetuning.create({
        model: 'base-model',
        trainingFile: 'file_123',
        validationFile: 'file_456',
        numEpochs: 5,
        batchSize: 8,
        learningRate: 1e-4,
        suffix: 'test-model',
        wandbApiKey: 'wandb-key',
        wandbBaseUrl: 'https://wandb.example.com',
        wandbProjectName: 'test-project',
        callbackUrl: 'https://callback.example.com',
      });

      expect(result).toEqual(mockResponse);
      expect(finetuning['requestor'].request).toHaveBeenCalledWith(
        'POST',
        'create',
        undefined,
        {
          callback_url: 'https://callback.example.com',
          model: 'base-model',
          training_file: 'file_123',
          validation_file: 'file_456',
          num_epochs: 5,
          batch_size: 8,
          learning_rate: 1e-4,
          suffix: 'test-model',
          wandb_api_key: 'wandb-key',
          wandb_base_url: 'https://wandb.example.com',
          wandb_project_name: 'test-project',
        }
      );
    });

    it('should throw error for invalid suffix', async () => {
      await expect(finetuning.create({
        model: 'base-model',
        trainingFile: 'file_123',
        suffix: 'invalid suffix',
      })).rejects.toThrow('Suffix must be alphanumeric, hyphens or underscores without spaces');
    });
  });

  describe('provision', () => {
    it('should provision a model with default parameters', async () => {
      const mockResponse: FinetuningProvisionResponse = {
        id: 'prov_123',
        status: 'running',
        model: 'ft_model',
        created_at: new Date().toISOString(),
        duration: 600,
        concurrency: 1,
      };
      jest.spyOn(finetuning['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await finetuning.provision({
        model: 'ft_model',
      });

      expect(result).toEqual(mockResponse);
      expect(finetuning['requestor'].request).toHaveBeenCalledWith(
        'POST',
        'provision',
        undefined,
        {
          model: 'ft_model',
          duration: 600,
          concurrency: 1,
        }
      );
    });

    it('should provision a model with custom parameters', async () => {
      const mockResponse: FinetuningProvisionResponse = {
        id: 'prov_123',
        status: 'running',
        model: 'ft_model',
        created_at: new Date().toISOString(),
        duration: 1200,
        concurrency: 2,
      };
      jest.spyOn(finetuning['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await finetuning.provision({
        model: 'ft_model',
        duration: 1200,
        concurrency: 2,
      });

      expect(result).toEqual(mockResponse);
      expect(finetuning['requestor'].request).toHaveBeenCalledWith(
        'POST',
        'provision',
        undefined,
        {
          model: 'ft_model',
          duration: 1200,
          concurrency: 2,
        }
      );
    });
  });

  describe('generate', () => {
    it('should generate a prediction with valid parameters', async () => {
      const mockResponse: PredictionResponse = {
        id: 'pred_123',
        created_at: new Date().toISOString(),
        status: 'completed',
        response: {
          text: 'test prediction'
        },
      };
      jest.spyOn(finetuning['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await finetuning.generate({
        model: 'ft_model',
        prompt: 'test prompt',
        jsonSchema: { type: 'string' },
        images: [],
      });

      expect(result).toEqual(mockResponse);
    });

    it('should throw error when JSON schema is missing', async () => {
      await expect(finetuning.generate({
        model: 'ft_model',
        prompt: 'test prompt',
        images: [],
      })).rejects.toThrow('JSON schema is required for fine-tuned model predictions');
    });

    it('should throw error when prompt is missing', async () => {
      await expect(finetuning.generate({
        model: 'ft_model',
        jsonSchema: { type: 'string' },
        images: [],
      })).rejects.toThrow('Prompt is required for fine-tuned model predictions');
    });

    it('should throw error when domain is provided', async () => {
      await expect(finetuning.generate({
        model: 'ft_model',
        prompt: 'test prompt',
        jsonSchema: { type: 'string' },
        domain: 'test-domain',
        images: [],
      })).rejects.toThrow('Domain is not supported for fine-tuned model predictions');
    });

    it('should throw error when detail level is provided', async () => {
      await expect(finetuning.generate({
        model: 'ft_model',
        prompt: 'test prompt',
        jsonSchema: { type: 'string' },
        detail: 'hi',
        images: [],
      })).rejects.toThrow('Detail level is not supported for fine-tuned model predictions');
    });
  });
});
