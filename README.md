<div align="center">
<p align="center" style="width: 100%;">
    <img src="https://raw.githubusercontent.com/vlm-run/.github/refs/heads/main/profile/assets/vlm-black.svg" alt="VLM Run Logo" width="80" style="margin-bottom: -5px; color: #2e3138; vertical-align: middle; padding-right: 5px;"><br>
</p>
<h2>VLM Run Node.js SDK</h2>
<p align="center">
<a href="https://vlm.run"><b>Website</b></a> | <a href="https://docs.vlm.run/"><b>Docs</b></a> | <a href="https://docs.vlm.run/blog"><b>Blog</b></a> | <a href="https://discord.gg/CCY8cYNC"><b>Discord</b></a>
</p>
<p align="center">
<a href="https://npmjs.org/package/vlmrun"><img alt="NPM version" src="https://img.shields.io/npm/v/vlmrun.svg"></a>
<a href="https://bundlephobia.com/package/vlmrun"><img alt="Bundle size" src="https://img.shields.io/bundlephobia/minzip/vlmrun"></a><br>
<a href="https://github.com/vlm-run/vlmrun-node-sdk/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue"></a>
<a href="https://discord.gg/CCY8cYNC"><img alt="Discord" src="https://img.shields.io/badge/discord-chat-purple?color=%235865F2&label=discord&logo=discord"></a>
<a href="https://twitter.com/vlmrun"><img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/vlmrun.svg?style=social&logo=twitter"></a>
</p>
<br>
</div>

This library provides convenient access to the VLM Run REST API from server-side TypeScript or JavaScript.

### 💡 Why use this SDK?

- 📚 **Type-Safe**: Built with TypeScript for excellent IDE support and compile-time type checking
- 🔋 **Batteries Included**: Comprehensive error handling, retries, and timeout management out of the box
- 🚀 **Modern Runtimes**: Support for Node.js, Deno, Bun, and various edge environments
- 🔌 **Flexible**: Customizable fetch client and middleware support for your specific needs
- 🛠️ **Developer Experience**: Detailed documentation and IntelliSense support in modern editors

The REST API documentation can be found on [vlm.run](https://vlm.run/).

## Installation

```sh
npm install vlmrun
```

## Usage

The full API of this library can be found in [api.md](api.md).

<!-- prettier-ignore -->
```js
// Example usage
import VlmRun from 'vlmrun';

const client = new VlmRun({
  apiKey: process.env.VLMRUN_API_KEY || '',
  baseUrl: 'https://dev.vlm.run',
});

const imageUrl = 'https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice-extraction/invoice_1.jpg';

async function main() {
  try {
    const response = await client.image.generate({
      image: imageUrl,
      domain: 'document.invoice',
      model: 'vlm-1',
    });
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

Documentation for each method, request param, and response field are available in docstrings and will appear on hover in most modern editors.

## Handling errors

When the library is unable to connect to the API,
or if the API returns a non-success status code (i.e., 4xx or 5xx response),
a subclass of `APIError` will be thrown:

<!-- prettier-ignore -->
```ts
async function main() {
  const completion = await client.openai.chatCompletions.create({ messages: [{}] }).catch(async (err) => {
    if (err instanceof Vlm.APIError) {
      console.log(err.status); // 400
      console.log(err.name); // BadRequestError
      console.log(err.headers); // {server: 'nginx', ...}
    } else {
      throw err;
    }
  });
}

main();
```

Error codes are as followed:

| Status Code | Error Type                 |
| ----------- | -------------------------- |
| 400         | `BadRequestError`          |
| 401         | `AuthenticationError`      |
| 403         | `PermissionDeniedError`    |
| 404         | `NotFoundError`            |
| 422         | `UnprocessableEntityError` |
| 429         | `RateLimitError`           |
| >=500       | `InternalServerError`      |
| N/A         | `APIConnectionError`       |

### Retries

Certain errors will be automatically retried 2 times by default, with a short exponential backoff.
Connection errors (for example, due to a network connectivity problem), 408 Request Timeout, 409 Conflict,
429 Rate Limit, and >=500 Internal errors will all be retried by default.

You can use the `maxRetries` option to configure or disable this:

<!-- prettier-ignore -->
```js
// Configure the default for all requests:
const client = new VlmRun{
  maxRetries: 0, // default is 2
});

// Or, configure per-request:
await client.openai.chatCompletions.create({ messages: [{}] }, {
  maxRetries: 5,
});
```

### Timeouts

Requests time out after 1 minute by default. You can configure this with a `timeout` option:

<!-- prettier-ignore -->
```ts
// Configure the default for all requests:
const client = new VlmRun{
  timeout: 20 * 1000, // 20 seconds (default is 1 minute)
});

// Override per-request:
await client.openai.chatCompletions.create({ messages: [{}] }, {
  timeout: 5 * 1000,
});
```

On timeout, an `APIConnectionTimeoutError` is thrown.

Note that requests which time out will be [retried twice by default](#retries).

## Advanced Usage

### Accessing raw Response data (e.g., headers)

The "raw" `Response` returned by `fetch()` can be accessed through the `.asResponse()` method on the `APIPromise` type that all methods return.

You can also use the `.withResponse()` method to get the raw `Response` along with the parsed data.

<!-- prettier-ignore -->
```ts
const client = new VlmRun);

const response = await client.openai.chatCompletions.create({ messages: [{}] }).asResponse();
console.log(response.headers.get('X-My-Header'));
console.log(response.statusText); // access the underlying Response object

