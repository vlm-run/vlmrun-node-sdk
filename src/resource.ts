import type { VlmRun } from './index';

export class APIResource {
  protected _client: VlmRun;

  constructor(client: VlmRun) {
    this._client = client;
  }
}
