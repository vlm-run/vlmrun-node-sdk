import { createTestClient, createInvalidClient, createTestFile, expectError } from '../helpers';
import { APIError } from '../../src/core';
import * as fs from 'fs';
import * as path from 'path';

describe('Files', () => {
  it('lists files with pagination', async () => {
    const client = createTestClient();
    const files = await client.files.list(0, 2);
    
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeLessThanOrEqual(2);
    if (files.length > 0) {
      expect(files[0]).toHaveProperty('id');
      expect(files[0]).toHaveProperty('filename');
      expect(files[0]).toHaveProperty('bytes');
      expect(files[0]).toHaveProperty('purpose');
    }
  });

  it('fails to list files with invalid credentials', async () => {
    const client = createInvalidClient();
    await expect(client.files.list(0, 2)).rejects.toThrow(APIError);
  });

  it('uploads and retrieves a file', async () => {
    const client = createTestClient();
    const testFile = await createTestFile(client);
    
    expect(testFile).toHaveProperty('id');
    expect(testFile.filename).toMatch(/test/);
    expect(testFile.bytes).toBeGreaterThan(0);
    expect(testFile.purpose).toBe('fine-tune');

    const retrieved = await client.files.get(testFile.id);
    expect(retrieved.id).toBe(testFile.id);
    expect(retrieved.filename).toBe(testFile.filename);
    expect(retrieved.bytes).toBe(testFile.bytes);
    expect(retrieved.purpose).toBe(testFile.purpose);
  });

  it('throws not implemented for get_content', async () => {
    const client = createTestClient();
    const testFile = await createTestFile(client);
    
    await expect(client.files.getContent(testFile.id)).rejects.toThrow('Not implemented');
  });
});
