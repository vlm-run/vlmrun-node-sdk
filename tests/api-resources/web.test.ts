import VlmRun from 'vlmrun';
import { Response } from 'node-fetch';

const client = new VlmRun({
  apiKey: 'My API Key',
  baseURL: process.env['TEST_API_BASE_URL'] ?? 'http://127.0.0.1:4010',
});

describe('resource web', () => {
  test('generate: only required params', async () => {
    const responsePromise = client.web.generate({ url: 'https://example.com' });
    const rawResponse = await responsePromise.asResponse();
    expect(rawResponse).toBeResponse();
    const response = await responsePromise;
    expect(response).not.toBeResponse();
    const dataAndResponse = await responsePromise.withResponse();
    expect(dataAndResponse.data).toBe(response);
    expect(dataAndResponse.response).toBe(rawResponse);
  });

  test('generate: required and optional params', async () => {
    const response = await client.web.generate({
      url: 'https://example.com',
      id: 'id',
      callback_url: 'https://example.com',
      created_at: '2019-12-27T18:11:19.117Z',
      domain: 'web.ecommerce-product-catalog',
      metadata: { allow_training: true, environment: 'dev', session_id: 'session_id' },
      mode: 'fast',
      model: 'vlm-1',
    });
  });
});
