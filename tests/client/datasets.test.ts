import { createTestClient } from '../helpers';

describe('Datasets', () => {
  it.skip('lists datasets', async () => {
    const client = createTestClient();
    const datasets = await client.datasets.list();
    
    expect(Array.isArray(datasets)).toBe(true);
    if (datasets.length > 0) {
      expect(datasets[0]).toHaveProperty('id');
      expect(datasets[0]).toHaveProperty('name');
    }
  });
});
