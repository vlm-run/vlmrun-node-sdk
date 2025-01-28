import { APIResource } from '../resource';
import * as Core from '../core';

export interface ModelInfoResponse {
  domain: string;
  model?: string;
}

export class Models extends APIResource {
  /**
   * List available models.
   * 
   * @returns List of model objects with their capabilities
   */
  async list(options?: Core.RequestOptions): Promise<ModelInfoResponse[]> {
    const response: unknown = await this._client.get('models', options);

    if (!Array.isArray(response)) {
      throw new TypeError('Expected list response');
    }

    // Validate each model in the response
    return response.map(model => {
      if (!model || typeof model !== 'object') {
        throw new TypeError('Expected model to be an object');
      }
      if (!('domain' in model)) {
        throw new TypeError('Expected model to have domain property');
      }
      return model as ModelInfoResponse;
    });
  }
}
