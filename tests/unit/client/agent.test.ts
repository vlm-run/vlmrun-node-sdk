import { Client } from '../../../src/client/base_requestor';
import { Agent } from '../../../src/client/agent';
import { PredictionResponse } from '../../../src/client/types';

jest.mock('../../../src/client/base_requestor');

describe('Agent', () => {
  let client: jest.Mocked<Client>;
  let agent: Agent;

  beforeEach(() => {
    client = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.example.com',
    } as jest.Mocked<Client>;
    
    agent = new Agent(client);
  });

  describe('get', () => {
    it('should get agent by name and version', async () => {
      const mockResponse: PredictionResponse = {
        id: 'agent_123',
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        response: {
          name: 'test-agent',
          description: 'Test agent for unit tests',
        },
      };

      jest.spyOn(agent['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.get({
        name: 'test-agent',
        version: 'v1',
      });

      expect(result).toEqual(mockResponse);
      expect(agent['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'agent/test-agent/v1'
      );
    });

    it('should use "latest" as default version', async () => {
      const mockResponse: PredictionResponse = {
        id: 'agent_123',
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        response: {
          name: 'test-agent',
          description: 'Test agent for unit tests',
        },
      };

      jest.spyOn(agent['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.get({
        name: 'test-agent',
      });

      expect(result).toEqual(mockResponse);
      expect(agent['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'agent/test-agent/latest'
      );
    });

    it('should throw error for non-object response', async () => {
      jest.spyOn(agent['requestor'], 'request').mockResolvedValue(['not-an-object', 200, {}]);

      await expect(agent.get({ name: 'test-agent' })).rejects.toThrow('Expected object response');
    });
  });

  describe('execute', () => {
    it('should execute agent with file IDs', async () => {
      const mockResponse: PredictionResponse = {
        id: 'exec_123',
        status: 'running',
        created_at: new Date().toISOString(),
      };

      jest.spyOn(agent['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.execute({
        name: 'test-agent',
        version: 'v1',
        fileIds: ['file_123', 'file_456'],
        batch: true,
        config: {
          detail: 'hi',
          confidence: true,
        },
        metadata: {
          environment: 'dev',
          sessionId: 'test-session',
        },
        callbackUrl: 'https://webhook.example.com/callback',
      });

      expect(result).toEqual(mockResponse);
      expect(agent['requestor'].request).toHaveBeenCalledWith(
        'POST',
        'agent/execute',
        undefined,
        {
          name: 'test-agent',
          version: 'v1',
          batch: true,
          file_ids: ['file_123', 'file_456'],
          config: {
            detail: 'hi',
            confidence: true,
          },
          metadata: {
            environment: 'dev',
            sessionId: 'test-session',
          },
          callback_url: 'https://webhook.example.com/callback',
        }
      );
    });

    it('should execute agent with URLs', async () => {
      const mockResponse: PredictionResponse = {
        id: 'exec_456',
        status: 'running',
        created_at: new Date().toISOString(),
      };

      jest.spyOn(agent['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.execute({
        name: 'test-agent',
        urls: ['https://example.com/test.pdf'],
      });

      expect(result).toEqual(mockResponse);
      expect(agent['requestor'].request).toHaveBeenCalledWith(
        'POST',
        'agent/execute',
        undefined,
        {
          name: 'test-agent',
          version: 'latest',
          batch: true,
          urls: ['https://example.com/test.pdf'],
        }
      );
    });

    it('should throw error if neither fileIds nor urls are provided', async () => {
      await expect(agent.execute({
        name: 'test-agent',
      })).rejects.toThrow('Either `fileIds` or `urls` must be provided');
    });

    it('should throw error if both fileIds and urls are provided', async () => {
      await expect(agent.execute({
        name: 'test-agent',
        fileIds: ['file_123'],
        urls: ['https://example.com/test.pdf'],
      })).rejects.toThrow('Only one of `fileIds` or `urls` can be provided');
    });

    it('should throw error for non-object response', async () => {
      jest.spyOn(agent['requestor'], 'request').mockResolvedValue(['not-an-object', 200, {}]);

      await expect(agent.execute({
        name: 'test-agent',
        fileIds: ['file_123'],
      })).rejects.toThrow('Expected object response');
    });
  });
}); 