import { Client } from '../../src/client';
import { createTestClient, createInvalidClient } from '../helpers';

describe('Client', () => {
  it('initializes with environment variables', () => {
    const client = createTestClient();
    expect(client).toBeInstanceOf(Client);
  });

  it('throws error without API key', () => {
    expect(() => new Client({ apiKey: undefined })).toThrow('API key must be provided');
  });

  it('performs healthcheck', async () => {
    const client = createTestClient();
    const healthy = await client.healthcheck();
    expect(healthy).toBe(true);
  });

  it('fails healthcheck with invalid credentials', async () => {
    const client = createInvalidClient();
    const healthy = await client.healthcheck();
    expect(healthy).toBe(false);
  });

  it('provides version information', () => {
    const client = createTestClient();
    expect(client.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
