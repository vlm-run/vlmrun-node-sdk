import axios, { AxiosHeaders, AxiosInstance, AxiosError } from "axios";
import axiosRetry from "axios-retry";
import {
  APIError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  ServerError,
  ResourceNotFoundError,
  RequestTimeoutError,
  NetworkError,
} from "./exceptions";
import packageJson from "../../package.json";

const DEFAULT_TIMEOUT = 120000; // 120 seconds in ms
const DEFAULT_MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second in ms
const MAX_RETRY_DELAY = 10000; // 10 seconds in ms

export interface Client {
  apiKey: string;
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

export class APIRequestor {
  private client: Client;
  private axios: AxiosInstance;
  private timeout: number;
  private maxRetries: number;

  constructor(client: Client) {
    this.client = client;
    this.timeout = client.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = client.maxRetries ?? DEFAULT_MAX_RETRIES;

    const defaultHeaders = {
      Authorization: `Bearer ${client.apiKey}`,
      "Content-Type": "application/json",
      "X-Client-Id": `node-sdk-${packageJson.version}`,
    };

    this.axios = axios.create({
      baseURL: client.baseURL,
      headers: {
        ...defaultHeaders,
        ...client.headers,
      },
      timeout: this.timeout,
    });

    axiosRetry(this.axios, {
      retries: this.maxRetries,
      retryDelay: (retryCount, error) => {
        const delay = Math.min(
          INITIAL_RETRY_DELAY *
            Math.pow(2, retryCount - 1) *
            (0.5 + Math.random() * 0.5),
          MAX_RETRY_DELAY
        );
        return delay;
      },
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkError(error) ||
          error.response?.status === 429 ||
          (error.response?.status &&
            error.response?.status >= 500 &&
            error.response?.status < 600) ||
          error.code === "ECONNABORTED"
        );
      },
    });
  }

  async request<T>(
    method: string,
    url: string,
    params?: Record<string, any>,
    data?: any,
    files?: { [key: string]: any }
  ): Promise<[T, number, Record<string, string>]> {
    try {
      let headers = new AxiosHeaders(this.axios.defaults.headers);

      if (files) {
        const formData = new FormData();
        Object.entries(files).forEach(([key, value]) => {
          formData.append(key, value);
        });
        data = formData;
        headers.set("Content-Type", "multipart/form-data");
      }

      const response = await this.axios.request({
        method,
        url,
        params,
        data,
        headers,
      });

      return [
        response.data as T,
        response.status,
        response.headers as Record<string, string>,
      ];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        let errorMessage = "API request failed";
        let errorType: string | undefined;
        let requestId: string | undefined;

        try {
          const errorData = error.response?.data;

          if (Array.isArray(errorData.detail)) {
            errorMessage =
              errorData.detail[0].msg || errorData.detail[0] || errorMessage;
          } else {
            errorMessage = errorData.detail || error.message || errorMessage;
          }

          errorType = (error.cause as any)?.name;
          requestId = error.response?.request?.id;
        } catch (e) {
          errorMessage = error.message || errorMessage;
        }

        const status = error.response.status;
        const headers = error.response.headers;

        if (status === 401) {
          throw new AuthenticationError(
            errorMessage,
            status,
            headers,
            requestId,
            errorType
          );
        } else if (status === 400) {
          throw new ValidationError(
            errorMessage,
            status,
            headers,
            requestId,
            errorType
          );
        } else if (status === 404) {
          throw new ResourceNotFoundError(
            errorMessage,
            status,
            headers,
            requestId,
            errorType
          );
        } else if (status === 429) {
          throw new RateLimitError(
            errorMessage,
            status,
            headers,
            requestId,
            errorType
          );
        } else if (status >= 500 && status < 600) {
          throw new ServerError(
            errorMessage,
            status,
            headers,
            requestId,
            errorType
          );
        } else {
          throw new APIError(
            errorMessage,
            status,
            headers,
            requestId,
            errorType
          );
        }
      } else if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          throw new RequestTimeoutError(`Request timed out: ${error.message}`);
        } else {
          throw new NetworkError(`Network error: ${error.message}`);
        }
      }
      throw new APIError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }
}
