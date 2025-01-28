import { createTestClient } from '../helpers';

describe('Hub', () => {
  it('retrieves hub info', async () => {
    const client = createTestClient();
    const info = await client.hub.info();
    
    expect(info).toHaveProperty('version');
  });

  it('lists domains', async () => {
    const client = createTestClient();
    const response = await client.hub.list_domains();
    
    expect(Array.isArray(response.domains)).toBe(true);
    expect(response.domains.length).toBeGreaterThan(0);
    expect(typeof response.domains[0]).toBe('string');
  });

  it('retrieves domain schema', async () => {
    const client = createTestClient();
    const schema = await client.hub.get_schema('document.invoice');
    
    expect(schema).toHaveProperty('schema_json');
    expect(schema).toHaveProperty('schema_version');
    expect(schema).toHaveProperty('schema_hash');
  });
});
