import '@jest/globals';
import { Response } from 'node-fetch';
import { expect } from '@jest/globals';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeResponse(): R;
    }
  }
  var Response: typeof Response;
}

expect.extend({
  toBeResponse(received) {
    const pass = received instanceof Response || received.constructor.name === 'Response';
    return {
      message: () => `expected ${received} to be a Response`,
      pass,
    };
  },
});

(globalThis as any).Response = Response;
