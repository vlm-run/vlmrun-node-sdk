import { VlmRun, forestry, noul, choice, score } from "../src";

const client = new VlmRun({
  apiKey: "your-api-key",
});

const ticket = forestry("support-ticket", {
  urgent: noul("Is this time-sensitive?"),
  department: choice("Which team?", ["billing", "technical", "sales"]),
  severity: score("How severe?", ["minor", "normal", "major", "critical"]),
});

async function decideTicket() {
  const result = await client.gateway.systemone.decide({
    state: "Invoice #44 was charged twice, I need this fixed today",
    forestry: ticket,
  });

  console.log("urgent", result.nouls.urgent?.noul);
  console.log("department", result.choices.department?.choice);
  console.log("severity", result.scores.severity?.score);
  return result;
}

async function streamFrames() {
  const stream = await client.gateway.systemone.stream({
    questions: [{ id: "is_open", type: "noul" }],
    state: "Is the door open?",
    transport: "http",
    concurrency: 4,
  });

  try {
    for await (const decision of stream.map([
      "frame-1.jpg",
      "frame-2.jpg",
      "frame-3.jpg",
    ])) {
      console.log(decision.index, decision.response.nouls.is_open?.noul);
    }
  } finally {
    await stream.close();
  }
}

decideTicket().catch((error) => {
  console.error("System One decide failed:", error);
  throw error;
});

export { decideTicket, streamFrames, ticket };
