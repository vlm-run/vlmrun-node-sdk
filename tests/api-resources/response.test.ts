import VlmRun from 'vlmrun';
import { Response } from 'node-fetch';

const client = new VlmRun({
  bearerToken: 'My Bearer Token',
  baseURL: process.env['TEST_API_BASE_URL'] ?? 'http://127.0.0.1:4010',
});

describe('resource response', () => {
  test('retrieve', async () => {
    const responsePromise = client.response.retrieve('id');
    const rawResponse = await responsePromise.asResponse();
    expect(rawResponse).toBeInstanceOf(Response);
    const response = await responsePromise;
    expect(response).not.toBeInstanceOf(Response);
    const dataAndResponse = await responsePromise.withResponse();
    expect(dataAndResponse.data).toBe(response);
    expect(dataAndResponse.response).toBe(rawResponse);
  });

  test('retrieve: request options instead of params are passed correctly', async () => {
    // ensure the request options are being passed correctly by passing an invalid HTTP method in order to cause an error
    await expect(client.response.retrieve('id', { path: '/_stainless_unknown_path' })).rejects.toThrow(
      VlmRun.NotFoundError,
    );
  });
});
