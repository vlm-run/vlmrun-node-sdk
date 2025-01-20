import { APIResource } from '../../resource';
import * as Core from '../../core';

export class ChatCompletions extends APIResource {
  /**
   * Chat Completions
   */
  create(body: ChatCompletionCreateParams, options?: Core.RequestOptions): Core.APIPromise<Completion> {
    return this._client.post('/v1/openai/chat/completions', { body, ...options });
  }
}

/**
 * https://platform.openai.com/docs/api-reference/chat/object
 */
export interface Completion {
  choices: Array<unknown>;

  model: string;

  id?: string;

  created?: number;

  object?: 'chat.completion' | 'chat.completion.chunk';

  system_fingerprint?: string | null;

  usage?: Completion.Usage | null;
}

export namespace Completion {
  export interface Usage {
    completion_tokens: number;

    prompt_tokens: number;

    total_tokens: number;
  }
}

export interface ChatCompletionCreateParams {
  messages: Array<ChatCompletionCreateParams.Message>;

  id?: string;

  /**
   * Domain of the request
   */
  domain?: string | null;

  logprobs?: number | null;

  max_tokens?: number;

  /**
   * Metadata of the request
   */
  metadata?: ChatCompletionCreateParams.Metadata;

  model?: string;

  n?: number | null;

  /**
   * Format of the response
   */
  response_format?: unknown | null;

  /**
   * Schema of the request
   */
  schema?: unknown | null;

  stream?: boolean;

  temperature?: number;

  top_k?: number | null;

  top_p?: number;
}

export namespace ChatCompletionCreateParams {
  export interface Message {
    content?: string | Array<Message.UnionMember1> | null;

    role?: 'user' | 'assistant' | 'system';
  }

  export namespace Message {
    export interface UnionMember1 {
      type: 'text' | 'image_url';

      image_url?: UnionMember1.ImageURL | null;

      text?: string | null;
    }

    export namespace UnionMember1 {
      export interface ImageURL {
        detail: 'auto' | 'low' | 'high';

        url: string;
      }
    }
  }

  /**
   * Metadata of the request
   */
  export interface Metadata {
    /**
     * Whether the file can be used for training
     */
    allow_training?: boolean;

    /**
     * The environment where the request was made.
     */
    environment?: 'dev' | 'staging' | 'prod';

    /**
     * The session ID of the request
     */
    session_id?: string | null;
  }
}

export declare namespace ChatCompletions {
  export { type Completion as Completion, type ChatCompletionCreateParams as ChatCompletionCreateParams };
}
