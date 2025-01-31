import VlmRun from 'vlmrun';
import { Response } from 'node-fetch';

const client = new VlmRun({
  apiKey: 'My API Key',
  baseURL: process.env['TEST_API_BASE_URL'] ?? 'http://127.0.0.1:4010',
});

describe('resource document', () => {
  test('generate', async () => {
    const responsePromise = client.document.generate({});
    const rawResponse = await responsePromise.asResponse();
    expect(rawResponse).toBeResponse();
    const response = await responsePromise;
    expect(response).not.toBeResponse();
    const dataAndResponse = await responsePromise.withResponse();
    expect(dataAndResponse.data).toBe(response);
    expect(dataAndResponse.response).toBe(rawResponse);
  });
});
