import { Client } from '../src/client';

export function createTestClient(options: { apiKey?: string } = {}) {
  return new Client({
    apiKey: options.apiKey || process.env.VLMRUN_API_KEY || 'test_key',
    baseURL: process.env.VLMRUN_BASE_URL || 'https://api.vlm.run/v1',
  });
}

export function createInvalidClient() {
  return createTestClient({ apiKey: 'invalid' });
}

export async function createTestFile(client: Client) {
  const content = Buffer.from('test content');
  return client.files.upload(content, 'fine-tune');
}

export function expectError(error: unknown, message?: string) {
  expect(error).toBeInstanceOf(Error);
  if (message) {
    expect((error as Error).message).toContain(message);
  }
}
