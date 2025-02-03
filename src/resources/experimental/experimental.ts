import { APIResource } from '../../resource';
import * as Core from '../../core';
import * as DocumentAPI from './document/document';
import { Document } from './document/document';
import * as ImageAPI from './image/image';
import { Image } from './image/image';

export class Experimental extends APIResource {
  image: ImageAPI.Image = new ImageAPI.Image(this._client);
  document: DocumentAPI.Document = new DocumentAPI.Document(this._client);

  /**
   * Health
   */
  health(options?: Core.RequestOptions): Core.APIPromise<unknown> {
    return this._client.get('/v1/experimental/health', options);
  }
}

export type ExperimentalHealthResponse = unknown;

Experimental.Image = Image;
Experimental.Document = Document;

export declare namespace Experimental {
  export { type ExperimentalHealthResponse as ExperimentalHealthResponse };

  export { Image as Image };

  export { Document as Document };
}
