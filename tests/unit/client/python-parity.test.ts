import axios from "axios";
import { Client } from "../../../src/client/base_requestor";
import { VlmRun, ConfigurationError, AgentExecutionConfig, InputError } from "../../../src";
import { Gateway, DEFAULT_GATEWAY_URL } from "../../../src/client/gateway";
import { Agent } from "../../../src/client/agent";
import { authHeaders } from "../../../src/client/base_requestor";
import { buildContent } from "../../../src/client/systemone/content";

jest.mock("axios", () => {
  const actual = jest.requireActual("axios");
  return {
    ...actual,
    __esModule: true,
    default: { ...actual.default, create: actual.default.create, get: jest.fn() },
  };
});
const mockedGet = axios.get as jest.Mock;

const ENV_KEYS = [
  "VLMRUN_API_KEY",
  "VLMRUN_BASE_URL",
  "VLMRUN_GATEWAY_BASE_URL",
  "VLMRUN_GATEWAY_URL",
  "VLMRUN_ALLOW_PRIVATE_URLS",
];

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const cfg = (client: VlmRun): Client => (client as unknown as { client: Client }).client;

describe("Python SDK parity", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    mockedGet.mockReset();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  describe("client configuration", () => {
    it("throws ConfigurationError when no API key is available", () => {
      expect(() => new VlmRun()).toThrow(ConfigurationError);
      expect(() => new VlmRun({ apiKey: "" })).toThrow("Missing API key");
    });

    it("reads VLMRUN_API_KEY and VLMRUN_BASE_URL from the environment", () => {
      process.env.VLMRUN_API_KEY = "env-key";
      process.env.VLMRUN_BASE_URL = "https://dev.vlm.run/v1";
      const client = new VlmRun();
      expect(cfg(client).apiKey).toBe("env-key");
      expect(cfg(client).baseURL).toBe("https://dev.vlm.run/v1");
    });

    it("prefers explicit options over the environment", () => {
      process.env.VLMRUN_API_KEY = "env-key";
      process.env.VLMRUN_BASE_URL = "https://dev.vlm.run/v1";
      const client = new VlmRun({ apiKey: "explicit", baseURL: "https://x.dev/v1" });
      expect(cfg(client).apiKey).toBe("explicit");
      expect(cfg(client).baseURL).toBe("https://x.dev/v1");
    });

    it("defaults the base URL", () => {
      expect(cfg(new VlmRun({ apiKey: "k" })).baseURL).toBe("https://api.vlm.run/v1");
    });

    it("allows a keyless client with requireApiKey: false", () => {
      const client = new VlmRun({ requireApiKey: false });
      expect(cfg(client).apiKey).toBe("");
    });
  });

  describe("authHeaders", () => {
    it("omits Authorization without a key", () => {
      expect(authHeaders("")).toEqual({});
      expect(authHeaders(undefined)).toEqual({});
      expect(authHeaders("k")).toEqual({ Authorization: "Bearer k" });
    });
  });

  describe("gateway base URL precedence", () => {
    const client = { apiKey: "k", baseURL: "https://api.example.com" };

    it("prefers VLMRUN_GATEWAY_BASE_URL over VLMRUN_GATEWAY_URL", () => {
      process.env.VLMRUN_GATEWAY_BASE_URL = "https://base.gateway.dev/v1/";
      process.env.VLMRUN_GATEWAY_URL = "https://legacy.gateway.dev/v1";
      expect(new Gateway(client).baseUrl).toBe("https://base.gateway.dev/v1");
    });

    it("falls back to VLMRUN_GATEWAY_URL, then the default", () => {
      process.env.VLMRUN_GATEWAY_URL = "https://legacy.gateway.dev/v1";
      expect(new Gateway(client).baseUrl).toBe("https://legacy.gateway.dev/v1");
      delete process.env.VLMRUN_GATEWAY_URL;
      expect(new Gateway(client).baseUrl).toBe(DEFAULT_GATEWAY_URL);
    });

    it("sends no Authorization header on health() without a key", async () => {
      mockedGet.mockResolvedValueOnce({ status: 200 });
      const gateway = new Gateway({ apiKey: "", baseURL: "https://api.example.com" });
      expect(await gateway.health()).toBe(true);
      expect(mockedGet).toHaveBeenCalledWith(
        `${DEFAULT_GATEWAY_URL}/health`,
        expect.objectContaining({ headers: {} }),
      );
    });
  });

  describe("OpenAI clients without a key", () => {
    const requestHeaders = async (resource: unknown) => {
      const openai = (resource as { _client: any })._client;
      const { req } = await openai.buildRequest({ method: "get", path: "/models" });
      return req.headers as Record<string, string>;
    };

    it("omits Authorization on gateway and agent requests", async () => {
      const keyless = { apiKey: "", baseURL: "https://api.example.com" };
      expect(await requestHeaders(new Gateway(keyless).completions)).not.toHaveProperty("authorization");
      expect(await requestHeaders(new Agent(keyless).completions)).not.toHaveProperty("authorization");
    });

    it("keeps the bearer token when a key is set", async () => {
      const keyed = { apiKey: "k", baseURL: "https://api.example.com" };
      expect(await requestHeaders(new Gateway(keyed).completions)).toMatchObject({ authorization: "Bearer k" });
      expect(await requestHeaders(new Agent(keyed).completions)).toMatchObject({ authorization: "Bearer k" });
    });
  });

  describe("AgentExecutionConfig.mode", () => {
    it("serializes mode when set", () => {
      expect(new AgentExecutionConfig({ mode: "agent" }).toJSON()).toMatchObject({ mode: "agent" });
      expect(new AgentExecutionConfig({ mode: "program" }).toJSON()).toMatchObject({ mode: "program" });
    });

    it("omits mode when unset", () => {
      expect(new AgentExecutionConfig({ prompt: "p" }).toJSON()).not.toHaveProperty("mode");
    });
  });

  describe("System One image fetch redirects", () => {
    it("guards every redirect hop", async () => {
      mockedGet.mockResolvedValueOnce({
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
        data: new ArrayBuffer(0),
      });
      await expect(buildContent({ images: ["http://93.184.216.34/a.png"] })).rejects.toThrow(
        /non-public address/,
      );
      expect(mockedGet).toHaveBeenCalledTimes(1);
    });

    it("follows relative redirects to a public image", async () => {
      mockedGet
        .mockResolvedValueOnce({ status: 301, headers: { location: "/b.png" }, data: new ArrayBuffer(0) })
        .mockResolvedValueOnce({ status: 200, headers: {}, data: PNG });
      const parts = await buildContent({ images: ["http://93.184.216.34/a.png"] });
      expect(mockedGet.mock.calls[1][0]).toBe("http://93.184.216.34/b.png");
      expect(JSON.stringify(parts)).toContain("data:image/png;base64,");
    });

    it("gives up after too many redirects", async () => {
      mockedGet.mockResolvedValue({ status: 302, headers: { location: "/loop" }, data: new ArrayBuffer(0) });
      await expect(buildContent({ images: ["http://93.184.216.34/a.png"] })).rejects.toThrow(InputError);
      expect(mockedGet).toHaveBeenCalledTimes(6);
    });
  });
});
