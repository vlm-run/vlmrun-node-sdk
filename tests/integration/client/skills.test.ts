import { config } from "dotenv";
config({ path: ".env.test" });

import { VlmRun } from "../../../src/index";
import { SkillInfo, PredictionResponse } from "../../../src/client/types";

jest.setTimeout(60000);

const testVideoUrl =
  "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/video.transcription/nvidia_demo.mp4";

const testLongVideoUrl =
  "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/video.transcription/how_to_build_an_mvp.mp4";

const testVideoExtractionSkillName =
  process.env.TEST_VIDEO_EXTRACTION_SKILL_NAME ?? "";

const INVOICE_SKILL_PROMPT =
  "Extract key information from invoices provided as documents or images, " +
  "including invoice number, date, vendor name, customer name, line items " +
  "with descriptions/quantities/unit prices/totals, subtotal, tax, and total amount.";

const INVOICE_SCHEMA = {
  type: "object",
  properties: {
    invoice_number: {
      type: "string",
      description: "Unique invoice identifier",
    },
    date: {
      type: "string",
      format: "date",
      description: "Invoice date in YYYY-MM-DD format",
    },
    vendor: { type: "string", description: "Name of the vendor or seller" },
    customer: { type: "string", description: "Name of the customer or buyer" },
    line_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit_price: { type: "number" },
          total: { type: "number" },
        },
        required: ["description", "quantity", "unit_price", "total"],
      },
    },
    subtotal: { type: "number" },
    tax: { type: "number" },
    total: { type: "number" },
  },
  required: ["invoice_number", "date", "vendor", "line_items", "total"],
};

const MEDICAL_REPORT_PROMPT =
  "Extract structured clinical and demographic information from medical reports " +
  "such as lab results, discharge summaries, or consultation notes. Identify " +
  "patient demographics, report metadata, diagnoses with ICD codes, medications, " +
  "allergies, vital signs, treatment plans, and follow-up instructions.";

const MEDICAL_REPORT_SCHEMA = {
  type: "object",
  properties: {
    patient_name: { type: "string", description: "Full name of the patient" },
    dob: {
      type: "string",
      format: "date",
      description: "Date of birth in YYYY-MM-DD format",
    },
    patient_id: {
      type: "string",
      description: "Medical record number or unique patient identifier",
    },
    gender: { type: "string", enum: ["Male", "Female", "Other", "Unknown"] },
    report_date: { type: "string", format: "date" },
    report_type: {
      type: "string",
      enum: [
        "Lab Result",
        "Discharge Summary",
        "Radiology Report",
        "Consultation Note",
        "Progress Note",
        "Operative Report",
        "Pathology Report",
        "Other",
      ],
    },
    provider_name: { type: "string" },
    facility: { type: "string" },
    chief_complaint: { type: "string" },
    history_of_present_illness: { type: "string" },
    diagnosis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          icd_code: { type: "string" },
        },
        required: ["description"],
      },
    },
    medications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          dosage: { type: "string" },
          frequency: { type: "string" },
        },
        required: ["name", "dosage", "frequency"],
      },
    },
    allergies: { type: "array", items: { type: "string" } },
    vitals: {
      type: "object",
      properties: {
        blood_pressure: { type: "string" },
        heart_rate: { type: "string" },
        temperature: { type: "string" },
        weight: { type: "string" },
      },
    },
    treatment_plan: { type: "string" },
    follow_up_instructions: { type: "string" },
  },
  required: [
    "patient_name",
    "dob",
    "patient_id",
    "report_date",
    "report_type",
    "diagnosis",
  ],
};

