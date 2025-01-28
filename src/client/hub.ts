import { APIResource } from '../resource';
import * as Core from '../core';

export interface HubInfoResponse {
  version?: string;
}

export interface HubSchemaQueryResponse {
  schema_json?: unknown;
  schema_version?: string;
  schema_hash?: string;
}

export class Hub extends APIResource {
  info(options?: Core.RequestOptions): Core.APIPromise<HubInfoResponse> {
    return this._client.get('/hub/info', options).catch((error: unknown) => {
      throw new Error(`Failed to check hub health: ${error.message}`);
    });
  }

  listDomains(options?: Core.RequestOptions): Core.APIPromise<string[]> {
    return this._client.get('/hub/domains', options).catch((error: unknown) => {
      throw new Error(`Failed to list domains: ${error.message}`);
    });
  }

  getSchema(domain: string, options?: Core.RequestOptions): Core.APIPromise<HubSchemaQueryResponse> {
    return this._client.post('/hub/schema', {
      body: { domain },
      ...options,
    }).catch((error: unknown) => {
      throw new Error(`Failed to get schema for domain ${domain}: ${error.message}`);
    });
  }
}
