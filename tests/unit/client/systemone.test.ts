import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { APIRequestor, Client } from "../../../src/client/base_requestor";
import { InputError } from "../../../src/client/exceptions";
import { Gateway } from "../../../src/client/gateway";
import {
  SystemOne,
  SYSTEMONE_MODEL,
  buildContent,
  isNonPublicAddress,
  normalizeQuestions,
  sniffImageMime,
  typesafeBaseUrl,
} from "../../../src/client/systemone";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const ANSWERS = {
  model: SYSTEMONE_MODEL,
  answers: {
    is_urgent: { type: "noul", noul: 0.91 },
    dept: {
      type: "choice",
      choice: "billing",
      probabilities: { billing: 0.9, sales: 0.1 },
      confidence: 0.7,
    },
    mood: {
      type: "score",
      score: 0.9,
      legend: { "0": "calm", "1": "angry" },
      probabilities: { "0": 0.1, "1": 0.9 },
      confidence: 0.5,
    },
  },
  usage: { input_tokens: 149, output_tokens: 0 },
};

const ENV_KEYS = [
  "VLMRUN_GATEWAY_BASE_URL",
  "VLMRUN_GATEWAY_URL",
  "TYPESAFE_BASE_URL",
  "TYPESAFE_DEFAULT_MODEL",
  "VLMRUN_ALLOW_PRIVATE_URLS",
];