const { data: completion, response: raw } = await client.openai.chatCompletions
  .create({ messages: [{}] })
  .withResponse();
console.log(raw.headers.get('X-My-Header'));
console.log(completion.id);
```

### Making custom/undocumented requests

This library is typed for convenient access to the documented API. If you need to access undocumented
endpoints, params, or response properties, the library can still be used.

#### Undocumented endpoints

To make requests to undocumented endpoints, you can use `client.get`, `client.post`, and other HTTP verbs.
Options on the client, such as retries, will be respected when making these requests.

```ts
await client.post('/some/path', {
  body: { some_prop: 'foo' },
  query: { some_query_arg: 'bar' },
});
```

#### Undocumented request params

To make requests using undocumented parameters, you may use `// @ts-expect-error` on the undocumented
parameter. This library doesn't validate at runtime that the request matches the type, so any extra values you
send will be sent as-is.

```ts
client.foo.create({
  foo: 'my_param',
  bar: 12,
  // @ts-expect-error baz is not yet public
  baz: 'undocumented option',
});
```

For requests with the `GET` verb, any extra params will be in the query, all other requests will send the
extra param in the body.

If you want to explicitly send an extra argument, you can do so with the `query`, `body`, and `headers` request
options.

#### Undocumented response properties

To access undocumented response properties, you may access the response object with `// @ts-expect-error` on
the response object, or cast the response object to the requisite type. Like the request params, we do not
validate or strip extra properties from the response from the API.

### Customizing the fetch client

By default, this library uses `node-fetch` in Node, and expects a global `fetch` function in other environments.

If you would prefer to use a global, web-standards-compliant `fetch` function even in a Node environment,
(for example, if you are running Node with `--experimental-fetch` or using NextJS which polyfills with `undici`),
add the following import before your first import `from "VlmRun"`:

```ts
// Tell TypeScript and the package to use the global web fetch instead of node-fetch.
// Note, despite the name, this does not add any polyfills, but expects them to be provided if needed.
import 'vlmrun/shims/web';
import VlmRun from 'vlmrun';
```

To do the inverse, add `import "vlmrun/shims/node"` (which does import polyfills).
This can also be useful if you are getting the wrong TypeScript types for `Response` ([more details](https://github.com/vlm-run/vlmrun-node-sdk/tree/main/src/_shims#readme)).

### Logging and middleware

You may also provide a custom `fetch` function when instantiating the client,
which can be used to inspect or alter the `Request` or `Response` before/after each request:

```ts
import { fetch } from 'undici'; // as one example
import VlmRun from 'vlmrun';

const client = new VlmRun{
  fetch: async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    console.log('About to make a request', url, init);
    const response = await fetch(url, init);
    console.log('Got response', response);
    return response;
  },
});
```

Note that if given a `DEBUG=true` environment variable, this library will log all requests and responses automatically.
This is intended for debugging purposes only and may change in the future without notice.

### Configuring an HTTP(S) Agent (e.g., for proxies)

By default, this library uses a stable agent for all http/https requests to reuse TCP connections, eliminating many TCP & TLS handshakes and shaving around 100ms off most requests.

If you would like to disable or customize this behavior, for example to use the API behind a proxy, you can pass an `httpAgent` which is used for all requests (be they http or https), for example:

<!-- prettier-ignore -->
```ts
import http from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Configure the default for all requests:
const client = new VlmRun{
  httpAgent: new HttpsProxyAgent(process.env.PROXY_URL),
});

// Override per-request:
await client.openai.chatCompletions.create(
  { messages: [{}] },
  {
    httpAgent: new http.Agent({ keepAlive: false }),
  },
);
```

## Semantic versioning

This package generally follows [SemVer](https://semver.org/spec/v2.0.0.html) conventions, though certain backwards-incompatible changes may be released as minor versions:

1. Changes that only affect static types, without breaking runtime behavior.
2. Changes to library internals which are technically public but not intended or documented for external use. _(Please open a GitHub issue to let us know if you are relying on such internals)_.
3. Changes that we do not expect to impact the vast majority of users in practice.

We take backwards-compatibility seriously and work hard to ensure you can rely on a smooth upgrade experience.

We are keen for your feedback; please open an [issue](https://www.github.com/vlm-run/vlmrun-node-sdk/issues) with questions, bugs, or suggestions.

## Requirements

TypeScript >= 4.5 is supported.

The following runtimes are supported:

- Web browsers (Up-to-date Chrome, Firefox, Safari, Edge, and more)
- Node.js 18 LTS or later ([non-EOL](https://endoflife.date/nodejs)) versions.
- Deno v1.28.0 or higher.
- Bun 1.0 or later.
- Cloudflare Workers.
- Vercel Edge Runtime.
- Jest 28 or greater with the `"node"` environment (`"jsdom"` is not supported at this time).
- Nitro v2.6 or greater.

Note that React Native is not supported at this time.

If you are interested in other runtime environments, please open or upvote an issue on GitHub.

## 🔗 Quick Links

- 💬 Need help? Send us an email at [support@vlm.run](mailto:support@vlm.run) or join our [Discord](https://discord.gg/CCY8cYNC)
- 📣 Stay updated by following us on [Twitter](https://twitter.com/vlmrun) and [LinkedIn](https://www.linkedin.com/company/vlm-run)
- 📚 Check out our [Documentation](https://docs.vlm.run/) for detailed guides and API references
- 🐛 Found a bug? Open an [issue](https://github.com/vlm-run/vlmrun-node-sdk/issues) on GitHub
