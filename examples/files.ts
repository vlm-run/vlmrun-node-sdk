import { VlmRun } from "../src";

const client = new VlmRun({
  apiKey: "your-api-key", // Replace with your actual API key
});

async function fileOperations() {
  try {
    console.log("Listing files...");
    const files = await client.files.list({ limit: 10 });
    console.log(`Found ${files.length} files`);

    console.log("Uploading a file...");
    const uploadResult = await client.files.upload({
      filePath: "path/to/your/document.pdf", // Replace with actual file path
      purpose: "assistants",
      checkDuplicate: true,
    });
    
    console.log(`File uploaded successfully:`);
    console.log(`- ID: ${uploadResult.id}`);
    console.log(`- Filename: ${uploadResult.filename}`);
    console.log(`- Size: ${uploadResult.bytes} bytes`);

    console.log("Getting file details...");
    const fileDetails = await client.files.get(uploadResult.id);
    console.log(`File details: ${JSON.stringify(fileDetails, null, 2)}`);

    console.log("Checking for cached file...");
    const cachedFile = await client.files.getCachedFile("path/to/your/document.pdf");
    if (cachedFile) {
      console.log(`Cached file found: ${cachedFile.id}`);
    } else {
      console.log("No cached file found");
    }

    return uploadResult;
  } catch (error) {
    console.error("Error with file operations:", error);
    throw error;
  }
}

fileOperations();