describe("SystemOne", () => {
  let client: Client;
  let tmp: string;

  beforeEach(() => {
    ENV_KEYS.forEach((k) => delete process.env[k]);
    client = { apiKey: "test-key", baseURL: "https://api.example.com" };
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "systemone-"));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe("base URL resolution", () => {
    it("derives the /typesafe root from the gateway URL", () => {
      expect(typesafeBaseUrl()).toBe("https://gateway.vlm.run/typesafe");
      expect(typesafeBaseUrl("http://localhost:8000/v1/")).toBe(
        "http://localhost:8000/typesafe",
      );
    });

    it("follows VLMRUN_GATEWAY_BASE_URL before VLMRUN_GATEWAY_URL", () => {
      process.env.VLMRUN_GATEWAY_URL = "https://old.example/v1";
      process.env.VLMRUN_GATEWAY_BASE_URL = "https://new.example/v1";
      expect(new SystemOne(client).baseUrl).toBe("https://new.example/typesafe");
    });

    it("prefers baseUrl, then TYPESAFE_BASE_URL", () => {
      process.env.TYPESAFE_BASE_URL = "https://env.example/typesafe/";
      expect(new SystemOne(client).baseUrl).toBe("https://env.example/typesafe");
      expect(
        new SystemOne(client, { baseUrl: "https://explicit.example/ts" }).baseUrl,
      ).toBe("https://explicit.example/ts");
    });

    it("is exposed on the gateway beside its base URL", () => {
      const gateway = new Gateway(client, "https://gw.example/v1");
      expect(gateway.systemone).toBeInstanceOf(SystemOne);
      expect(gateway.systemone).toBe(gateway.systemone);
      expect(gateway.systemone.baseUrl).toBe("https://gw.example/typesafe");
      expect(gateway.systemone.model).toBe(SYSTEMONE_MODEL);
    });

    it("reads TYPESAFE_DEFAULT_MODEL", () => {
      process.env.TYPESAFE_DEFAULT_MODEL = "some/model";
      expect(new SystemOne(client).model).toBe("some/model");
    });
  });

  describe("normalizeQuestions", () => {
    it("accepts the list dialect with friendly spellings", () => {
      expect(
        normalizeQuestions([
          { id: "is_urgent", type: "noul", instructions: "Urgent?", criteria: { yes: "now", no: "later" } },
          { id: "dept", type: "choice", options: ["billing", { name: "sales", description: "buy" }] },
          { id: "mood", type: "score", levels: ["calm", "angry"] },
        ]),
      ).toEqual({
        is_urgent: { type: "noul", instructions: "Urgent?", criteria: { true: "now", false: "later" } },
        dept: { type: "choice", criteria: { billing: null, sales: "buy" } },
        mood: { type: "score", criteria: ["calm", "angry"] },
      });
    });

    it("accepts the mapping dialect and the {questions} wrapper", () => {
      const spec = { dept: { type: "choice" as const, criteria: { a: null, b: "B" } } };
      expect(normalizeQuestions({ questions: spec })).toEqual({
        dept: { type: "choice", criteria: { a: null, b: "B" } },
      });
    });

    it.each([
      [[], /no questions/],
      ["nope", /must be a list/],
      [[{ type: "noul" }], /needs an "id"/],
      [[{ id: "a", type: "noul" }, { id: "a", type: "noul" }], /duplicate question id/],
      [[{ id: "a", type: "maybe" }], /type must be one of/],
      [[{ id: "a", type: "noul", levels: ["x", "y"] }], /unknown key/],
      [[{ id: "a", type: "choice" }], /needs options/],
      [[{ id: "a", type: "choice", options: ["only"] }], /2-128 options/],
      [[{ id: "a", type: "choice", options: ["x", "y"], criteria: ["x", "y"] }], /not both/],
      [[{ id: "a", type: "score", levels: ["x"] }], /2-10 levels/],
      [[{ id: "a", type: "noul", criteria: { maybe: "?" } }], /unknown noul outcome/],
      [{ a: { id: "b", type: "noul" } }, /but the key is/],
    ])("rejects %j", (spec, message) => {
      expect(() => normalizeQuestions(spec)).toThrow(InputError);
      expect(() => normalizeQuestions(spec)).toThrow(message);
    });
  });

  describe("buildContent", () => {
    it("returns null without media", async () => {
      expect(await buildContent()).toBeNull();
    });

    it("orders document, images, then text and inlines images", async () => {
      const png = path.join(tmp, "page.png");
      const pdf = path.join(tmp, "doc.pdf");
      fs.writeFileSync(png, PNG);
      fs.writeFileSync(pdf, "%PDF-1.4 test");
      const parts = await buildContent({
        images: [png, PNG],
        document: pdf,
        text: "extra",
        detail: "high",
      });
      expect(parts!.map((p) => p.type)).toEqual(["file", "image_url", "image_url", "text"]);
      expect(parts![0].file.filename).toBe("doc.pdf");
      expect(parts![0].file.file_data).toMatch(/^data:application\/pdf;base64,/);
      expect(parts![1].image_url).toEqual({
        url: `data:image/png;base64,${PNG.toString("base64")}`,
        detail: "high",
      });
    });

    it("passes a remote PDF through by URL", async () => {
      const parts = await buildContent({ document: "https://example.com/a.pdf" });
      expect(parts).toEqual([
        { type: "file", file: { file_data: "https://example.com/a.pdf", detail: "auto" } },
      ]);
    });

    it("validates image inputs", async () => {
      const txt = path.join(tmp, "notes.txt");
      fs.writeFileSync(txt, "hello");
      await expect(buildContent({ images: [txt] })).rejects.toThrow(/not a recognized image/);
      await expect(buildContent({ images: [path.join(tmp, "missing.png")] })).rejects.toThrow(/is not a file/);
      await expect(buildContent({ images: Array(9).fill(PNG) })).rejects.toThrow(/limit is 8/);
      await expect(buildContent({ images: ["data:image/png,raw"] })).rejects.toThrow(/base64/);
      await expect(buildContent({ document: txt })).rejects.toThrow(/not a PDF/);
    });

    it("refuses to fetch private addresses", async () => {
      await expect(
        buildContent({ images: ["http://127.0.0.1/image.png"] }),
      ).rejects.toThrow(/non-public address/);
    });
  });

  it.each([
    ["127.0.0.1", true],
    ["10.1.2.3", true],
    ["172.20.0.1", true],
    ["192.168.1.1", true],
    ["169.254.169.254", true],
    ["::1", true],
    ["fd00::1", true],
    ["::ffff:127.0.0.1", true],
    ["8.8.8.8", false],
    ["2606:4700::1111", false],
  ])("isNonPublicAddress(%s) = %s", (address, expected) => {
    expect(isNonPublicAddress(address)).toBe(expected);
  });

  it("sniffs image types", () => {
    expect(sniffImageMime(PNG)).toBe("image/png");
    expect(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageMime(Buffer.from("GIF89a"))).toBe("image/gif");
    expect(sniffImageMime(Buffer.from("RIFF0000WEBP"))).toBe("image/webp");
    expect(sniffImageMime(Buffer.from("hello"))).toBeNull();
  });

  describe("requests", () => {
    it("builds the wire body without sending it", async () => {
      const resource = new SystemOne(client);
      const body = await resource.buildRequest({
        state: "charged twice",
        questions: [{ id: "billing", type: "noul" }],
        steps: 2,
        samples: 4,
        reasoningEffort: "low",
        extraBody: { steps: 3, custom: true },
      });
      expect(body).toEqual({
        state: "charged twice",
        model: SYSTEMONE_MODEL,
        questions: { billing: { type: "noul" } },
        steps: 3,
        samples: 4,
        reasoning_effort: "low",
        custom: true,
      });
      expect(Object.keys(body).slice(0, 3)).toEqual(["state", "model", "questions"]);
    });

    it("rejects an unknown reasoning effort", async () => {
      await expect(
        new SystemOne(client).buildRequest({
          state: "",
          questions: [{ id: "a", type: "noul" }],
          reasoningEffort: "max" as any,
        }),
      ).rejects.toThrow(/reasoningEffort/);
    });

    it("decides and groups answers by type", async () => {
      const spy = jest
        .spyOn(APIRequestor.prototype, "request")
        .mockResolvedValue([ANSWERS, 200, { "x-typesafe-request-id": "req_1" }]);
      const resource = new SystemOne(client, { baseUrl: "https://gw.example/typesafe" });
      const response = await resource.decide({
        state: "Invoice #44 was charged twice",
        questions: [
          { id: "is_urgent", type: "noul" },
          { id: "dept", type: "choice", options: ["billing", "sales"] },
          { id: "mood", type: "score", levels: ["calm", "angry"] },
        ],
        model: "other/model",
        timeout: 5000,
        extraHeaders: { "x-trace": "1" },
      });

      expect(spy).toHaveBeenCalledWith(
        "POST",
        "v1/systemone",
        undefined,
        expect.objectContaining({ model: "other/model", state: "Invoice #44 was charged twice" }),
        undefined,
        { headers: { "x-trace": "1" }, timeout: 5000 },
      );
      expect(response.nouls.is_urgent.noul).toBe(0.91);
      expect(response.choices.dept.choice).toBe("billing");
      expect(response.scores.mood.score).toBe(0.9);
      expect(response.usage?.input_tokens).toBe(149);
      expect(response.requestId).toBe("req_1");
      expect(response.timings?.totalMs).toBeGreaterThanOrEqual(0);
    });

    it("lists the route's models", async () => {
      const spy = jest
        .spyOn(APIRequestor.prototype, "request")
        .mockResolvedValue([{ object: "list", data: [{ id: SYSTEMONE_MODEL }] }, 200, {}]);
      const models = await new SystemOne(client).models();
      expect(spy).toHaveBeenCalledWith("GET", "v1/models");
      expect(models.data[0].id).toBe(SYSTEMONE_MODEL);
    });
  });

  describe("stream", () => {
    it("normalizes questions up front and validates concurrency", () => {
      const resource = new SystemOne(client);
      expect(() => resource.stream({ questions: [] })).toThrow(/no questions/);
      expect(() =>
        resource.stream({ questions: [{ id: "a", type: "noul" }], concurrency: 0 }),
      ).toThrow(/concurrency/);
    });

    it("maps inputs concurrently and yields them in order", async () => {
      let inflight = 0;
      let peak = 0;
      const delays = [30, 5, 15, 1];
      let call = 0;
      jest.spyOn(APIRequestor.prototype, "request").mockImplementation(async () => {
        const delay = delays[call++];
        inflight += 1;
        peak = Math.max(peak, inflight);
        await new Promise((r) => setTimeout(r, delay));
        inflight -= 1;
        return [{ ...ANSWERS, model: `m${delay}` }, 200, {}];
      });

      const stream = new SystemOne(client).stream({
        questions: [{ id: "is_urgent", type: "noul" }],
        state: "Is the door open?",
        concurrency: 2,
      });
      const results = [];
      for await (const decision of stream.map([
        PNG,
        { frame: PNG, index: 10, timestampS: 0.5 },
        PNG,
        PNG,
      ])) {
        results.push(decision);
      }

      expect(results.map((r) => r.index)).toEqual([0, 10, 2, 3]);
      expect(results.map((r) => r.timestampS)).toEqual([null, 0.5, null, null]);
      expect(results.map((r) => r.response.model)).toEqual(["m30", "m5", "m15", "m1"]);
      expect(peak).toBeLessThanOrEqual(2);
      expect(stream.count).toBe(4);
    });

    it("sends one read with a per-read state", async () => {
      const spy = jest
        .spyOn(APIRequestor.prototype, "request")
        .mockResolvedValue([ANSWERS, 200, {}]);
      const stream = new SystemOne(client).stream({
        questions: [{ id: "is_urgent", type: "noul" }],
        state: "default",
      });
      await stream.send(PNG, { state: "override" });
      expect((spy.mock.calls[0][3] as any).state).toBe("override");
      expect((spy.mock.calls[0][3] as any).content).toHaveLength(1);
    });
  });
});
