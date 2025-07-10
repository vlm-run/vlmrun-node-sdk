import { VlmRun } from "../src";
import { z } from "zod";

const client = new VlmRun({
  apiKey: "your-api-key", // Replace with your actual API key
});

async function imagePredictions() {
  try {
    console.log("Processing image with default schema...");
    const imageUrl = "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/invoice_1.jpg";
    
    const result1 = await client.image.generate({
      images: [imageUrl],
      model: "vlm-1",
      domain: "document.invoice",
    });
    
    console.log("Result:", JSON.stringify(result1.response, null, 2));

    console.log("Processing image with custom JSON schema...");
    const result2 = await client.image.generate({
      images: [imageUrl],
      domain: "document.invoice",
      config: {
        jsonSchema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            total_amount: { type: "number" },
          },
        },
      },
    });
    
    console.log("Custom schema result:", JSON.stringify(result2.response, null, 2));

    console.log("Processing image with Zod schema...");
    const schema = z.object({
      invoice_id: z.string(),
      total: z.number(),
      customer: z.string(),
    });

    const result3 = await client.image.generate({
      images: [imageUrl],
      domain: "document.invoice",
      config: {
        responseModel: schema,
      },
    });

    const typedResponse = result3.response as z.infer<typeof schema>;
    console.log("Zod schema result:", typedResponse);

    console.log("Processing local image file...");
    const result4 = await client.image.generate({
      images: ["path/to/your/image.jpg"], // Replace with actual file path
      model: "vlm-1",
      domain: "document.invoice",
    });
    
    console.log("Local file result:", JSON.stringify(result4.response, null, 2));

    return result1;
  } catch (error) {
    console.error("Error with predictions:", error);
    throw error;
  }
}

async function documentPredictions() {
  try {
    console.log("Processing document from URL...");
    const documentUrl = "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/google_invoice.pdf";
    
    const result = await client.document.generate({
      url: documentUrl,
      model: "vlm-1",
      domain: "document.invoice",
    });
    
    console.log("Document result:", JSON.stringify(result.response, null, 2));
    return result;
  } catch (error) {
    console.error("Error with document predictions:", error);
    throw error;
  }
}

async function runExamples() {
  await imagePredictions();
  await documentPredictions();
}

runExamples();
