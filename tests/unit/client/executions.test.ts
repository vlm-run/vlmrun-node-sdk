import { Client } from '../../../src/client/base_requestor';
import { Executions } from '../../../src/client/executions';
import { AgentExecutionResponse } from '../../../src/client/types';

jest.mock('../../../src/client/base_requestor');

describe('Executions', () => {
  let client: jest.Mocked<Client>;
  let executions: Executions;

  beforeEach(() => {
    client = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.example.com',
    } as jest.Mocked<Client>;
    
    executions = new Executions(client);
  });

  describe('list', () => {
    it('should list executions successfully', async () => {
      const mockResponse: AgentExecutionResponse[] = [
        {
          id: 'exec_123',
          name: 'test-agent',
          version: 'v1',
          created_at: '2023-01-01T00:00:00Z',
          completed_at: '2023-01-01T00:00:01Z',
          response: { result: 'success' },
          status: 'completed',
          usage: { credits_used: 10 },
        },
      ];

      jest.spyOn(executions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await executions.list();

      expect(result).toEqual(mockResponse);
      expect(executions['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'agent/executions',
        { skip: undefined, limit: undefined }
      );
    });

    it('should list executions with pagination', async () => {
      const mockResponse: AgentExecutionResponse[] = [];

      jest.spyOn(executions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await executions.list({ skip: 10, limit: 5 });

      expect(result).toEqual(mockResponse);
      expect(executions['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'agent/executions',
        { skip: 10, limit: 5 }
      );
    });
  });

  describe('get', () => {
    it('should get execution by ID successfully', async () => {
      const mockResponse: AgentExecutionResponse = {
        id: 'exec_123',
        name: 'test-agent',
        version: 'v1',
        created_at: '2023-01-01T00:00:00Z',
        completed_at: '2023-01-01T00:00:01Z',
        response: { result: 'success' },
        status: 'completed',
        usage: { credits_used: 10 },
      };

      jest.spyOn(executions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await executions.get('exec_123');

      expect(result).toEqual(mockResponse);
      expect(executions['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'agent/executions/exec_123'
      );
    });

    it('should throw error for non-object response', async () => {
      jest.spyOn(executions['requestor'], 'request').mockResolvedValue(['not-an-object', 200, {}]);

      await expect(executions.get('exec_123')).rejects.toThrow('Expected object response');
    });
  });

  describe('wait', () => {
    it('should wait for execution to complete', async () => {
      const mockResponse: AgentExecutionResponse = {
        id: 'exec_123',
        name: 'test-agent',
        version: 'v1',
        created_at: '2023-01-01T00:00:00Z',
        completed_at: '2023-01-01T00:00:01Z',
        response: { result: 'success' },
        status: 'completed',
        usage: { credits_used: 10 },
      };

      jest.spyOn(executions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await executions.wait('exec_123', 10, 1);

      expect(result).toEqual(mockResponse);
      expect(executions['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'agent/executions/exec_123'
      );
    });

    it('should throw timeout error when execution does not complete', async () => {
      const mockResponse: AgentExecutionResponse = {
        id: 'exec_123',
        name: 'test-agent',
        version: 'v1',
        created_at: '2023-01-01T00:00:00Z',
        status: 'running',
        usage: { credits_used: 0 },
      };

      jest.spyOn(executions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      await expect(executions.wait('exec_123', 1, 0.1)).rejects.toThrow(
        'Execution exec_123 did not complete within 1 seconds'
      );
    });
  });
});
