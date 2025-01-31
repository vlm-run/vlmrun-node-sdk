import VlmRun from 'vlmrun';
import { Response } from 'node-fetch';

const client = new VlmRun({
  apiKey: 'My API Key',
  baseURL: process.env['TEST_API_BASE_URL'] ?? 'http://127.0.0.1:4010',
});

describe('resource chatCompletions', () => {
  test('create: only required params', async () => {
    const responsePromise = client.openai.chatCompletions.create({ messages: [{}] });
    const rawResponse = await responsePromise.asResponse();
    expect(rawResponse).toBeResponse();
    const response = await responsePromise;
    expect(response).not.toBeResponse();
    const dataAndResponse = await responsePromise.withResponse();
    expect(dataAndResponse.data).toBe(response);
    expect(dataAndResponse.response).toBe(rawResponse);
  });

  test('create: required and optional params', async () => {
    const response = await client.openai.chatCompletions.create({
      messages: [{ content: 'string', role: 'user' }],
      id: 'id',
      domain: 'domain',
      logprobs: 0,
      max_tokens: 0,
      metadata: { allow_training: true, environment: 'dev', session_id: 'session_id' },
      model: 'model',
      n: 0,
      response_format: {},
      schema: {},
      stream: true,
      temperature: 0,
      top_k: 0,
      top_p: 0,
    });
  });
});
