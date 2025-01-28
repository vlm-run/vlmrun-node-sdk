import { createTestClient, createInvalidClient, expectError } from '../helpers';
import { APIError } from '../../src/core';

describe('Models', () => {
  it('lists available models', async () => {
    const client = createTestClient();
    const models = await client.models.list();
    
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('domain');
  });

  it('fails to list models with invalid credentials', async () => {
    const client = createInvalidClient();
    await expect(client.models.list()).rejects.toThrow(APIError);
  });
});
