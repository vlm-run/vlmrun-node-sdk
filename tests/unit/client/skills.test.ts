import { Client } from "../../../src/client/base_requestor";
import { Skills } from "../../../src/client/skills";
import { SkillInfo, SkillDownloadResponse } from "../../../src/client/types";

jest.mock("../../../src/client/base_requestor");

describe("Skills", () => {
  let client: jest.Mocked<Client>;
  let skills: Skills;

  beforeEach(() => {
    client = {
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    } as jest.Mocked<Client>;

    skills = new Skills(client);
  });

  describe("list", () => {
    it("should list all skills", async () => {
      const mockResponse: SkillInfo[] = [
        {
          id: "skill_001",
          name: "invoice-parser",
          description: "Extracts invoice fields",
          version: "1.0",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          status: "completed",
        },
        {
          id: "skill_002",
          name: "receipt-reader",
          version: "2.0",
          created_at: "2024-02-01T00:00:00Z",
          updated_at: "2024-02-01T00:00:00Z",
        },
      ];

      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockResponse, 200, {}]);

      const result = await skills.list();

      expect(result).toEqual(mockResponse);
      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "skills",
        undefined
      );
    });

    it("should return empty array when no skills exist", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([[], 200, {}]);

      const result = await skills.list();

      expect(result).toEqual([]);
    });

    it("should throw TypeError for non-array response", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([{ not: "an-array" }, 200, {}]);

      await expect(skills.list()).rejects.toThrow("Expected array response");
    });
  });

  describe("get", () => {
    const mockSkill: SkillInfo = {
      id: "skill_001",
      name: "invoice-parser",
      description: "Extracts invoice fields",
      version: "1.0",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      status: "completed",
    };

    it("should get a skill by id", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockSkill, 200, {}]);

      const result = await skills.get({ id: "skill_001" });

      expect(result).toEqual(mockSkill);
      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "skills/skill_001"
      );
    });

    it("should lookup a skill by name", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockSkill, 200, {}]);

      const result = await skills.get({ name: "invoice-parser" });

      expect(result).toEqual(mockSkill);
      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/lookup",
        undefined,
        { name: "invoice-parser" }
      );
    });

    it("should lookup a skill by name and version", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockSkill, 200, {}]);

      const result = await skills.get({
        name: "invoice-parser",
        version: "1.0",
      });

      expect(result).toEqual(mockSkill);
      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/lookup",
        undefined,
        { name: "invoice-parser", skill_version: "1.0" }
      );
    });

    it("should prefer name over id when both are provided", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockSkill, 200, {}]);

      const result = await skills.get({
        name: "invoice-parser",
        id: "skill_001",
      });

      expect(result).toEqual(mockSkill);
      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/lookup",
        undefined,
        { name: "invoice-parser" }
      );
    });

    it("should throw error when neither name nor id is provided", async () => {
      await expect(skills.get({})).rejects.toThrow(
        "Either `name` or `id` must be provided."
      );
    });

    it("should throw TypeError for non-object response via id lookup", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue(["not-an-object", 200, {}]);

      await expect(skills.get({ id: "skill_001" })).rejects.toThrow(
        "Expected object response"
      );
    });

    it("should throw TypeError for non-object response via name lookup", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue(["not-an-object", 200, {}]);

      await expect(skills.get({ name: "invoice-parser" })).rejects.toThrow(
        "Expected object response"
      );
    });
  });

  describe("create", () => {
    const mockCreated: SkillInfo = {
      id: "skill_new",
      name: "new-skill",
      description: "A freshly created skill",
      created_at: "2024-03-01T00:00:00Z",
      updated_at: "2024-03-01T00:00:00Z",
      status: "completed",
    };

    it("should create a skill from a prompt", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockCreated, 200, {}]);

      const result = await skills.create({
        prompt: "Extract invoice line items",
        name: "new-skill",
        description: "A freshly created skill",
      });

      expect(result).toEqual(mockCreated);
      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/create",
        undefined,
        {
          prompt: "Extract invoice line items",
          name: "new-skill",
          description: "A freshly created skill",
        }
      );
    });

    it("should create a skill with a JSON schema", async () => {
      const schema = { type: "object", properties: { total: { type: "number" } } };

      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockCreated, 200, {}]);

      const result = await skills.create({
        prompt: "Extract totals",
        jsonSchema: schema,
      });

      expect(result).toEqual(mockCreated);
      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/create",
        undefined,
        {
          prompt: "Extract totals",
          json_schema: schema,
        }
      );
    });

    it("should create a skill from a session", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockCreated, 200, {}]);

      await skills.create({ sessionId: "session_abc" });

      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/create",
        undefined,
        { session_id: "session_abc" }
      );
    });

    it("should create a skill from a file", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockCreated, 200, {}]);

      await skills.create({ fileId: "file_xyz" });

      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/create",
        undefined,
        { file_id: "file_xyz" }
      );
    });

    it("should only include defined parameters in the request body", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockCreated, 200, {}]);

      await skills.create({ prompt: "Do stuff" });

      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/create",
        undefined,
        { prompt: "Do stuff" }
      );
    });

    it("should throw TypeError for non-object response", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue(["not-an-object", 200, {}]);

      await expect(
        skills.create({ prompt: "test" })
      ).rejects.toThrow("Expected object response");
    });
  });

  describe("update", () => {
    const mockUpdated: SkillInfo = {
      id: "skill_001",
      name: "invoice-parser",
      description: "Updated description",
      version: "2.0",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-04-01T00:00:00Z",
      status: "completed",
    };

    it("should update a skill with a new file", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockUpdated, 200, {}]);

      const result = await skills.update({
        skillId: "skill_001",
        fileId: "file_new",
      });

      expect(result).toEqual(mockUpdated);
      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/skill_001/update",
        undefined,
        { file_id: "file_new" }
      );
    });

    it("should update a skill with a new description", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockUpdated, 200, {}]);

      const result = await skills.update({
        skillId: "skill_001",
        description: "Updated description",
      });

      expect(result).toEqual(mockUpdated);
      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/skill_001/update",
        undefined,
        { description: "Updated description" }
      );
    });

    it("should update a skill with both fileId and description", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockUpdated, 200, {}]);

      await skills.update({
        skillId: "skill_001",
        fileId: "file_new",
        description: "Updated description",
      });

      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/skill_001/update",
        undefined,
        { file_id: "file_new", description: "Updated description" }
      );
    });

    it("should send empty body when only skillId is provided", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockUpdated, 200, {}]);

      await skills.update({ skillId: "skill_001" });

      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "POST",
        "skills/skill_001/update",
        undefined,
        {}
      );
    });

    it("should throw TypeError for non-object response", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue(["not-an-object", 200, {}]);

      await expect(
        skills.update({ skillId: "skill_001" })
      ).rejects.toThrow("Expected object response");
    });
  });

  describe("download", () => {
    it("should return a download URL for a skill", async () => {
      const mockResponse: SkillDownloadResponse = {
        download_url: "https://storage.example.com/skills/skill_001.zip?token=abc",
        expires_in: 3600,
      };

      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue([mockResponse, 200, {}]);

      const result = await skills.download({ skillId: "skill_001" });

      expect(result).toEqual(mockResponse);
      expect(skills["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "skills/skill_001/download"
      );
    });

    it("should throw TypeError for non-object response", async () => {
      jest
        .spyOn(skills["requestor"], "request")
        .mockResolvedValue(["not-an-object", 200, {}]);

      await expect(
        skills.download({ skillId: "skill_001" })
      ).rejects.toThrow("Expected object response");
    });
  });
});
