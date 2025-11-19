import { VlmRun } from "../../../src/index";
import { Agent } from "../../../src/client/agent";

// Mock openai
jest.mock("openai", () => {
  return {
    OpenAI: jest.fn().mockImplementation((config) => {
      return {
        chat: {
          completions: {
            create: jest.fn(),
            _config: config, // expose config for testing
          },
        },
      };
    }),
  };
});

describe("Agent Completions", () => {
  const apiKey = "test-api-key";
  const baseURL = "https://agent.vlm.run/v1";

  let client: VlmRun;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new VlmRun({ apiKey, baseURL });
  });

  it("should initialize OpenAI client with correct config when accessing completions", () => {
    const completions = client.agent.completions;

    expect(completions).toBeDefined();

    // Access the mocked OpenAI constructor
    const OpenAI = require("openai").OpenAI;
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: apiKey,
      baseURL: "https://agent.vlm.run/v1/openai",
    });
  });

  it("should return the completions object from OpenAI client", () => {
    const completions = client.agent.completions;
    expect(completions.create).toBeDefined();
  });

  it("should reuse the same OpenAI client instance", () => {
    const c1 = client.agent.completions;
    const c2 = client.agent.completions;
    expect(c1).toBe(c2);

    const OpenAI = require("openai").OpenAI;
    expect(OpenAI).toHaveBeenCalledTimes(1); // Should only be called once per VLMRun client
  });
});
