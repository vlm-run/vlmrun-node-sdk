import { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';

/**
 * Base exception for all VLM Run errors.
 */
export class VLMRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, VLMRunError.prototype);
  }
}

/**
 * Base exception for API errors.
 */
export class APIError extends VLMRunError {
  /**
   * HTTP status code
   */
  http_status?: number;
  
  /**
   * Response headers
   */
  headers?: Record<string, string>;
  
  /**
   * Request ID from the server
   */
  request_id?: string;
  
  /**
   * Error type from the server
   */
  error_type?: string;
  
  /**
   * Suggestion on how to fix the error
   */
  suggestion?: string;

  constructor(
    message: string,
    http_status?: number,
    headers?: Record<string, string> | RawAxiosResponseHeaders | AxiosResponseHeaders,
    request_id?: string,
    error_type?: string,
    suggestion?: string
  ) {
    super(message);
    this.http_status = http_status;
    this.headers = headers ? Object.fromEntries(Object.entries(headers)) : undefined;
    this.request_id = request_id;
    this.error_type = error_type;
    this.suggestion = suggestion;
    Object.setPrototypeOf(this, APIError.prototype);
  }

  toString(): string {
    const parts: string[] = [];
    if (this.http_status) {
      parts.push(`status=${this.http_status}`);
    }
    if (this.error_type) {
      parts.push(`type=${this.error_type}`);
    }
    if (this.request_id) {
      parts.push(`id=${this.request_id}`);
    }

    let formatted = parts.length > 0 ? `[${parts.join(', ')}] ${this.message}` : this.message;
    if (this.suggestion) {
      formatted += ` (Suggestion: ${this.suggestion})`;
    }
    return formatted;
  }
}

/**
 * Exception raised when authentication fails.
 */
export class AuthenticationError extends APIError {
  constructor(
    message = "Authentication failed",
    http_status = 401,
    headers?: Record<string, string> | RawAxiosResponseHeaders | AxiosResponseHeaders,
    request_id?: string,
    error_type = "authentication_error",
    suggestion = "Check your API key and ensure it is valid"
  ) {
    super(message, http_status, headers, request_id, error_type, suggestion);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Exception raised when request validation fails.
 */
export class ValidationError extends APIError {
  constructor(
    message = "Validation failed",
    http_status = 400,
    headers?: Record<string, string> | RawAxiosResponseHeaders | AxiosResponseHeaders,
    request_id?: string,
    error_type = "validation_error",
    suggestion = "Check your request parameters"
  ) {
    super(message, http_status, headers, request_id, error_type, suggestion);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Exception raised when rate limit is exceeded.
 */
export class RateLimitError extends APIError {
  constructor(
    message = "Rate limit exceeded",
    http_status = 429,
    headers?: Record<string, string> | RawAxiosResponseHeaders | AxiosResponseHeaders,
    request_id?: string,
    error_type = "rate_limit_error",
    suggestion = "Reduce request frequency or contact support to increase your rate limit"
  ) {
    super(message, http_status, headers, request_id, error_type, suggestion);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Exception raised when server returns 5xx error.
 */
export class ServerError extends APIError {
  constructor(
    message = "Server error",
    http_status = 500,
    headers?: Record<string, string> | RawAxiosResponseHeaders | AxiosResponseHeaders,
    request_id?: string,
    error_type = "server_error",
    suggestion = "Please try again later or contact support if the issue persists"
  ) {
    super(message, http_status, headers, request_id, error_type, suggestion);
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * Exception raised when resource is not found.
 */
export class ResourceNotFoundError extends APIError {
  constructor(
    message = "Resource not found",
    http_status = 404,
    headers?: Record<string, string> | RawAxiosResponseHeaders | AxiosResponseHeaders,
    request_id?: string,
    error_type = "not_found_error",
    suggestion = "Check the resource ID or path"
  ) {
    super(message, http_status, headers, request_id, error_type, suggestion);
    Object.setPrototypeOf(this, ResourceNotFoundError.prototype);
  }
}

/**
 * Base exception for client-side errors.
 */
export class ClientError extends VLMRunError {
  /**
   * Error type
   */
  error_type?: string;
  
  /**
   * Suggestion on how to fix the error
   */
  suggestion?: string;

  constructor(
    message: string,
    error_type?: string,
    suggestion?: string
  ) {
    super(message);
    this.error_type = error_type;
    this.suggestion = suggestion;
    Object.setPrototypeOf(this, ClientError.prototype);
  }

  toString(): string {
    const parts: string[] = [];
    if (this.error_type) {
      parts.push(`type=${this.error_type}`);
    }

    let formatted = parts.length > 0 ? `[${parts.join(', ')}] ${this.message}` : this.message;
    if (this.suggestion) {
      formatted += ` (Suggestion: ${this.suggestion})`;
    }
    return formatted;
  }
}

/**
 * Exception raised when client configuration is invalid.
 */
export class ConfigurationError extends ClientError {
  constructor(
    message = "Invalid configuration",
    error_type = "configuration_error",
    suggestion = "Check your client configuration"
  ) {
    super(message, error_type, suggestion);
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Exception raised when a required dependency is missing.
 */
export class DependencyError extends ClientError {
  constructor(
    message = "Missing dependency",
    error_type = "dependency_error",
    suggestion = "Install the required dependency"
  ) {
    super(message, error_type, suggestion);
    Object.setPrototypeOf(this, DependencyError.prototype);
  }
}

/**
 * Exception raised when input is invalid.
 */
export class InputError extends ClientError {
  constructor(
    message = "Invalid input",
    error_type = "input_error",
    suggestion = "Check your input parameters"
  ) {
    super(message, error_type, suggestion);
    Object.setPrototypeOf(this, InputError.prototype);
  }
}

/**
 * Exception raised when a request times out.
 */
export class RequestTimeoutError extends APIError {
  constructor(
    message = "Request timed out",
    http_status = 408,
    headers?: Record<string, string> | RawAxiosResponseHeaders | AxiosResponseHeaders,
    request_id?: string,
    error_type = "timeout_error",
    suggestion = "Try again later or increase the timeout"
  ) {
    super(message, http_status, headers, request_id, error_type, suggestion);
    Object.setPrototypeOf(this, RequestTimeoutError.prototype);
  }
}

/**
 * Exception raised when a network error occurs.
 */
export class NetworkError extends APIError {
  constructor(
    message = "Network error",
    http_status?: number,
    headers?: Record<string, string> | RawAxiosResponseHeaders | AxiosResponseHeaders,
    request_id?: string,
    error_type = "network_error",
    suggestion = "Check your internet connection and try again"
  ) {
    super(message, http_status, headers, request_id, error_type, suggestion);
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
