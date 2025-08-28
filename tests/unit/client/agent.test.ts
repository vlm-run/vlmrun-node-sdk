import { Client } from "../../../src/client/base_requestor";
import { Agent } from "../../../src/client/agent";
import { PredictionResponse, AgentInfo } from "../../../src/client/types";

jest.mock("../../../src/client/base_requestor");

describe("Agent", () => {
  let client: jest.Mocked<Client>;
  let agent: Agent;

  beforeEach(() => {
    client = {
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    } as jest.Mocked<Client>;

    agent = new Agent(client);
  });

  describe("get", () => {
    it("should get agent by name", async () => {
      const mockResponse: AgentInfo = {
        id: "agent_123",
        name: "test-agent",
        description: "Test agent for unit tests",
        prompt: "Test prompt",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "completed",
      };

      jest
        .spyOn(agent["requestor"], "request")
        .mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.get({
        name: "test-agent",
      });

      expect(result).toEqual(mockResponse);
      expect(agent["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "agent/lookup",
        undefined,
        { name: "test-agent" }
      );
    });

    it("should get agent by id", async () => {
      const mockResponse: AgentInfo = {
        id: "agent_123",
        name: "test-agent",
        description: "Test agent for unit tests",
        prompt: "Test prompt",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "completed",
      };

      jest
        .spyOn(agent["requestor"], "request")
        .mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.get({
        id: "agent_123",
      });

      expect(result).toEqual(mockResponse);
      expect(agent["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "agent/lookup",
        undefined,
        { id: "agent_123" }
      );
    });

    it("should get agent by prompt", async () => {
      const mockResponse: AgentInfo = {
        id: "agent_123",
        name: "test-agent",
        description: "Test agent for unit tests",
        prompt: "Test prompt",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "completed",
      };

      jest
        .spyOn(agent["requestor"], "request")
        .mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.get({
        prompt: "Test prompt",
      });

      expect(result).toEqual(mockResponse);
      expect(agent["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "agent/lookup",
        undefined,
        { prompt: "Test prompt" }
      );
    });

    it("should throw error when multiple parameters are provided", async () => {
      await expect(agent.get({ name: "test-agent", id: "agent_123" })).rejects.toThrow(
        "Only one of `id` or `name` or `prompt` can be provided"
      );

      await expect(agent.get({ name: "test-agent", prompt: "Test prompt" })).rejects.toThrow(
        "Only one of `id` or `name` or `prompt` can be provided"
      );

      await expect(agent.get({ id: "agent_123", prompt: "Test prompt" })).rejects.toThrow(
        "Only one of `id` or `name` or `prompt` can be provided"
      );
    });

    it("should throw error when no parameters are provided", async () => {
      await expect(agent.get({})).rejects.toThrow(
        "Either `id` or `name` or `prompt` must be provided"
      );
    });

    it("should throw error for non-object response", async () => {
      jest
        .spyOn(agent["requestor"], "request")
        .mockResolvedValue(["not-an-object", 200, {}]);

      await expect(agent.get({ name: "test-agent" })).rejects.toThrow(
        "Expected object response"
      );
    });
  });

  describe("execute", () => {
    it("should execute agent with file IDs", async () => {
      const mockResponse: PredictionResponse = {
        id: "exec_123",
        status: "running",
        created_at: new Date().toISOString(),
      };

      jest
        .spyOn(agent["requestor"], "request")
        .mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.executeLegacy({
        name: "test-agent",
        version: "v1",
        fileIds: ["file_123", "file_456"],
        batch: true,
        config: {
          detail: "hi",
          confidence: true,
        },
        metadata: {
          environment: "dev",
          sessionId: "test-session",
        },
        callbackUrl: "https://webhook.example.com/callback",
      });

      expect(result).toEqual(mockResponse);
      expect(agent["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "agent/execute",
        undefined,
        {
          name: "test-agent",
          version: "v1",
          batch: true,
          file_ids: ["file_123", "file_456"],
          config: {
            detail: "hi",
            confidence: true,
          },
          metadata: {
            environment: "dev",
            sessionId: "test-session",
          },
          callback_url: "https://webhook.example.com/callback",
        }
      );
    });

    it("should execute agent with URLs", async () => {
      const mockResponse: PredictionResponse = {
        id: "exec_456",
        status: "running",
        created_at: new Date().toISOString(),
      };

      jest
        .spyOn(agent["requestor"], "request")
        .mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.executeLegacy({
        name: "test-agent",
        urls: ["https://example.com/test.pdf"],
      });

      expect(result).toEqual(mockResponse);
      expect(agent["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "agent/execute",
        undefined,
        {
          name: "test-agent",
          version: "latest",
          batch: true,
          urls: ["https://example.com/test.pdf"],
        }
      );
    });

    it("should throw error if neither fileIds nor urls are provided", async () => {
      await expect(
        agent.executeLegacy({
          name: "test-agent",
        })
      ).rejects.toThrow("Either `fileIds` or `urls` must be provided");
    });

    it("should throw error if both fileIds and urls are provided", async () => {
      await expect(
        agent.executeLegacy({
          name: "test-agent",
          fileIds: ["file_123"],
          urls: ["https://example.com/test.pdf"],
        })
      ).rejects.toThrow("Only one of `fileIds` or `urls` can be provided");
    });

    it("should throw error for non-object response", async () => {
      jest
        .spyOn(agent["requestor"], "request")
        .mockResolvedValue(["not-an-object", 200, {}]);

      await expect(
        agent.executeLegacy({
          name: "test-agent",
          fileIds: ["file_123"],
        })
      ).rejects.toThrow("Expected object response");
    });
  });

  describe("create", () => {
    it("should create an agent successfully", async () => {
      const mockResponse = {
        id: "agent_123",
        name: "test-agent",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        status: "completed",
      };

      jest
        .spyOn(agent["requestor"], "request")
        .mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.create({
        config: {
          prompt: "Test prompt",
        },
        name: "test-agent",
      });

      expect(result).toEqual(mockResponse);
      expect(agent["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "agent/create",
        undefined,
        {
          name: "test-agent",
          inputs: undefined,
          config: {
            prompt: "Test prompt",
            json_schema: undefined,
          },
        }
      );
    });

    it("should throw error when prompt is missing", async () => {
      await expect(
        agent.create({
          config: {},
          name: "test-agent",
        })
      ).rejects.toThrow(
        "Prompt is not provided as a request parameter, please provide a prompt"
      );
    });
  });

  describe("execute (new method)", () => {
    it("should execute an agent successfully", async () => {
      const mockResponse = {
        id: "execution_123",
        name: "test-agent",
        created_at: "2023-01-01T00:00:00Z",
        completed_at: "2023-01-01T00:00:01Z",
        response: { result: "success" },
        status: "completed",
        usage: { credits_used: 10 },
      };

      jest
        .spyOn(agent["requestor"], "request")
        .mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.execute({
        name: "test-agent",
        inputs: { test: "data" },
        config: {
          prompt: "Test prompt",
        },
      });

      expect(result).toEqual(mockResponse);
      expect(agent["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "agent/execute",
        undefined,
        {
          name: "test-agent",
          batch: true,
          inputs: { test: "data" },
          config: {
            prompt: "Test prompt",
            json_schema: undefined,
          },
        }
      );
    });

    it("should throw error when batch is false", async () => {
      await expect(
        agent.execute({
          name: "test-agent",
          batch: false,
        })
      ).rejects.toThrow("Batch mode is required for agent execution");
    });
  });

  describe("list", () => {
    it("should list agents successfully", async () => {
      const mockResponse = [
        {
          id: "agent_123",
          name: "test-agent",
          description: "Test agent",
          prompt: "Test prompt",
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          status: "completed",
        },
      ];

      jest
        .spyOn(agent["requestor"], "request")
        .mockResolvedValue([mockResponse, 200, {}]);

      const result = await agent.list();

      expect(result).toEqual(mockResponse);
      expect(agent["requestor"].request).toHaveBeenCalledWith("GET", "agent");
    });
  });
});
