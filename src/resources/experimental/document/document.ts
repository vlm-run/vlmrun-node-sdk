// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../resource';
import * as EmbeddingsAPI from './embeddings';
import { EmbeddingCreateParams, Embeddings } from './embeddings';

export class Document extends APIResource {
  embeddings: EmbeddingsAPI.Embeddings = new EmbeddingsAPI.Embeddings(this._client);
}

Document.Embeddings = Embeddings;

export declare namespace Document {
  export { Embeddings as Embeddings, type EmbeddingCreateParams as EmbeddingCreateParams };
}
