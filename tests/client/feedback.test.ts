import { createTestClient } from '../helpers';

describe('Feedback', () => {
  it('submits and retrieves feedback', async () => {
    const client = createTestClient();
    const predictions = await client.predictions.list(0, 1);
    
    if (predictions.length > 0) {
      const prediction = predictions[0];
      
      const feedback = await client.feedback.submit(
        prediction.id,
        null,
        'test update',
        true
      );
      
      expect(feedback).toHaveProperty('id');
      expect(feedback).toHaveProperty('request_id');
      
      const retrieved = await client.feedback.get(feedback.id);
      expect(retrieved.id).toBe(feedback.id);
      expect(retrieved.notes).toBe('test update');
      expect(retrieved.flag).toBe(true);
    }
  });
});
