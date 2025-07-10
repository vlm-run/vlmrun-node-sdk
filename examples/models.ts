import { VlmRun } from "../src";

const client = new VlmRun({
  apiKey: "your-api-key", // Replace with your actual API key
});

async function listModels() {
  try {
    const models = await client.models.list();
    
    console.log("Available models:");
    models.forEach((model) => {
      console.log(`- Model: ${model.model}, Domain: ${model.domain}`);
    });
    
    return models;
  } catch (error) {
    console.error("Error listing models:", error);
    throw error;
  }
}

listModels();
