import { VlmRun } from '../../../src';
import { HubInfoResponse, HubDomainInfo, HubSchemaResponse } from "../../../src/client/types";

describe('Hub', () => {
  let client: VlmRun;

  beforeEach(() => {
    client = new VlmRun({
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    });
  });

  describe('info', () => {
    it('should return hub info', async () => {
      const mockResponse: HubInfoResponse = {
        version: '1.0.0',
      };

      jest.spyOn(client.hub['requestor'], 'request').mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.hub.info();
      expect(result).toEqual(mockResponse);
      expect(client.hub['requestor'].request).toHaveBeenCalledWith(
        'GET',
        '/hub/info'
      );
    });

    it('should handle errors', async () => {
      jest.spyOn(client.hub['requestor'], 'request').mockRejectedValueOnce(new Error('Network error'));

      await expect(client.hub.info()).rejects.toThrow('Failed to check hub health');
    });
  });

  describe('listDomains', () => {
    it('should return list of domains', async () => {
      const mockResponse: HubDomainInfo[] = [
        {
          domain: 'document.invoice',
          name: 'Invoice',
          description: 'Invoice document type',
        },
      ];

      jest.spyOn(client.hub['requestor'], 'request').mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.hub.listDomains();
      expect(result).toEqual(mockResponse);
      expect(client.hub['requestor'].request).toHaveBeenCalledWith(
        'GET',
        '/hub/domains'
      );
    });

    it('should handle errors', async () => {
      jest.spyOn(client.hub['requestor'], 'request').mockRejectedValueOnce(new Error('Network error'));

      await expect(client.hub.listDomains()).rejects.toThrow('Failed to list domains');
    });
  });

  describe('getSchema', () => {
    it('should return schema for domain', async () => {
      const mockResponse: HubSchemaResponse = {
        schema_json: { type: 'object' },
        schema_version: '1.0.0',
        schema_hash: 'abc123',
      };

      jest.spyOn(client.hub['requestor'], 'request').mockResolvedValueOnce([mockResponse, 200, {}]);

      const result = await client.hub.getSchema('document.invoice');
      expect(result).toEqual(mockResponse);
      expect(client.hub['requestor'].request).toHaveBeenCalledWith(
        'POST',
        '/hub/schema',
        undefined,
        { domain: 'document.invoice' }
      );
    });

    it('should handle errors', async () => {
      jest.spyOn(client.hub['requestor'], 'request').mockRejectedValueOnce(new Error('Network error'));

      await expect(client.hub.getSchema('invalid.domain')).rejects.toThrow(
        'Failed to get schema for domain invalid.domain'
      );
    });
  });
});
