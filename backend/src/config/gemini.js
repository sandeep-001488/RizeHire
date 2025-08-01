import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const model = genAI ? genAI.getGenerativeModel({ model: "gemini-pro" }) : null;

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
    console.log("🚀 Generating content with Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini response received:", text.substring(0, 100) + "...");
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
