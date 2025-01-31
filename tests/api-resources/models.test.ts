import VlmRun from 'vlmrun';

const client = new VlmRun({
  apiKey: process.env['TEST_API_KEY'] || 'test-api-key',
  baseURL: process.env['TEST_API_BASE_URL'] ?? 'http://127.0.0.1:4010',
});

describe('resource models', () => {
  test('list', async () => {
    const responsePromise = client.models.list();
    const rawResponse = await responsePromise.asResponse();
    expect(rawResponse).toBeResponse();
    const response = await responsePromise;
    expect(response).not.toBeResponse();
    const dataAndResponse = await responsePromise.withResponse();
    expect(dataAndResponse.data).toBe(response);
    expect(dataAndResponse.response).toBe(rawResponse);
  });

  test('list: request options instead of params are passed correctly', async () => {
    // ensure the request options are being passed correctly by passing an invalid HTTP method in order to cause an error
    await expect(client.models.list({ path: '/_stainless_unknown_path' })).rejects.toThrow(
      VlmRun.NotFoundError,
    );
  });
});
