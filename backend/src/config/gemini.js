import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Gemini model name from environment variable
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const model = genAI
  ? genAI.getGenerativeModel({ model: GEMINI_MODEL })
  : null;

const generateContent = async (prompt) => {
  if (!genAI) {
    throw new Error(
      "Gemini API key not configured. Please set GEMINI_API_KEY in environment variables."
    );
  }

  if (!model) {
    throw new Error("Failed to initialize Gemini model");
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
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
};

export { generateContent };
