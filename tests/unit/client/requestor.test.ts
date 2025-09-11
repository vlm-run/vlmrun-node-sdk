import axios from 'axios';
import { APIRequestor } from '../../../src/client/base_requestor';
import {
  AuthenticationError,
  ValidationError,
  ResourceNotFoundError,
  RateLimitError,
  ServerError,
  RequestTimeoutError,
  NetworkError
} from '../../../src/client/exceptions';

jest.mock('axios');
jest.mock('axios-retry', () => jest.fn());
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('APIRequestor', () => {
  const client = {
    apiKey: 'test-api-key',
    baseURL: 'https://api.example.com',
    timeout: 5000,
    maxRetries: 3
  };

  let requestor: APIRequestor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockAxiosInstance = {
      request: jest.fn(),
      defaults: {
        headers: {
          common: {},
          get: {},
          post: {}
        }
      },
      interceptors: {
        request: {
          use: jest.fn(),
          eject: jest.fn(),
          clear: jest.fn()
        },
        response: {
          use: jest.fn(),
          eject: jest.fn(),
          clear: jest.fn()
        }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    mockedAxios.isAxiosError.mockImplementation((error) => error && error.isAxiosError === true);
    
    requestor = new APIRequestor(client);
    
    (requestor as any).axios = mockAxiosInstance;
  });

  it('should initialize with the correct configuration', () => {
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: client.baseURL,
      headers: {
        Authorization: `Bearer ${client.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-Id': 'node-sdk-0.5.4'
      },
      timeout: client.timeout
    });
  });

  it('should return successful response', async () => {
    const mockResponse = {
      data: { result: 'success' },
      status: 200,
      headers: { 'content-type': 'application/json' }
    };

    (requestor as any).axios.request.mockResolvedValue(mockResponse);

    const result = await requestor.request('GET', '/test');
    expect(result).toEqual([
      mockResponse.data,
      mockResponse.status,
      mockResponse.headers
    ]);
  });

  it('should throw AuthenticationError for 401 responses', async () => {
    const mockError = {
      response: {
        data: { error: { message: 'Invalid API key', type: 'auth_error', id: '123' } },
        status: 401,
        headers: { 'x-request-id': '123' }
      },
      isAxiosError: true,
      message: 'Request failed with status code 401'
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    
    (requestor as any).axios.request.mockRejectedValue(mockError);

    await expect(requestor.request('GET', '/test')).rejects.toThrow(AuthenticationError);
    await expect(requestor.request('GET', '/test')).rejects.toMatchObject({
      http_status: 401,
      error_type: 'authentication_error',
      request_id: undefined
    });
  });

  it('should throw ValidationError for 400 responses', async () => {
    const mockError = {
      response: {
        data: { error: { message: 'Invalid parameters', type: 'validation_error', id: '123' } },
        status: 400,
        headers: { 'x-request-id': '123' }
      },
      isAxiosError: true,
      message: 'Request failed with status code 400'
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    (requestor as any).axios.request.mockRejectedValue(mockError);

    await expect(requestor.request('GET', '/test')).rejects.toThrow(ValidationError);
  });

  it('should throw ResourceNotFoundError for 404 responses', async () => {
    const mockError = {
      response: {
        data: { error: { message: 'Resource not found', type: 'not_found', id: '123' } },
        status: 404,
        headers: { 'x-request-id': '123' }
      },
      isAxiosError: true,
      message: 'Request failed with status code 404'
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    (requestor as any).axios.request.mockRejectedValue(mockError);

    await expect(requestor.request('GET', '/test')).rejects.toThrow(ResourceNotFoundError);
  });

  it('should throw RateLimitError for 429 responses', async () => {
    const mockError = {
      response: {
        data: { error: { message: 'Too many requests', type: 'rate_limit', id: '123' } },
        status: 429,
        headers: { 'x-request-id': '123' }
      },
      isAxiosError: true,
      message: 'Request failed with status code 429'
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    (requestor as any).axios.request.mockRejectedValue(mockError);

    await expect(requestor.request('GET', '/test')).rejects.toThrow(RateLimitError);
  });

  it('should throw ServerError for 5xx responses', async () => {
    const mockError = {
      response: {
        data: { error: { message: 'Internal server error', type: 'server_error', id: '123' } },
        status: 500,
        headers: { 'x-request-id': '123' }
      },
      isAxiosError: true,
      message: 'Request failed with status code 500'
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    (requestor as any).axios.request.mockRejectedValue(mockError);

    await expect(requestor.request('GET', '/test')).rejects.toThrow(ServerError);
  });

  it('should throw RequestTimeoutError for timeout errors', async () => {
    const mockError = {
      code: 'ECONNABORTED',
      isAxiosError: true,
      message: 'timeout of 5000ms exceeded'
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    (requestor as any).axios.request.mockRejectedValue(mockError);

    await expect(requestor.request('GET', '/test')).rejects.toThrow(RequestTimeoutError);
  });

  it('should throw NetworkError for network errors', async () => {
    const mockError = {
      isAxiosError: true,
      message: 'Network Error',
      code: 'ERR_NETWORK'
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    (requestor as any).axios.request.mockRejectedValue(mockError);

    await expect(requestor.request('GET', '/test')).rejects.toThrow(NetworkError);
  });
});
