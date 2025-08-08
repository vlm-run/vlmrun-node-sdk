import { Client } from '../../../src/client/base_requestor';
import { Agent } from '../../../src/client/agent';
import { AgentExecutionResponse, AgentInfo } from '../../../src/client/types';

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
      const mockResponse: AgentInfo = {
        id: 'agent_123',
        name: 'test-agent',
        version: 'v1',
        description: 'Test agent for unit tests',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
      const mockResponse: AgentInfo = {
        id: 'agent_123',
        name: 'test-agent',
        version: 'latest',
        description: 'Test agent for unit tests',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
    it('should execute agent with inputs parameter', async () => {
      const mockResponse: AgentExecutionResponse = {
        id: 'exec_789',
        name: 'test-agent',
        version: 'v1',
        status: 'running',
        created_at: new Date().toISOString(),
        usage: { credits_used: 5 },
      };

      jest.spyOn(agent['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.execute({
        name: 'test-agent',
        version: 'v1',
        inputs: { 
          documents: ['file_123'], 
          prompt: 'Extract invoice data' 
        },
        batch: true,
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
          inputs: { 
            documents: ['file_123'], 
            prompt: 'Extract invoice data' 
          },
        }
      );
    });

    it('should execute agent with config and metadata', async () => {
      const mockResponse: AgentExecutionResponse = {
        id: 'exec_123',
        name: 'test-agent',
        version: 'v1',
        status: 'running',
        created_at: new Date().toISOString(),
        usage: { credits_used: 10 },
      };

      jest.spyOn(agent['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.execute({
        name: 'test-agent',
        version: 'v1',
        inputs: { prompt: 'Test prompt' },
        batch: true,
        config: {
          prompt: 'System prompt',
          jsonSchema: { type: 'object' },
        },
        metadata: {
          environment: 'dev',
          sessionId: 'session_123',
        },
        callbackUrl: 'https://example.com/callback',
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
          inputs: { prompt: 'Test prompt' },
          config: {
            prompt: 'System prompt',
            json_schema: { type: 'object' },
          },
          metadata: {
            environment: 'dev',
            session_id: 'session_123',
          },
          callback_url: 'https://example.com/callback',
        }
      );
    });

    it('should throw error if batch is false', async () => {
      await expect(agent.execute({
        name: 'test-agent',
        batch: false,
      })).rejects.toThrow('Batch mode is required for agent execution');
    });

    it('should throw error for non-object response', async () => {
      jest.spyOn(agent['requestor'], 'request').mockResolvedValue(['not-an-object', 200, {}]);

      await expect(agent.execute({
        name: 'test-agent',
        inputs: { prompt: 'test' },
      })).rejects.toThrow('Expected object response');
    });
  });
});          