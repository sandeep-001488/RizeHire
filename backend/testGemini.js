import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function generateContent(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("❌ Gemini API Error:", error);

    if (error.message.includes("API key")) {
      throw new Error("Invalid Gemini API key");
    } else if (error.message.includes("quota")) {
      throw new Error("Gemini API quota exceeded");
    } else if (error.message.includes("blocked")) {
      throw new Error("Content was blocked by Gemini safety filters");
    } else {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }
}

async function testGemini() {
  try {
    const prompt =
      "Write a short paragraph about the benefits of AI in education.";
    const response = await generateContent(prompt);

    console.log("\n✅ Gemini API responded successfully:\n");
    console.log(response);
  } catch (error) {
    console.error("\n❌ Error testing Gemini API:\n", error.message);
  }
}

testGemini();
