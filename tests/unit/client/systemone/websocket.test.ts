import { APIError, SystemOne, WebSocketStream } from "../../../../src";
import { Client } from "../../../../src/client/base_requestor";
import { StubServer } from "./stub-server";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const MODEL = "google/diffusiongemma-26b-a4b-it";

const servers: StubServer[] = [];

function testClient(): Client {
  return { apiKey: "test-key", baseURL: "https://api.example.com" };
}

async function streamTo(
  server: StubServer,
  extra: Record<string, unknown> = {}
) {
  const resource = new SystemOne(testClient(), {
    baseUrl: `http://127.0.0.1:${server.port}`,
    model: MODEL,
  });
  return resource.stream({
    questions: [{ id: "a", type: "noul" }],
    transport: "ws",
    ...extra,
  });
}

async function startServer(
  options?: ConstructorParameters<typeof StubServer>[0]
) {
  const server = await new StubServer(options).start();
  servers.push(server);
  return server;
}

afterEach(async () => {
  while (servers.length > 0) {
    const server = servers.pop();
    await server?.stop();
  }
});

describe("WebSocketStream handshake", () => {
  it("derives the socket URL from the typesafe root", () => {
    const resource = new SystemOne(testClient(), {
      baseUrl: "https://gw.test/typesafe",
    });
    const stream = new WebSocketStream(resource, {
      questions: { a: { type: "noul" } },
    });
    expect(stream.url).toBe("wss://gw.test/typesafe/ws");
  });

  it("sends the question spec once, not per read", async () => {
    const server = await startServer();
    const stream = await streamTo(server);
    try {
      const inputs = [PNG, PNG, PNG, PNG];
      const results = [];
      for await (const decision of stream.map(inputs)) {
        results.push(decision);
      }
      expect(server.creates).toHaveLength(1);
      expect(server.creates[0]?.questions).toEqual({ a: { type: "noul" } });
      expect(server.decides).toHaveLength(4);
      expect(server.decides.every((decide) => !("questions" in decide))).toBe(
        true
      );
      expect(results).toHaveLength(4);
    } finally {
      await stream.close();
    }
  });

  it("exposes the ack limits", async () => {
    const server = await startServer({ maxInflight: 3 });
    const stream = await streamTo(server);
    try {
      expect(stream).toBeInstanceOf(WebSocketStream);
      const ws = stream as WebSocketStream;
      expect(ws.limits.max_inflight).toBe(3);
      expect(ws.limits.session_id).toBe("stub");
    } finally {
      await stream.close();
    }
  });

  it("asks for concurrency as max_inflight", async () => {
    const server = await startServer({ maxInflight: 8 });
    const stream = await streamTo(server, { concurrency: 6 });
    try {
      expect(server.creates[0]?.max_inflight).toBe(6);
    } finally {
      await stream.close();
    }
  });

  it("rides session-scoped options on session.create", async () => {
    const server = await startServer();
    const stream = await streamTo(server, {
      steps: 4,
      samples: 3,
      reasoningEffort: "low",
    });
    try {
      expect(server.creates[0]?.steps).toBe(4);
      expect(server.creates[0]?.samples).toBe(3);
      expect(server.creates[0]?.reasoning_effort).toBe("low");
    } finally {
      await stream.close();
    }
  });
});

describe("WebSocketStream decisions", () => {
  it("correlates replies by id when the server answers in reverse", async () => {
    const server = await startServer({ maxInflight: 3, reverse: true });
    const stream = await streamTo(server, { concurrency: 3 });
    try {
      const images = [distinctPng(1), distinctPng(2), distinctPng(3)];
      const results = [];
      for await (const decision of stream.map(images)) {
        results.push(decision.response.nouls.a?.noul);
      }
      expect(results).toHaveLength(3);
      expect(new Set(results).size).toBe(3);
      expect(server.replyOrder).not.toEqual(["0", "1", "2"]);
    } finally {
      await stream.close();
    }
  });

  it("surfaces a server error", async () => {
    const server = await startServer({ failOn: 0 });
    const stream = await streamTo(server);
    try {
      await expect(stream.send(PNG)).rejects.toBeInstanceOf(APIError);
    } finally {
      await stream.close();
    }
  });

  it("collects session.stats on close", async () => {
    const server = await startServer();
    const stream = await streamTo(server);
    await stream.send(PNG);
    await stream.close();
    const ws = stream as WebSocketStream;
    expect(ws.stats.session_id).toBe("stub");
    expect(ws.stats.decisions).toBe(1);
  });
});

function distinctPng(seed: number): string {
  const raw = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  raw[raw.length - 1] = seed;
  return `data:image/png;base64,${raw.toString("base64")}`;
}
