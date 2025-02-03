import axios, { AxiosHeaders, AxiosInstance } from "axios";
import { APIError } from "./types";

export interface Client {
  apiKey: string;
  baseURL: string;
}

export class APIRequestor {
  private client: Client;
  private axios: AxiosInstance;

  constructor(client: Client) {
    this.client = client;
    this.axios = axios.create({
      baseURL: client.baseURL,
      headers: {
        Authorization: `Bearer ${client.apiKey}`,
        "Content-Type": "application/json",
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
        throw new APIError(
          JSON.stringify(error.response.data) || "API request failed",
          error.response.status,
          error.response.headers as Record<string, string>
        );
      }
      throw new APIError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }
}
