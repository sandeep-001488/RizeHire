import fs from "fs";
import pdfParse from "pdf-parse-fork";
import mammoth from "mammoth";

export default async function extractTextFromResume(filePath) {
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const buff = fs.readFileSync(filePath);
    const parsed = await pdfParse(buff);
    return parsed.text || "";
  }

  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value || "";
  }

  return fs.readFileSync(filePath, "utf8");
}