describe("Integration: Skills", () => {
  let client: VlmRun;

  beforeAll(() => {
    client = new VlmRun({
      apiKey: process.env.TEST_API_KEY ?? "",
      baseURL: process.env.TEST_BASE_URL,
    });
  });

  describe("list()", () => {
    it("should successfully fetch skills list", async () => {
      const result = await client.skills.list();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should return skills with expected properties", async () => {
      const result = await client.skills.list();

      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const skill: SkillInfo = result[0];
        expect(skill).toHaveProperty("id");
        expect(skill).toHaveProperty("name");
        expect(typeof skill.id).toBe("string");
        expect(typeof skill.name).toBe("string");
      }
    });

    it("should handle API errors with invalid credentials", async () => {
      const clientWithInvalidKey = new VlmRun({
        apiKey: "invalid-api-key",
        baseURL: process.env.TEST_BASE_URL,
      });

      await expect(clientWithInvalidKey.skills.list()).rejects.toThrow();
    });
  });

  describe("get()", () => {
    it("should get a skill by name", async () => {
      const skills = await client.skills.list();
      if (skills.length === 0) {
        console.warn("No skills available, skipping get-by-name test");
        return;
      }

      const target = skills[0];
      const result = await client.skills.get({ name: target.name });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result.name).toBe(target.name);
    });

    it("should get a skill by id", async () => {
      const skills = await client.skills.list();
      if (skills.length === 0) {
        console.warn("No skills available, skipping get-by-id test");
        return;
      }

      const target = skills[0];
      const result = await client.skills.get({ id: target.id });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result.id).toBe(target.id);
    });

    it("should get a skill by name and version", async () => {
      const skills = await client.skills.list();
      if (skills.length === 0) {
        console.warn(
          "No skills available, skipping get-by-name-and-version test",
        );
        return;
      }

      const target = skills.find((s) => s.version) ?? skills[0];
      const params: { name: string; version?: string } = {
        name: target.name,
      };
      if (target.version) {
        params.version = target.version;
      }

      const result = await client.skills.get(params);

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result.name).toBe(target.name);
    });

    it("should throw error when neither name nor id is provided", async () => {
      await expect(client.skills.get({})).rejects.toThrow(
        "Either `name` or `id` must be provided.",
      );
    });
  });

  describe("create() — invoice data extractor", () => {
    it("should create an invoice extraction skill from a prompt", async () => {
      const result = await client.skills.create({
        prompt: INVOICE_SKILL_PROMPT,
        name: `invoice-data-extractor-${Date.now()}`,
        description:
          "Extracts key information from invoices provided as documents or images.",
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(typeof result.id).toBe("string");
      expect(result.name).toContain("invoice-data-extractor");
    });

    it("should create an invoice extraction skill with a JSON schema", async () => {
      const result = await client.skills.create({
        prompt: INVOICE_SKILL_PROMPT,
        jsonSchema: INVOICE_SCHEMA,
        name: `invoice-data-extractor-schema-${Date.now()}`,
        description:
          "Extracts structured invoice data including line items, totals, and vendor info.",
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result.name).toContain("invoice-data-extractor-schema");
    });
  });

  describe("create() — medical report extraction", () => {
    it("should create a medical report extraction skill from a prompt", async () => {
      const result = await client.skills.create({
        prompt: MEDICAL_REPORT_PROMPT,
        name: `medical-report-extraction-${Date.now()}`,
        description:
          "Extracts structured clinical and demographic information from medical reports.",
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(typeof result.id).toBe("string");
      expect(result.name).toContain("medical-report-extraction");
    });

    it("should create a medical report extraction skill with a JSON schema", async () => {
      const result = await client.skills.create({
        prompt: MEDICAL_REPORT_PROMPT,
        jsonSchema: MEDICAL_REPORT_SCHEMA,
        name: `medical-report-extraction-schema-${Date.now()}`,
        description:
          "Extracts patient demographics, diagnoses, medications, vitals, and treatment plans from medical documents.",
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result.name).toContain("medical-report-extraction-schema");
    });
  });

  describe("create() and get() round-trip — invoice skill", () => {
    it("should create an invoice skill and retrieve it by id", async () => {
      const created = await client.skills.create({
        prompt: INVOICE_SKILL_PROMPT,
        jsonSchema: INVOICE_SCHEMA,
        name: `invoice-roundtrip-${Date.now()}`,
        description: "Invoice extractor created for round-trip verification.",
      });

      expect(created).toBeTruthy();
      expect(created.id).toBeDefined();

      const fetched = await client.skills.get({ id: created.id });

      expect(fetched).toBeTruthy();
      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe(created.name);
    });

    it("should create a medical report skill and retrieve it by name", async () => {
      const skillName = `medical-roundtrip-${Date.now()}`;

      const created = await client.skills.create({
        prompt: MEDICAL_REPORT_PROMPT,
        jsonSchema: MEDICAL_REPORT_SCHEMA,
        name: skillName,
        description:
          "Medical report extractor created for round-trip verification.",
      });

      expect(created).toBeTruthy();
      expect(created.id).toBeDefined();
      const updatedSkillName = created.name;

      const fetched = await client.skills.get({ name: updatedSkillName });

      expect(fetched).toBeTruthy();
      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe(updatedSkillName);
    });
  });

  describe.skip("update() — invoice skill", () => {
    it("should update an invoice skill description", async () => {
      const created = await client.skills.create({
        prompt: INVOICE_SKILL_PROMPT,
        name: `invoice-update-${Date.now()}`,
        description: "Initial invoice extractor description.",
      });

      expect(created.id).toBeDefined();

      const updated = await client.skills.update({
        skillId: created.id,
        description:
          "Updated: Extracts invoice number, date, vendor, line items, subtotal, tax, and total.",
      });

      expect(updated).toBeTruthy();
      expect(updated).toHaveProperty("id");
      expect(updated).toHaveProperty("name");
    });
  });

  describe("download()", () => {
    it("should return a download URL for an existing skill", async () => {
      const skills = await client.skills.list();
      if (skills.length === 0) {
        console.warn("No skills available, skipping download test");
        return;
      }

      const target = skills[0];
      const result = await client.skills.download({ skillId: target.id });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("download_url");
      expect(typeof result.download_url).toBe("string");
      expect(result.download_url.length).toBeGreaterThan(0);
    });
  });

  describe("create() and document.generate() — skill-driven extraction", () => {
    const testFilePath = "tests/integration/assets/google_invoice.pdf";

    it("should create a skill and use it for batch document generation via file_id", async () => {
      const skill = await client.skills.create({
        prompt: INVOICE_SKILL_PROMPT,
        jsonSchema: INVOICE_SCHEMA,
        name: `invoice-doc-generate-${Date.now()}`,
        description: "Invoice skill for document generation integration test.",
      });

      expect(skill).toBeTruthy();
      expect(skill.id).toBeDefined();
      expect(skill.name).toBeDefined();

      const uploadedFile = await client.files.upload({
        filePath: testFilePath,
        purpose: "vision",
        checkDuplicate: true,
      });

      expect(uploadedFile).toHaveProperty("id");

      const result: PredictionResponse = await client.document.generate({
        fileId: uploadedFile.id,
        model: "vlm-1",
        domain: "document.invoice",
        batch: true,
        config: {
          skills: [
            {
              skill_name: skill.name,
              version: skill.version,
            },
          ],
        } as any,
        metadata: {
          environment: "dev",
          allowTraining: false,
        },
      });

      expect(result).toHaveProperty("id");
      expect(typeof result.id).toBe("string");
      expect(result).toHaveProperty("created_at");
      expect(typeof result.created_at).toBe("string");
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("pending");

      const completed: PredictionResponse = await client.predictions.wait(
        result.id,
      );

      expect(completed.status).toBe("completed");
      expect(completed).toHaveProperty("response");
      expect(completed.response).toBeTruthy();
      expect(completed).toHaveProperty("completed_at");
    });
  });

  describe("execute()", () => {
    it("should execute agent with serviceTier=flex", async () => {
      const result = await client.agent.execute({
        inputs: {
          video: {
            type: "video_url",
            video_url: { url: testLongVideoUrl },
          },
        },
        config: {
          serviceTier: "flex",
          skills: [
            {
              skillName: testVideoExtractionSkillName,
              skillVersion: "latest",
            },
          ],
        },
      });

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("status");
    });
  });
});
