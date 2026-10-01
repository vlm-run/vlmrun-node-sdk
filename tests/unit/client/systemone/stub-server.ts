import { createHash } from "crypto";
import { WebSocketServer, type WebSocket } from "ws";

const MODEL = "google/diffusiongemma-26b-a4b-it";

export function answerFor(
  message: Record<string, unknown> | undefined,
  base = 0.5
): number {
  if (!message) {
    return base;
  }
  const content =
    (message.content as Array<{ image_url?: { url?: string } }>) ?? [];
  const url = content[0]?.image_url?.url;
  if (!url) {
    return base;
  }
  const digest = createHash("sha1").update(url).digest();
  return Number((base + (digest.readUInt32BE(0) % 100_000) / 1_000_000).toFixed(6));
}

export class StubServer {
  readonly received: Record<string, unknown>[] = [];
  replyOrder: unknown[] = [];
  granted = 2;
  peakInflight = 0;
  port = 0;
  private live = 0;
  private server: WebSocketServer | null = null;

  constructor(
    private readonly options: {
      maxInflight?: number;
      reverse?: boolean;
      failOn?: number;
      failId?: string;
      refuse?: string;
      noul?: number;
    } = {}
  ) {}

  get maxInflight(): number {
    return this.options.maxInflight ?? 2;
  }

  async start(): Promise<this> {
    this.server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await new Promise<void>((resolve) => this.server?.once("listening", resolve));
    const address = this.server.address();
    if (typeof address === "object" && address) {
      this.port = address.port;
    }
    this.server.on("connection", (socket) => {
      void this.handle(socket);
    });
    return this;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.server?.close(() => resolve());
    });
    this.server = null;
  }

  get openSockets(): number {
    return this.server?.clients.size ?? 0;
  }

  get decides(): Record<string, unknown>[] {
    return this.received.filter((message) => message.type === "decide");
  }

  get states(): Record<string, unknown>[] {
    return this.received.filter((message) => message.type === "state");
  }

  get creates(): Record<string, unknown>[] {
    return this.received.filter((message) => message.type === "session.create");
  }

  private async handle(socket: WebSocket): Promise<void> {
    let held: Array<[unknown, Record<string, unknown>]> = [];
    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw)) as Record<string, unknown>;
      this.received.push(message);
      const kind = message.type;
      if (kind === "session.create" && this.options.refuse) {
        socket.send(
          JSON.stringify({ type: "error", message: this.options.refuse })
        );
        return;
      }
      if (kind === "session.create") {
        const asked = Number(message.max_inflight ?? this.maxInflight);
        this.granted = Math.min(asked, this.maxInflight);
        socket.send(
          JSON.stringify({
            type: "session.created",
            session_id: "stub",
            model: message.model ?? MODEL,
            questions: Object.keys((message.questions as object) ?? {}),
            max_inflight: this.granted,
            max_frame_bytes: 2_097_152,
            expires_in: 600,
          })
        );
        return;
      }
      if (kind === "decide") {
        this.live += 1;
        this.peakInflight = Math.max(this.peakInflight, this.live);
        if (
          this.options.failOn !== undefined &&
          held.length === this.options.failOn
        ) {
          socket.send(
            JSON.stringify({
              type: "error",
              error_type: "invalid_request_error",
              message: "stub refuses this read",
            })
          );
          this.live -= 1;
          return;
        }
        if (
          this.options.failId !== undefined &&
          String(message.id) === this.options.failId
        ) {
          socket.send(
            JSON.stringify({
              type: "error",
              id: message.id,
              message: "stub refuses this frame",
            })
          );
          this.live -= 1;
          return;
        }
        held.push([message.id, message]);
        const batched = Boolean(this.options.reverse);
        if (held.length >= (batched ? this.maxInflight : 1)) {
          const order = [...held];
          if (this.options.reverse) {
            order.reverse();
          }
          for (const [requestId, decide] of order) {
            this.replyOrder.push(requestId);
            socket.send(JSON.stringify(this.decision(requestId, decide)));
            this.live -= 1;
          }
          held = [];
        }
        return;
      }
      if (kind === "session.close") {
        socket.send(
          JSON.stringify({
            type: "session.stats",
            session_id: "stub",
            decisions: this.decides.length,
            reads: 1,
            cost: 0.0001,
          })
        );
        socket.close();
      }
    });
  }

  private decision(requestId: unknown, message: Record<string, unknown>) {
    return {
      type: "decision",
      frame: 0,
      id: requestId,
      answers: {
        a: { type: "noul", noul: answerFor(message, this.options.noul ?? 0.5) },
      },
      usage: { input_tokens: 10, output_tokens: 0 },
      latency_ms: 5,
    };
  }
}
