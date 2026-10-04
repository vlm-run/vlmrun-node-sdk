import {
  gatewayBaseUrl,
  typesafeBaseUrl,
  typesafeWebsocketUrl,
} from "../../../../src/client/systemone";

describe("URL derivation", () => {
  const originalBase = process.env.VLMRUN_GATEWAY_BASE_URL;
  const originalLegacy = process.env.VLMRUN_GATEWAY_URL;

  afterEach(() => {
    if (originalBase === undefined) {
      delete process.env.VLMRUN_GATEWAY_BASE_URL;
    } else {
      process.env.VLMRUN_GATEWAY_BASE_URL = originalBase;
    }
    if (originalLegacy === undefined) {
      delete process.env.VLMRUN_GATEWAY_URL;
    } else {
      process.env.VLMRUN_GATEWAY_URL = originalLegacy;
    }
  });

  it("maps the gateway /v1 root onto /typesafe", () => {
    expect(typesafeBaseUrl("https://gateway.vlm.run/v1")).toBe(
      "https://gateway.vlm.run/typesafe"
    );
  });

  it("derives the websocket URL from the typesafe root", () => {
    expect(typesafeWebsocketUrl("https://gw.test/typesafe")).toBe(
      "wss://gw.test/typesafe/ws"
    );
  });

  it("uses ws:// when the typesafe root is plain HTTP", () => {
    expect(typesafeWebsocketUrl("http://localhost:9/typesafe")).toBe(
      "ws://localhost:9/typesafe/ws"
    );
  });

  it("treats a bare host as wss", () => {
    expect(typesafeWebsocketUrl("gw.test/typesafe")).toBe(
      "wss://gw.test/typesafe/ws"
    );
  });

  it("honours an explicit gateway argument over the default", () => {
    expect(gatewayBaseUrl("https://example.test/v1")).toBe(
      "https://example.test/v1"
    );
    expect(typesafeBaseUrl("https://example.test/v1")).toBe(
      "https://example.test/typesafe"
    );
  });

  it("prefers VLMRUN_GATEWAY_BASE_URL over VLMRUN_GATEWAY_URL", () => {
    process.env.VLMRUN_GATEWAY_BASE_URL = "https://new.gateway.dev/v1";
    process.env.VLMRUN_GATEWAY_URL = "https://old.gateway.dev/v1";
    expect(gatewayBaseUrl()).toBe("https://new.gateway.dev/v1");
  });
});
