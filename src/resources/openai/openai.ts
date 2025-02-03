import { APIResource } from '../../resource';
import * as Core from '../../core';
import * as ChatCompletionsAPI from './chat-completions';
import { ChatCompletionCreateParams, ChatCompletions, Completion } from './chat-completions';
import * as ModelsAPI from './models';
import { ChatModel, Model, Models } from './models';

export class OpenAI extends APIResource {
  chatCompletions: ChatCompletionsAPI.ChatCompletions = new ChatCompletionsAPI.ChatCompletions(this._client);
  models: ModelsAPI.Models = new ModelsAPI.Models(this._client);

  /**
   * Health
   */
  health(options?: Core.RequestOptions): Core.APIPromise<unknown> {
    return this._client.get('/v1/openai/health', options);
  }
}

export type OpenAIHealthResponse = unknown;

OpenAI.ChatCompletions = ChatCompletions;
OpenAI.Models = Models;

export declare namespace OpenAI {
  export { type OpenAIHealthResponse as OpenAIHealthResponse };

  export {
    ChatCompletions as ChatCompletions,
    type Completion as Completion,
    type ChatCompletionCreateParams as ChatCompletionCreateParams,
  };

  export { Models as Models, type ChatModel as ChatModel, type Model as Model };
}
