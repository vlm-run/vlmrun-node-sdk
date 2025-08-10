import { Client } from '../../../src/client/base_requestor';
import { Executions } from '../../../src/client/executions';
import { AgentExecutionResponse } from '../../../src/client/types';
import { RequestTimeoutError } from '../../../src/client/exceptions';

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
    it('should list executions with default parameters', async () => {
      const mockResponse: AgentExecutionResponse[] = [
        {
          id: 'exec_123',
          name: 'test-agent',
          version: 'v1',
          status: 'completed',
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          usage: { credits_used: 10 },
        },
      ];

      jest.spyOn(executions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await executions.list();

      expect(result).toEqual(mockResponse);
      expect(executions['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'agent/executions',
        { skip: 0, limit: 10 }
      );
    });

    it('should list executions with custom parameters', async () => {
      const mockResponse: AgentExecutionResponse[] = [];

      jest.spyOn(executions['requestor'], 'request').mockResolvedValue([mockResponse, 200, {}]);

      const result = await executions.list({ skip: 20, limit: 5 });

      expect(result).toEqual(mockResponse);
      expect(executions['requestor'].request).toHaveBeenCalledWith(
        'GET',
        'agent/executions',
        { skip: 20, limit: 5 }
      );
    });
  });

  describe('get', () => {
    it('should get execution by ID', async () => {
      const mockResponse: AgentExecutionResponse = {
        id: 'exec_123',
        name: 'test-agent',
        version: 'v1',
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
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
  });

  describe('wait', () => {
    it('should return immediately if execution is completed', async () => {
      const mockResponse: AgentExecutionResponse = {
        id: 'exec_123',
        name: 'test-agent',
        version: 'v1',
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        usage: { credits_used: 10 },
      };

      jest.spyOn(executions, 'get').mockResolvedValue(mockResponse);

      const result = await executions.wait('exec_123');

      expect(result).toEqual(mockResponse);
      expect(executions.get).toHaveBeenCalledWith('exec_123');
    });

    it('should poll until completion', async () => {
      const runningResponse: AgentExecutionResponse = {
        id: 'exec_123',
        name: 'test-agent',
        version: 'v1',
        status: 'running',
        created_at: new Date().toISOString(),
        usage: { credits_used: 5 },
      };

      const completedResponse: AgentExecutionResponse = {
        ...runningResponse,
        status: 'completed',
        completed_at: new Date().toISOString(),
        usage: { credits_used: 10 },
      };

      jest.spyOn(executions, 'get')
        .mockResolvedValueOnce(runningResponse)
        .mockResolvedValueOnce(completedResponse);

      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await executions.wait('exec_123', 300, 1);

      expect(result).toEqual(completedResponse);
      expect(executions.get).toHaveBeenCalledTimes(2);
    });

    it('should throw RequestTimeoutError if execution does not complete', async () => {
      const runningResponse: AgentExecutionResponse = {
        id: 'exec_123',
        name: 'test-agent',
        version: 'v1',
        status: 'running',
        created_at: new Date().toISOString(),
        usage: { credits_used: 5 },
      };

      jest.spyOn(executions, 'get').mockResolvedValue(runningResponse);
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      await expect(executions.wait('exec_123', 0.001, 0.001)).rejects.toThrow(RequestTimeoutError);
      await expect(executions.wait('exec_123', 0.001, 0.001)).rejects.toThrow(
        'Execution exec_123 did not complete within 0.001 seconds. Last status: running'
      );
    });
  });
});
