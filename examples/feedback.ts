import { VlmRun } from "../src";

const client = new VlmRun({
  apiKey: "your-api-key", // Replace with your actual API key
});

async function submitFeedback() {
  try {
    console.log("Making a prediction...");
    const imageUrl = "https://storage.googleapis.com/vlm-data-public-prod/hub/examples/document.invoice/invoice_1.jpg";
    
    const prediction = await client.image.generate({
      images: [imageUrl],
      model: "vlm-1",
      domain: "document.invoice",
    });
    
    console.log(`Prediction completed with ID: ${prediction.id}`);

    console.log("Submitting positive feedback...");
    const positiveFeedback = await client.feedback.submit(
      prediction.id,
      { corrected_total: 1250.00 },
      "The extraction was accurate and complete!"
    );
    
    console.log("Positive feedback submitted:", positiveFeedback);

    console.log("Submitting negative feedback with corrections...");
    const negativeFeedback = await client.feedback.submit(
      prediction.id,
      { total_amount: 1250.00 },
      "The total amount was incorrect"
    );
    
    console.log("Negative feedback submitted:", negativeFeedback);

    return { positiveFeedback, negativeFeedback };
  } catch (error) {
    console.error("Error submitting feedback:", error);
    throw error;
  }
}

submitFeedback();
