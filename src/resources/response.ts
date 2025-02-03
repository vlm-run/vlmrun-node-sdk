import { APIResource } from '../resource';
import * as Core from '../core';
import * as Shared from './shared';

export class Response extends APIResource {
  /**
   * Get response JSON by request ID.
   */
  retrieve(id: string, options?: Core.RequestOptions): Core.APIPromise<Shared.PredictionResponse> {
    return this._client.get(`/v1/predictions/${id}`, options);
  }
}
