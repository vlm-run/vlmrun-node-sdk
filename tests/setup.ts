process.env.VLMRUN_API_KEY = 'test_key';
process.env.VLMRUN_BASE_URL = 'https://api.vlm.run/v1';

// Increase test timeout for API calls
jest.setTimeout(30000);

// Mock fetch for tests
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    status: 200,
  } as Response)
);
