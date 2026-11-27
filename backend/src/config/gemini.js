import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// gemini-2.0-flash(-exp) were retired by Google and now return 404; keep this on a current model.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const model = genAI
  ? genAI.getGenerativeModel({ model: GEMINI_MODEL })
  : null;

// Gemini regularly returns short-lived 503 "high demand" / 429 errors. Retry those
// a couple of times with backoff before letting callers fall back.
const RETRYABLE = /\b(503|429)\b|high demand|overloaded|rate limit|try again later/i;
export async function withRetry(fn, { attempts = 3, baseDelayMs = 800, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === attempts - 1 || !RETRYABLE.test(String(error?.message))) throw error;
      await sleep(baseDelayMs * 2 ** i);
    }
  }
  throw lastError;
}

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
    const text = await withRetry(async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });

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
