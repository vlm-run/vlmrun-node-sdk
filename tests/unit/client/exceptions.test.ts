import {
  VLMRunError,
  APIError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  ServerError,
  ResourceNotFoundError,
  ClientError,
  ConfigurationError,
  DependencyError,
  InputError,
  RequestTimeoutError,
  NetworkError
} from '../../../src/client/exceptions';

describe('Error classes', () => {
  describe('VLMRunError', () => {
    it('should create a VLMRunError with the correct name and message', () => {
      const error = new VLMRunError('Test error');
      expect(error.name).toBe('VLMRunError');
      expect(error.message).toBe('Test error');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('APIError', () => {
    it('should create an APIError with the correct properties', () => {
      const headers = { 'x-request-id': '123' };
      const error = new APIError(
        'API error',
        404,
        headers,
        '123',
        'not_found',
        'Check the ID'
      );
      
      expect(error.name).toBe('APIError');
      expect(error.message).toBe('API error');
      expect(error.http_status).toBe(404);
      expect(error.headers).toEqual(headers);
      expect(error.request_id).toBe('123');
      expect(error.error_type).toBe('not_found');
      expect(error.suggestion).toBe('Check the ID');
      expect(error instanceof VLMRunError).toBe(true);
    });

    it('should format toString properly', () => {
      const error = new APIError(
        'API error',
        404,
        { 'x-request-id': '123' },
        '123',
        'not_found',
        'Check the ID'
      );
      
      expect(error.toString()).toBe('[status=404, type=not_found, id=123] API error (Suggestion: Check the ID)');
    });
  });

  describe('Specialized API errors', () => {
    it('should create AuthenticationError with correct defaults', () => {
      const error = new AuthenticationError();
      expect(error.message).toBe('Authentication failed');
      expect(error.http_status).toBe(401);
      expect(error.error_type).toBe('authentication_error');
      expect(error.suggestion).toBe('Check your API key and ensure it is valid');
      expect(error instanceof APIError).toBe(true);
    });

    it('should create ValidationError with correct defaults', () => {
      const error = new ValidationError();
      expect(error.message).toBe('Validation failed');
      expect(error.http_status).toBe(400);
      expect(error.error_type).toBe('validation_error');
      expect(error instanceof APIError).toBe(true);
    });

    it('should create RateLimitError with correct defaults', () => {
      const error = new RateLimitError();
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.http_status).toBe(429);
      expect(error.error_type).toBe('rate_limit_error');
      expect(error instanceof APIError).toBe(true);
    });

    it('should create ServerError with correct defaults', () => {
      const error = new ServerError();
      expect(error.message).toBe('Server error');
      expect(error.http_status).toBe(500);
      expect(error.error_type).toBe('server_error');
      expect(error instanceof APIError).toBe(true);
    });

    it('should create ResourceNotFoundError with correct defaults', () => {
      const error = new ResourceNotFoundError();
      expect(error.message).toBe('Resource not found');
      expect(error.http_status).toBe(404);
      expect(error.error_type).toBe('not_found_error');
      expect(error instanceof APIError).toBe(true);
    });

    it('should create RequestTimeoutError with correct defaults', () => {
      const error = new RequestTimeoutError();
      expect(error.message).toBe('Request timed out');
      expect(error.http_status).toBe(408);
      expect(error.error_type).toBe('timeout_error');
      expect(error instanceof APIError).toBe(true);
    });

    it('should create NetworkError with correct defaults', () => {
      const error = new NetworkError();
      expect(error.message).toBe('Network error');
      expect(error.error_type).toBe('network_error');
      expect(error instanceof APIError).toBe(true);
    });
  });

  describe('ClientError', () => {
    it('should create a ClientError with the correct properties', () => {
      const error = new ClientError(
        'Client error',
        'test_error',
        'Fix it'
      );
      
      expect(error.name).toBe('ClientError');
      expect(error.message).toBe('Client error');
      expect(error.error_type).toBe('test_error');
      expect(error.suggestion).toBe('Fix it');
      expect(error instanceof VLMRunError).toBe(true);
    });

    it('should format toString properly', () => {
      const error = new ClientError(
        'Client error',
        'test_error',
        'Fix it'
      );
      
      expect(error.toString()).toBe('[type=test_error] Client error (Suggestion: Fix it)');
    });
  });

  describe('Specialized Client errors', () => {
    it('should create ConfigurationError with correct defaults', () => {
      const error = new ConfigurationError();
      expect(error.message).toBe('Invalid configuration');
      expect(error.error_type).toBe('configuration_error');
      expect(error instanceof ClientError).toBe(true);
    });

    it('should create DependencyError with correct defaults', () => {
      const error = new DependencyError();
      expect(error.message).toBe('Missing dependency');
      expect(error.error_type).toBe('dependency_error');
      expect(error instanceof ClientError).toBe(true);
    });

    it('should create InputError with correct defaults', () => {
      const error = new InputError();
      expect(error.message).toBe('Invalid input');
      expect(error.error_type).toBe('input_error');
      expect(error instanceof ClientError).toBe(true);
    });
  });
});
