import { createTestClient, createTestFile } from '../helpers';
import { PredictionResponse } from '../../src/client/types';
import * as fs from 'fs';
import * as path from 'path';

describe('Predictions', () => {
  it('lists predictions with pagination', async () => {
    const client = createTestClient();
    const predictions = await client.predictions.list(0, 1);
    
    expect(Array.isArray(predictions)).toBe(true);
    if (predictions.length > 0) {
      expect(predictions[0]).toHaveProperty('id');
      expect(predictions[0]).toHaveProperty('status');
    }
  });

  it('retrieves prediction by ID', async () => {
    const client = createTestClient();
    const predictions = await client.predictions.list(0, 1);
    
    if (predictions.length > 0) {
      const prediction = await client.predictions.get(predictions[0].id);
      expect(prediction.id).toBe(predictions[0].id);
      expect(prediction).toHaveProperty('status');
    }
  });

  describe('Document Predictions', () => {
    it('generates prediction from file', async () => {
      const client = createTestClient();
      const file = await createTestFile(client);
      
      const response = await client.document.generate(
        file.id,
        'document.invoice',
        'vlm-1',
        null,
        'auto',
        false,
        { allow_training: false }
      );

      expect(response).toHaveProperty('id');
      expect(response.status).toBe('completed');
      expect(response.response).toBeDefined();
    });

    it('generates prediction from URL', async () => {
      const client = createTestClient();
      const url = 'https://www.apaservices.org/practice/business/finances/income-statement-sample.pdf';
      
      const response = await client.document.generate(
        url,
        'document.file',
        'vlm-1',
        null,
        'auto',
        false,
        { allow_training: false }
      );

      expect(response).toHaveProperty('id');
      expect(response.status).toBe('completed');
      expect(response.response).toBeDefined();
    });
  });

  describe('Image Predictions', () => {
    it('generates prediction from image data', async () => {
      const client = createTestClient();
      const imageData = Buffer.from('fake-image-data');
      
      const response = await client.image.generate(
        imageData,
        'video.tv-news',
        'vlm-1',
        null,
        'auto',
        false,
        { allow_training: false }
      );

      expect(response).toHaveProperty('id');
      expect(response.status).toBe('completed');
      expect(response.response).toBeDefined();
    });
  });

  describe('Audio Predictions', () => {
    it('generates prediction from audio file', async () => {
      const client = createTestClient();
      const audioData = Buffer.from('fake-audio-data');
      
      const response = await client.audio.generate(
        audioData,
        'audio.transcription',
        'vlm-1',
        false,
        { allow_training: false }
      );

      expect(response).toHaveProperty('id');
      expect(response.status).toBe('completed');
      expect(response.response).toBeDefined();
    });
  });
});
