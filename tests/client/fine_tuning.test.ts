import { createTestClient, createTestFile } from '../helpers';

describe('Fine-tuning', () => {
  it.skip('lists fine-tuning jobs', async () => {
    const client = createTestClient();
    const jobs = await client.fine_tuning.list();
    
    expect(Array.isArray(jobs)).toBe(true);
    if (jobs.length > 0) {
      expect(jobs[0]).toHaveProperty('id');
      expect(jobs[0]).toHaveProperty('status');
    }
  });

  it.skip('creates and manages fine-tuning job', async () => {
    const client = createTestClient();
    const testFile = await createTestFile(client);
    
    const job = await client.fine_tuning.create({
      training_file: testFile.id,
      validation_file: testFile.id,
      model: 'vlm-1-turbo',
      n_epochs: 1,
      batch_size: 8,
      learning_rate: 2e-4,
      use_lora: true,
      track: true,
      wandb_project: 'test',
    });

    expect(job).toHaveProperty('id');
    expect(job.status).toBe('pending');

    const retrieved = await client.fine_tuning.get(job.id);
    expect(retrieved.id).toBe(job.id);
    expect(retrieved.status).toBe('pending');

    const jobs = await client.fine_tuning.list();
    expect(jobs.some(j => j.id === job.id)).toBe(true);

    await expect(client.fine_tuning.cancel(job.id))
      .rejects.toThrow('Not implemented');
  });
});
