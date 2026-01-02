import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const MODELS_TO_TEST = [
  "gemini-1.5-pro",
  "gemini-1.5-flash-latest",
  "gemini-2.0-flash",
];

async function testModel(modelName) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent("Say OK");
    console.log(`✅ WORKS: ${modelName}`);
  } catch (err) {
    console.log(`❌ FAILS: ${modelName}`);
    console.log(`   Reason: ${err.message.split("\n")[0]}`);
  }
}

(async () => {
  for (const model of MODELS_TO_TEST) {
    await testModel(model);
  }
})();
