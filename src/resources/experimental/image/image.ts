import { APIResource } from '../../../resource';
import * as EmbeddingsAPI from './embeddings';
import { EmbeddingCreateParams, Embeddings } from './embeddings';

export class Image extends APIResource {
  embeddings: EmbeddingsAPI.Embeddings = new EmbeddingsAPI.Embeddings(this._client);
}

Image.Embeddings = Embeddings;

export declare namespace Image {
  export { Embeddings as Embeddings, type EmbeddingCreateParams as EmbeddingCreateParams };
}
