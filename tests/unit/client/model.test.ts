import { ModelInfoResponse } from "../../../src/client/types";
import { VlmRun } from "../../../src/index";

describe("Models", () => {
  let client: VlmRun;

  beforeEach(() => {
    client = new VlmRun({
      apiKey: "test-api-key",
      baseURL: "https://api.example.com",
    });
  });

  describe("list()", () => {
    it("should successfully fetch models list", async () => {
      // Mock response data
      const mockModels: ModelInfoResponse[] = [
        {
          model: "vlm-1",
          domain: "healthcare.patient-medical-history",
        },
        {
          model: "vlm-1",
          domain: "document.invoice",
        },
      ];

      // Mock the requestor.request method
      jest
        .spyOn(client.models["requestor"], "request")
        .mockResolvedValueOnce([mockModels, 200, {}]);

      // Make the API call
      const result = await client.models.list();

      // Verify the results
      expect(result).toEqual(mockModels);
      expect(client.models["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "models"
      );
      expect(client.models["requestor"].request).toHaveBeenCalledTimes(1);
    });

    it("should handle API errors", async () => {
      // Mock an API error
      const errorMessage = "API Error";
      jest
        .spyOn(client.models["requestor"], "request")
        .mockRejectedValueOnce(new Error(errorMessage));

      // Attempt the API call and expect it to throw
      await expect(client.models.list()).rejects.toThrow(errorMessage);
      expect(client.models["requestor"].request).toHaveBeenCalledWith(
        "GET",
        "models"
      );
      expect(client.models["requestor"].request).toHaveBeenCalledTimes(1);
    });
  });
});
