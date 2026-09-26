import { AddressInfo } from "node:net";
import { WebSocketServer } from "ws";
import { Gateway } from "../../../src/client/gateway";
import { AgentExecutionConfig } from "../../../src/client/types";

const client = { apiKey: "test-key", baseURL: "https://api.example.com/v1" };
const questions = {
  urgent: { type: "noul" as const, instructions: "Is it urgent?" },
};
const result = {
  model: "google/diffusiongemma-26b-a4b-it",
  answers: { urgent: { type: "noul", noul: 0.9 } },
  usage: { input_tokens: 10, output_tokens: 0 },
};

describe("System One", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.TYPESAFE_BASE_URL;
  });

  it("routes typed decisions and model listing through the gateway", async () => {
    const fetch = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = String(input);
        expect(url).toMatch(/^https:\/\/custom.gateway\/typesafe\/v1\//);
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer test-key",
        );
        if (url.endsWith("/models")) {
          return new Response(
            JSON.stringify({
              models: [
                { name: "test-model", description: "", release_date: "" },
              ],
            }),
            { status: 200 },
          );
        }
        expect(JSON.parse(String(init?.body))).toMatchObject({
          state: "invoice",
          questions,
          steps: 2,
          content: [{ type: "text", text: "additional details" }],
        });
        return new Response(JSON.stringify(result), { status: 200 });
      });

    const systemone = new Gateway(client, "https://custom.gateway/v1")
      .systemone;
    const decision = await systemone.decide({
      state: "invoice",
      questions,
      steps: 2,
      content: [{ type: "text", text: "additional details" }],
    });
    expect(decision.answers.urgent.noul).toBe(0.9);
    expect((await systemone.models())[0].name).toBe("test-model");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("uses an explicit TypeSafe base URL and forwards configuration", () => {
    process.env.TYPESAFE_BASE_URL = "https://typesafe.example/root/";
    const systemone = new Gateway(client).systemone;
    expect(systemone.baseUrl).toBe("https://typesafe.example/root");
    expect(
      systemone.buildRequest({
        state: "hello",
        questions,
        reasoningEffort: "low",
        samples: 3,
        extraBody: { custom_option: true },
      }),
    ).toMatchObject({
      model: "google/diffusiongemma-26b-a4b-it",
      reasoning_effort: "low",
      samples: 3,
      custom_option: true,
    });
  });

  it("serializes the Python agent execution mode", () => {
    expect(new AgentExecutionConfig({ mode: "agent" }).toJSON()).toMatchObject({
      mode: "agent",
    });
    expect(new AgentExecutionConfig({ mode: null }).toJSON()).toMatchObject({
      mode: null,
    });
  });

  it("correlates WebSocket decisions by id and closes the session", async () => {
    const server = new WebSocketServer({ port: 0 });
    const address = server.address() as AddressInfo;
    const frames: Record<string, unknown>[] = [];
    server.on("connection", (socket, request) => {
      expect(request.headers.authorization).toBe("Bearer test-key");
      socket.on("message", (raw) => {
        const frame = JSON.parse(raw.toString()) as Record<string, unknown>;
        frames.push(frame);
        if (frame.type === "session.create") {
          expect(frame).not.toHaveProperty("state");
          expect(frame).not.toHaveProperty("detail");
          socket.send(
            JSON.stringify({
              type: "session.created",
              model: result.model,
              max_inflight: 2,
            }),
          );
        } else if (frame.type === "decide") {
          expect(frame).not.toHaveProperty("state");
          socket.send(
            JSON.stringify({
              type: "decision",
              id: frame.id,
              answers: result.answers,
              usage: result.usage,
            }),
          );
        } else if (frame.type === "session.close") {
          socket.send(JSON.stringify({ type: "session.stats", decisions: 3 }));
          socket.close();
        }
      });
    });
    try {
      const stream = new Gateway(
        client,
        `http://localhost:${address.port}/v1`,
      ).systemone.stream({
        questions,
        state: "invoice",
        transport: "ws",
        concurrency: 2,
      });
      await stream.open();
      const decisions = [];
      for await (const decision of stream.map(["frame 1", "frame 2"]))
        decisions.push(decision);
      expect(
        (await stream.send("frame 3", "approved")).answers.urgent.noul,
      ).toBe(0.9);
      await stream.close();
      expect(decisions.map((decision) => decision.answers.urgent.noul)).toEqual(
        [0.9, 0.9],
      );
      expect(frames.map((frame) => frame.type)).toEqual([
        "session.create",
        "state",
        "decide",
        "decide",
        "state",
        "decide",
        "session.close",
      ]);
      expect(
        frames
          .filter((frame) => frame.type === "state")
          .map((frame) => frame.state),
      ).toEqual(["invoice", "approved"]);
      expect(stream.stats?.decisions).toBe(3);
    } finally {
      for (const socket of server.clients) socket.terminate();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
