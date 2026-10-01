import axios from "axios";
import {
  InputError,
  SystemOne,
  choice,
  forestry,
  noul,
  typesafeWebsocketUrl,
} from "../../../../src";
import { Client } from "../../../../src/client/base_requestor";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function testClient(): Client {
  return { apiKey: "test-key", baseURL: "https://api.example.com" };
}

function systemOne(overrides: ConstructorParameters<typeof SystemOne>[1] = {}) {
  return new SystemOne(testClient(), {
    baseUrl: "https://gateway.vlm.run/typesafe",
    ...overrides,
  });
}

describe("SystemOne.decide", () => {
  const ticket = forestry("support-ticket", {
    urgent: noul("Is this time-sensitive?"),
    department: choice("Which team?", ["billing", "technical", "sales"]),
  });

  beforeEach(() => {
    mockedAxios.request.mockReset();
  });

  it("builds a dry-run body without touching the network", () => {
    const client = systemOne();
    expect(
      client.buildRequest({
        state: "Invoice #44 was charged twice",
        forestry: ticket,
      })
    ).toEqual({
      state: "Invoice #44 was charged twice",
      model: "google/diffusiongemma-26b-a4b-it",
      questions: {
        urgent: { type: "noul", instructions: "Is this time-sensitive?" },
        department: {
          type: "choice",
          instructions: "Which team?",
          criteria: { billing: null, technical: null, sales: null },
        },
      },
    });
    expect(mockedAxios.request).not.toHaveBeenCalled();
  });

  it("posts the TypeSafe contract and groups answers by primitive", async () => {
    mockedAxios.request.mockResolvedValue({
      data: {
        model: "google/diffusiongemma-26b-a4b-it",
        answers: {
          urgent: { type: "noul", noul: 0.91 },
          department: {
            type: "choice",
            choice: "billing",
            confidence: 0.88,
            probabilities: { billing: 0.88, technical: 0.1, sales: 0.02 },
          },
        },
        usage: { input_tokens: 120, output_tokens: 0, cost: 0.00004 },
      },
      status: 200,
    });

    const result = await systemOne().decide({
      state: "Invoice #44 was charged twice, I need this fixed today",
      forestry: ticket,
    });

    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "https://gateway.vlm.run/typesafe/v1/systemone",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      })
    );
    const body = mockedAxios.request.mock.calls[0]?.[0]?.data as {
      questions: Record<string, { type: string }>;
    };
    expect(body.questions.urgent?.type).toBe("noul");
    expect(result.nouls.urgent?.noul).toBe(0.91);
    expect(result.choices.department?.choice).toBe("billing");
    expect(result.usage.cost).toBe(0.00004);
    expect(result.timings.apiMs).toBeGreaterThanOrEqual(0);
  });

  it("inlines a data-URL image as a content part", async () => {
    mockedAxios.request.mockResolvedValue({
      data: {
        model: "m",
        answers: { a: { type: "noul", noul: 0.5 } },
        usage: { input_tokens: 1, output_tokens: 0 },
      },
      status: 200,
    });

    await systemOne().decide({
      state: "Is the door open?",
      questions: [{ id: "a", type: "noul" }],
      images: [PNG_DATA_URL],
    });

    const body = mockedAxios.request.mock.calls[0]?.[0]?.data as {
      content: Array<{ type: string; image_url: { url: string } }>;
    };
    expect(body.content[0]?.type).toBe("image_url");
    expect(body.content[0]?.image_url.url.startsWith("data:image/png;base64,")).toBe(
      true
    );
  });

  it("rejects an unknown reasoning effort before sending", () => {
    expect(() =>
      systemOne().buildRequest({
        state: "x",
        questions: [{ id: "a", type: "noul" }],
        reasoningEffort: "loud" as never,
      })
    ).toThrow(InputError);
    expect(mockedAxios.request).not.toHaveBeenCalled();
  });

  it("lists models from the gateway", async () => {
    mockedAxios.request.mockResolvedValue({
      data: {
        data: [
          {
            name: "google/diffusiongemma-26b-a4b-it",
            description: "one denoise step",
          },
        ],
      },
      status: 200,
    });

    const models = await systemOne().models();
    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "https://gateway.vlm.run/typesafe/v1/models",
      })
    );
    expect(models.data[0]?.name).toContain("diffusiongemma");
  });
});

describe("SystemOne.stream (http)", () => {
  beforeEach(() => {
    mockedAxios.request.mockReset();
  });

  it("returns decisions in input order even when replies finish out of order", async () => {
    const delays: Record<string, number> = { first: 40, second: 5, third: 20 };
    mockedAxios.request.mockImplementation(async (config) => {
      const body = config.data as { state: string };
      await new Promise((resolve) =>
        setTimeout(resolve, delays[body.state] ?? 0)
      );
      return {
        data: {
          model: "m",
          answers: {
            a: { type: "noul", noul: body.state === "second" ? 0.2 : 0.8 },
          },
          usage: { input_tokens: 1, output_tokens: 0 },
        },
        status: 200,
      };
    });

    const stream = await systemOne().stream({
      questions: [{ id: "a", type: "noul" }],
      concurrency: 3,
    });
    try {
      const decisions = [];
      for await (const decision of stream.map([
        { state: "first" },
        { state: "second" },
        { state: "third" },
      ])) {
        decisions.push(decision);
      }
      expect(decisions.map((d) => d.index)).toEqual([0, 1, 2]);
      expect(decisions.map((d) => d.response.nouls.a?.noul)).toEqual([
        0.8, 0.2, 0.8,
      ]);
    } finally {
      await stream.close();
    }
  });

  it("delivers a later read's failure through the iterator after earlier results", async () => {
    mockedAxios.request.mockImplementation(async (config) => {
      const body = config.data as { state: string };
      if (body.state === "bad") {
        throw new Error("boom");
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        data: { model: "m", answers: { a: { type: "noul", noul: 0.8 } } },
        status: 200,
      };
    });
    const stream = await systemOne().stream({
      questions: [{ id: "a", type: "noul" }],
      concurrency: 2,
    });
    const seen: number[] = [];
    try {
      await expect(
        (async () => {
          for await (const decision of stream.map([
            { state: "slow" },
            { state: "bad" },
          ])) {
            seen.push(decision.index);
          }
        })()
      ).rejects.toThrow("boom");
      expect(seen).toEqual([0]);
    } finally {
      await stream.close();
    }
  });
});

describe("stream URL", () => {
  it("exposes a websocket URL derived from the typesafe root", () => {
    const client = systemOne({ baseUrl: "https://gw.test/typesafe" });
    expect(typesafeWebsocketUrl(client.baseUrl)).toBe(
      "wss://gw.test/typesafe/ws"
    );
  });
});
